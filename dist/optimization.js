/****
 * Optimization module for accelerated beam tracing
 *
 * Implements the optimizations from:
 * Laine, S., Siltanen, S., Lokki, T., & Savioja, L. (2009).
 * "Accelerated beam tracing algorithm." Applied Acoustics, 70(1), 172-181.
 *
 * Key optimizations:
 * 1. Fail Line (2D Fail Plane): Caches geometric failure reasons for O(1) early rejection
 * 2. Skip Circle (2D Skip Sphere): Groups beams into buckets with spatial rejection regions
 *
 * Expected speedups:
 * - Fail Line alone: ~30-40×
 * - Fail Line + Skip Circle: ~50-100×
 */
import { lineFromPoints, signedDistanceToLine, isPointBehindLine, constructBeamBoundaryLines, findBeamViolation, flipLine, distance } from './geometry';
/**
 * Extended BeamNode with optimization fields
 */
class OptimizedBeamNode {
    constructor(id, parent, vs, windowP1, windowP2) {
        this.id = id;
        this.parent = parent;
        this.vs = vs;
        this.windowP1 = windowP1;
        this.windowP2 = windowP2;
        this.children = [];
    }
    clearFailLine() {
        this.failLine = undefined;
        this.failLineType = undefined;
    }
}
/**
 * Extended Beam with window tracking
 */
class OptimizedBeam {
    constructor(vs, p1, p2) {
        this.vs = vs;
        this.p1 = p1;
        this.p2 = p2;
    }
}
/** Returns true if p0 is in front of line defined by p1, p2 */
function inFrontOf(p0, p1, p2) {
    const n1 = [-(p2[1] - p1[1]), (p2[0] - p1[0])];
    return n1[0] * (p0[0] - p1[0]) + n1[1] * (p0[1] - p1[1]) > 0;
}
/** Mirrors point p0 along line defined by p1 and p2 */
function pointMirror(p0, p1, p2) {
    let n1 = [-(p2[1] - p1[1]), (p2[0] - p1[0])];
    const n1_len = Math.sqrt(n1[0] * n1[0] + n1[1] * n1[1]);
    if (n1_len === 0)
        return p0;
    n1 = [n1[0] / n1_len, n1[1] / n1_len];
    const dist = 2 * (n1[0] * (p0[0] - p1[0]) + n1[1] * (p0[1] - p1[1]));
    return [p0[0] - n1[0] * dist, p0[1] - n1[1] * dist];
}
function lineIntersection(x11, y11, x12, y12, x21, y21, x22, y22) {
    const denominator = ((y22 - y21) * (x12 - x11)) - ((x22 - x21) * (y12 - y11));
    if (denominator === 0)
        return null;
    const a_temp = y11 - y21;
    const b_temp = x11 - x21;
    const numerator1 = ((x22 - x21) * a_temp) - ((y22 - y21) * b_temp);
    const numerator2 = ((x12 - x11) * a_temp) - ((y12 - y11) * b_temp);
    const a = numerator1 / denominator;
    const b = numerator2 / denominator;
    const x = x11 + (a * (x12 - x11));
    const y = y11 + (a * (y12 - y11));
    const onRay1 = a > 0;
    const onLine1 = a > 0 && a < 1;
    const onRay2 = b > 0;
    const onLine2 = b > 0 && b < 1;
    return [x, y, onLine1, onLine2, onRay1, onRay2];
}
/** BSP tree node for spatial partitioning */
class BSPNode {
    constructor(id, p1, p2) {
        this.id = id;
        this.p1 = p1;
        this.p2 = p2;
        this.front = null;
        this.back = null;
    }
}
/** BSP tree for accelerated ray-wall intersection tests */
class BSPTree {
    constructor(walls) {
        const recursiveArray = [];
        for (let i = 0; i < walls.length; i++) {
            recursiveArray.push(new BSPNode(i, walls[i].p1, walls[i].p2));
        }
        this.mainNode = this.build(recursiveArray);
    }
    build(recursiveArray) {
        if (recursiveArray.length === 0)
            return null;
        while (recursiveArray.length > 1) {
            const node = recursiveArray.pop();
            const retval = this.divide(recursiveArray[0], node);
            if (retval === 1) {
                recursiveArray[0].front = this.insertNode(recursiveArray[0].front, new BSPNode(node.id, node.p1, node.p2));
            }
            else if (retval === -1) {
                recursiveArray[0].back = this.insertNode(recursiveArray[0].back, new BSPNode(node.id, node.p1, node.p2));
            }
            else {
                const splitResult = retval;
                recursiveArray[0].front = this.insertNode(recursiveArray[0].front, new BSPNode(node.id, splitResult[0].p1, splitResult[0].p2));
                recursiveArray[0].back = this.insertNode(recursiveArray[0].back, new BSPNode(node.id, splitResult[1].p1, splitResult[1].p2));
            }
        }
        if (recursiveArray[0].front) {
            recursiveArray[0].front = this.build(this.collectNodes(recursiveArray[0].front));
        }
        if (recursiveArray[0].back) {
            recursiveArray[0].back = this.build(this.collectNodes(recursiveArray[0].back));
        }
        return recursiveArray[0];
    }
    insertNode(existing, newNode) {
        if (!existing)
            return newNode;
        newNode.front = existing;
        return newNode;
    }
    collectNodes(node) {
        if (!node)
            return [];
        const nodes = [new BSPNode(node.id, node.p1, node.p2)];
        if (node.front)
            nodes.push(...this.collectNodes(node.front));
        if (node.back)
            nodes.push(...this.collectNodes(node.back));
        return nodes;
    }
    divide(w1, w2) {
        const w2_n = [
            inFrontOf(w2.p1, w1.p1, w1.p2),
            inFrontOf(w2.p2, w1.p1, w1.p2)
        ];
        if (w2_n[0] && w2_n[1])
            return 1;
        if (!w2_n[0] && !w2_n[1])
            return -1;
        const p3 = lineIntersection(w1.p1[0], w1.p1[1], w1.p2[0], w1.p2[1], w2.p1[0], w2.p1[1], w2.p2[0], w2.p2[1]);
        if (!p3)
            return w2_n[0] ? 1 : -1;
        const intersectionPoint = [p3[0], p3[1]];
        if (w2_n[0]) {
            return [
                { p1: w2.p1, p2: intersectionPoint },
                { p1: intersectionPoint, p2: w2.p2 }
            ];
        }
        else {
            return [
                { p1: intersectionPoint, p2: w2.p2 },
                { p1: w2.p1, p2: intersectionPoint }
            ];
        }
    }
}
/** Optimized Beam tree with window tracking */
class OptimizedBeamTree {
    constructor(source, walls, maxOrder) {
        this.mainNode = new OptimizedBeamNode(-1, null, source.p0);
        for (let i = 0; i < walls.length; i++) {
            const vs = pointMirror(source.p0, walls[i].p1, walls[i].p2);
            const beam = new OptimizedBeam(vs, walls[i].p1, walls[i].p2);
            const childNode = new OptimizedBeamNode(i, this.mainNode, vs, walls[i].p1, walls[i].p2);
            this.mainNode.children.push(childNode);
            this.buildBeam(beam, childNode, walls, 0, maxOrder);
        }
    }
    buildBeam(beam, node, walls, order, maxOrder) {
        if (order > maxOrder)
            return;
        // Make sure the source is mathematically behind the wall
        if (inFrontOf(beam.vs, beam.p1, beam.p2)) {
            const temp = beam.p2;
            beam.p2 = beam.p1;
            beam.p1 = temp;
        }
        for (let i = 0; i < walls.length; i++) {
            if (node.id === i)
                continue;
            let newLine;
            const p1_b = !inFrontOf(walls[i].p1, beam.p1, beam.p2);
            const p2_b = !inFrontOf(walls[i].p2, beam.p1, beam.p2);
            if (p1_b && p2_b)
                continue;
            const p1_a = !inFrontOf(walls[i].p1, beam.vs, beam.p2);
            const p2_a = !inFrontOf(walls[i].p2, beam.vs, beam.p2);
            if (p1_a && p2_a)
                continue;
            const p1_c = inFrontOf(walls[i].p1, beam.vs, beam.p1);
            const p2_c = inFrontOf(walls[i].p2, beam.vs, beam.p1);
            if (p1_c && p2_c)
                continue;
            const p1_in = !p1_a && !p1_b && !p1_c;
            const p2_in = !p2_a && !p2_b && !p2_c;
            let A = false;
            let B = false;
            let C = false;
            let int = null;
            if (p1_in && p2_in) {
                newLine = { p1: walls[i].p1, p2: walls[i].p2 };
            }
            else if (p1_in) {
                newLine = { p1: walls[i].p1, p2: [0, 0] };
                if (p2_a && !p2_b) {
                    A = true;
                }
                else if (p2_a && p2_b && p2_c) {
                    A = true;
                    B = true;
                    C = true;
                }
                else if (p2_a && p2_b) {
                    A = true;
                    B = true;
                }
                else if (!p2_a && p2_b && !p2_c) {
                    B = true;
                }
                else if (p2_c && p2_b) {
                    B = true;
                    C = true;
                }
                else if (p2_c && !p2_b) {
                    C = true;
                }
            }
            else if (p2_in) {
                newLine = { p1: walls[i].p2, p2: [0, 0] };
                if (p1_a && !p1_b) {
                    A = true;
                }
                else if (p1_a && p1_b && p1_c) {
                    A = true;
                    B = true;
                    C = true;
                }
                else if (p1_a && p1_b) {
                    A = true;
                    B = true;
                }
                else if (!p1_a && p1_b && !p1_c) {
                    B = true;
                }
                else if (p1_c && p1_b) {
                    B = true;
                    C = true;
                }
                else if (p1_c && !p1_b) {
                    C = true;
                }
            }
            else {
                if ((p1_a && p2_b) || (p2_a && p1_b)) {
                    const int_a = lineIntersection(beam.p2[0], beam.p2[1], beam.p2[0] + (beam.p2[0] - beam.vs[0]) * 2, beam.p2[1] + (beam.p2[1] - beam.vs[1]) * 2, walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
                    if (int_a && int_a[4]) {
                        const int_b = lineIntersection(beam.p1[0], beam.p1[1], beam.p2[0], beam.p2[1], walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
                        if (int_b) {
                            newLine = { p1: [int_a[0], int_a[1]], p2: [int_b[0], int_b[1]] };
                        }
                    }
                }
                else if ((p1_b && p2_c) || (p2_b && p1_c)) {
                    const int_b = lineIntersection(beam.p1[0], beam.p1[1], beam.p2[0], beam.p2[1], walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
                    if (int_b && int_b[4]) {
                        const int_c = lineIntersection(beam.p1[0], beam.p1[1], beam.p1[0] + (beam.p1[0] - beam.vs[0]) * 2, beam.p1[1] + (beam.p1[1] - beam.vs[1]) * 2, walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
                        if (int_c) {
                            newLine = { p1: [int_b[0], int_b[1]], p2: [int_c[0], int_c[1]] };
                        }
                    }
                }
                else if (((p1_a && p2_c) || (p2_a && p1_c)) && (!p1_b && !p2_b)) {
                    const int_a = lineIntersection(beam.p2[0], beam.p2[1], beam.p2[0] + (beam.p2[0] - beam.vs[0]) * 2, beam.p2[1] + (beam.p2[1] - beam.vs[1]) * 2, walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
                    const int_c = lineIntersection(beam.p1[0], beam.p1[1], beam.p1[0] + (beam.p1[0] - beam.vs[0]) * 2, beam.p1[1] + (beam.p1[1] - beam.vs[1]) * 2, walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
                    if (int_a && int_c) {
                        newLine = { p1: [int_a[0], int_a[1]], p2: [int_c[0], int_c[1]] };
                    }
                }
            }
            if (A && !B && !C) {
                int = lineIntersection(beam.vs[0], beam.vs[1], beam.p2[0], beam.p2[1], walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
            }
            else if (A && B && C) {
                int = lineIntersection(beam.p2[0], beam.p2[1], beam.p2[0] + (beam.p2[0] - beam.vs[0]), beam.p2[1] + (beam.p2[1] - beam.vs[1]), walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
                if (!int || !int[4]) {
                    int = lineIntersection(beam.p1[0], beam.p1[1], beam.p2[0], beam.p2[1], walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
                }
                if (!int || !int[4]) {
                    int = lineIntersection(beam.p1[0], beam.p1[1], beam.p1[0] + (beam.p1[0] - beam.vs[0]) * 2, beam.p1[1] + (beam.p1[1] - beam.vs[1]) * 2, walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
                }
            }
            else if (A && B) {
                int = lineIntersection(beam.p2[0], beam.p2[1], beam.p2[0] + (beam.p2[0] - beam.vs[0]), beam.p2[1] + (beam.p2[1] - beam.vs[1]), walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
                if (!int || !int[4]) {
                    int = lineIntersection(beam.p1[0], beam.p1[1], beam.p2[0], beam.p2[1], walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
                }
            }
            else if (!A && B && !C) {
                int = lineIntersection(beam.p1[0], beam.p1[1], beam.p2[0], beam.p2[1], walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
            }
            else if (B && C) {
                int = lineIntersection(beam.p1[0], beam.p1[1], beam.p2[0], beam.p2[1], walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
                if (!int || !int[4]) {
                    int = lineIntersection(beam.p1[0], beam.p1[1], beam.p1[0] + (beam.p1[0] - beam.vs[0]), beam.p1[1] + (beam.p1[1] - beam.vs[1]), walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
                }
            }
            else if (!A && !B && C) {
                int = lineIntersection(beam.vs[0], beam.vs[1], beam.p1[0], beam.p1[1], walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
            }
            if (int && newLine) {
                newLine.p2 = [int[0], int[1]];
            }
            if (newLine) {
                const newVs = pointMirror(beam.vs, walls[i].p1, walls[i].p2);
                const newBeam = new OptimizedBeam(newVs, newLine.p1, newLine.p2);
                const childNode = new OptimizedBeamNode(i, node, newVs, newLine.p1, newLine.p2);
                node.children.push(childNode);
                this.buildBeam(newBeam, childNode, walls, order + 1, maxOrder);
            }
        }
    }
}
/**
 * Detect fail line for a listener position against a beam node
 *
 * This is the key optimization from the paper:
 * - Type 1 (polygon): Listener is behind the reflecting wall's plane
 * - Type 2 (beam): Listener is outside the beam volume
 *
 * IMPORTANT: This should only be applied to test the LISTENER position
 * against the beam at a LEAF node. During path traversal from leaf to root,
 * intermediate points may be outside the beam and the path can still be valid
 * as long as the ray properly intersects the wall.
 */
function detectFailLineForListener(listenerPos, leafNode, _walls) {
    // We need to trace from the leaf node to the root, computing the
    // clipped beam boundaries at each level to determine if the listener
    // can possibly see this path.
    // For simplicity, we'll use the beam boundaries at the leaf level
    // This is a more conservative check but still provides speedup
    if (leafNode.windowP1 && leafNode.windowP2) {
        const imageSource = leafNode.vs;
        const wallP1 = leafNode.windowP1;
        const wallP2 = leafNode.windowP2;
        // Type 1: Check if listener is behind the wall plane
        let wallLine = lineFromPoints(wallP1, wallP2);
        if (signedDistanceToLine(imageSource, wallLine) < 0) {
            wallLine = flipLine(wallLine);
        }
        if (isPointBehindLine(listenerPos, wallLine)) {
            return { line: wallLine, type: 'polygon' };
        }
        // Type 2: Check beam boundaries
        const boundaries = constructBeamBoundaryLines(imageSource, wallP1, wallP2);
        const violation = findBeamViolation(listenerPos, boundaries);
        if (violation) {
            return violation;
        }
    }
    return null;
}
/**
 * Get the depth of a node in the beam tree
 */
function getNodeDepth(node) {
    let depth = 0;
    let current = node;
    while (current && current.id !== -1) {
        depth++;
        current = current.parent;
    }
    return depth;
}
/**
 * Collect all leaf nodes from a beam tree
 */
function collectLeafNodes(node, result) {
    if (node.children.length === 0 && node.id !== -1) {
        result.push(node);
    }
    for (const child of node.children) {
        collectLeafNodes(child, result);
    }
}
/**
 * Default bucket size (paper found 16 optimal for 3D)
 */
const DEFAULT_BUCKET_SIZE = 16;
/**
 * Create buckets from leaf nodes
 */
function createBuckets(beamTree, bucketSize = DEFAULT_BUCKET_SIZE) {
    const leafNodes = [];
    collectLeafNodes(beamTree.mainNode, leafNodes);
    const buckets = [];
    for (let i = 0; i < leafNodes.length; i += bucketSize) {
        buckets.push({
            id: buckets.length,
            nodes: leafNodes.slice(i, Math.min(i + bucketSize, leafNodes.length)),
            skipCircle: null
        });
    }
    return buckets;
}
/**
 * Check skip circle status for a bucket
 */
function checkSkipCircle(listenerPos, bucket) {
    if (!bucket.skipCircle) {
        return 'none';
    }
    const dist = distance(listenerPos, bucket.skipCircle.center);
    return dist < bucket.skipCircle.radius ? 'inside' : 'outside';
}
/**
 * Create a skip circle for a bucket where all paths failed with fail lines
 */
function createSkipCircle(listenerPos, nodes) {
    let minDist = Infinity;
    for (const node of nodes) {
        if (!node.failLine) {
            // If any node doesn't have a fail line, can't create skip circle
            return null;
        }
        const dist = Math.abs(signedDistanceToLine(listenerPos, node.failLine));
        minDist = Math.min(minDist, dist);
    }
    if (minDist === Infinity || minDist <= 0) {
        return null;
    }
    return {
        center: [listenerPos[0], listenerPos[1]],
        radius: minDist
    };
}
/**
 * Invalidate a bucket's skip circle
 */
function invalidateSkipCircle(bucket) {
    bucket.skipCircle = null;
}
/**
 * OptimizedSolver - Main solver with fail line and skip circle optimizations
 *
 * Performance improvements over basic Solver:
 * - Fail Line: ~30-40× speedup by caching geometric failure reasons
 * - Skip Circle: Additional ~50% speedup by spatial bucket rejection
 *
 * @example
 * ```typescript
 * const solver = new OptimizedSolver(walls, source, 4);
 * const paths = solver.getPaths(listener);
 * console.log(solver.getMetrics()); // See performance stats
 * ```
 */
export class OptimizedSolver {
    /**
     * @param walls Array of Wall objects defining the environment
     * @param source The sound source position
     * @param reflectionOrder Maximum number of reflections to compute (default: 5)
     * @param bucketSize Number of beam nodes per bucket for skip circle optimization (default: 16)
     */
    constructor(walls, source, reflectionOrder, bucketSize) {
        this.metrics = {
            totalLeafNodes: 0,
            bucketsTotal: 0,
            bucketsSkipped: 0,
            bucketsChecked: 0,
            failLineCacheHits: 0,
            failLineCacheMisses: 0,
            raycastCount: 0,
            skipCircleCount: 0,
            validPathCount: 0
        };
        if (!walls || walls.length === 0) {
            throw new Error('OptimizedSolver: at least one wall is required');
        }
        if (!source) {
            throw new Error('OptimizedSolver: source is required');
        }
        this.maxOrder = reflectionOrder !== undefined ? reflectionOrder - 1 : 4;
        this.walls = walls;
        this.source = source;
        this.bsp = new BSPTree(walls);
        this.beamTree = new OptimizedBeamTree(source, walls, this.maxOrder);
        this.buckets = createBuckets(this.beamTree, bucketSize ?? DEFAULT_BUCKET_SIZE);
        // Count leaf nodes for metrics
        const leafNodes = [];
        collectLeafNodes(this.beamTree.mainNode, leafNodes);
        this.metrics.totalLeafNodes = leafNodes.length;
        this.metrics.bucketsTotal = this.buckets.length;
    }
    /**
     * Get all valid reflection paths from source to listener
     * Uses fail line and skip circle optimizations for accelerated performance
     */
    getPaths(listener) {
        if (!listener) {
            throw new Error('OptimizedSolver: listener is required');
        }
        this.resetMetrics();
        const validPaths = [];
        // Also check direct path and non-leaf reflections
        const directAndNonLeafPaths = this.findNonLeafPaths(listener, this.beamTree.mainNode);
        validPaths.push(...directAndNonLeafPaths);
        // Process buckets with skip circle optimization
        for (const bucket of this.buckets) {
            const skipStatus = checkSkipCircle(listener.p0, bucket);
            if (skipStatus === 'inside') {
                // Entire bucket still invalid - skip all nodes
                this.metrics.bucketsSkipped++;
                continue;
            }
            if (skipStatus === 'outside') {
                // Listener escaped skip circle - clear it and recheck
                invalidateSkipCircle(bucket);
                // Also clear fail lines since listener moved significantly
                for (const node of bucket.nodes) {
                    node.clearFailLine();
                }
            }
            this.metrics.bucketsChecked++;
            // Check all nodes in bucket
            let allFailed = true;
            let allHaveFailLines = true;
            for (const node of bucket.nodes) {
                // Check fail line cache first (O(1) test)
                if (node.failLine && isPointBehindLine(listener.p0, node.failLine)) {
                    this.metrics.failLineCacheHits++;
                    continue; // Still invalid
                }
                // Clear stale fail line if listener is now in front
                if (node.failLine) {
                    node.clearFailLine();
                    this.metrics.failLineCacheMisses++;
                }
                // Full validation
                const result = this.validatePathOptimized(listener.p0, node);
                this.metrics.raycastCount += result.raycastCount;
                if (result.valid && result.path) {
                    validPaths.push(result.path);
                    allFailed = false;
                    allHaveFailLines = false;
                }
                else if (!node.failLine) {
                    allHaveFailLines = false;
                }
            }
            // Try to create skip circle if all paths failed with fail lines
            if (allFailed && allHaveFailLines && bucket.nodes.length > 0) {
                bucket.skipCircle = createSkipCircle(listener.p0, bucket.nodes);
                if (bucket.skipCircle) {
                    this.metrics.skipCircleCount++;
                }
            }
        }
        this.metrics.validPathCount = validPaths.length;
        return validPaths;
    }
    /**
     * Find paths from non-leaf nodes (direct path and intermediate reflections)
     */
    findNonLeafPaths(listener, node) {
        let pathArray = [];
        for (const child of node.children) {
            // Only recurse to find non-leaf paths if child has children
            if (child.children.length > 0) {
                pathArray = pathArray.concat(this.findNonLeafPaths(listener, child));
            }
        }
        // Validate path at this node
        const pTree = this.traverseBeam(listener.p0, node, null, [[listener.p0[0], listener.p0[1], null]]);
        if (pTree) {
            pathArray.push(pTree);
        }
        return pathArray;
    }
    /**
     * Validate a path with fail line detection and caching
     *
     * For correctness, we use the same validation logic as the basic solver.
     * The fail line optimization is applied AFTER validation fails, to cache
     * the geometric reason for the failure. This ensures we never reject
     * paths that the basic solver would accept.
     */
    validatePathOptimized(listenerPos, leafNode) {
        let raycastCount = 0;
        // Full path validation (same as basic solver)
        const pathPoints = [[listenerPos[0], listenerPos[1], null]];
        let currentPoint = listenerPos;
        let currentNode = leafNode;
        let prevWallId = -1;
        while (currentNode && currentNode.id !== -1) {
            const wall = this.walls[currentNode.id];
            const imageSource = currentNode.vs;
            // Ray intersection test
            const int = lineIntersection(currentPoint[0], currentPoint[1], imageSource[0], imageSource[1], wall.p1[0], wall.p1[1], wall.p2[0], wall.p2[1]);
            if (!int || !int[2] || !int[3]) {
                // No valid intersection on both line segments
                // Try to cache a fail line for this geometric failure
                const failInfo = detectFailLineForListener(listenerPos, leafNode, this.walls);
                if (failInfo) {
                    leafNode.failLine = failInfo.line;
                    leafNode.failLineType = failInfo.type;
                }
                return { valid: false, path: null, failInfo: failInfo ? { type: failInfo.type, line: failInfo.line, nodeDepth: getNodeDepth(leafNode) } : null, raycastCount };
            }
            const intersection = [int[0], int[1]];
            // Occlusion check via BSP (expensive)
            raycastCount++;
            const occluder = this.rayTrace(currentPoint, intersection, this.bsp.mainNode, prevWallId, currentNode.id, 0);
            if (occluder && occluder[6] !== currentNode.id && occluder[2] && occluder[3]) {
                // Path is blocked by another wall - can't cache this geometrically
                return { valid: false, path: null, failInfo: null, raycastCount };
            }
            pathPoints.push([intersection[0], intersection[1], currentNode.id]);
            currentPoint = intersection;
            prevWallId = currentNode.id;
            currentNode = currentNode.parent;
        }
        // Final segment to actual source
        if (currentNode) {
            const source = currentNode.vs;
            raycastCount++;
            const finalOccluder = this.rayTrace(currentPoint, source, this.bsp.mainNode, prevWallId, -1, 0);
            if (finalOccluder && finalOccluder[2] && finalOccluder[3]) {
                // Path to source is blocked
                return { valid: false, path: null, failInfo: null, raycastCount };
            }
            pathPoints.push([source[0], source[1], null]);
        }
        return { valid: true, path: pathPoints, failInfo: null, raycastCount };
    }
    /**
     * Traverse the beam at the given node (for non-leaf paths)
     */
    traverseBeam(p0, node, prevNode, pTree) {
        const ignoreId = prevNode ? prevNode.id : -1;
        let int = this.rayTrace(p0, node.vs, this.bsp.mainNode, ignoreId, node.id, 0);
        if (!int || (node.id !== -1 && int[6] !== node.id) || !int[2] || !int[3]) {
            int = null;
        }
        if (node.id === -1) {
            if (!int) {
                pTree.push([node.vs[0], node.vs[1], null]);
                return pTree;
            }
            else {
                return null;
            }
        }
        else {
            if (!int)
                return null;
            pTree.push([int[0], int[1], node.id]);
            return this.traverseBeam([int[0], int[1]], node.parent, node, pTree);
        }
    }
    /**
     * Check intersection with current BSP node
     */
    checkNodeIntersection(p1, p2, bspNode, ignoreId) {
        const lineInt = lineIntersection(p1[0], p1[1], p2[0], p2[1], bspNode.p1[0], bspNode.p1[1], bspNode.p2[0], bspNode.p2[1]);
        if (bspNode.id === ignoreId) {
            return null;
        }
        else if (lineInt) {
            return [lineInt[0], lineInt[1], lineInt[2], lineInt[3], lineInt[4], lineInt[5], bspNode.id];
        }
        return null;
    }
    /**
     * Ray tracing using BSP tree
     */
    rayTrace(p1, p2, bspNode, ignoreId, validId, order) {
        if (!bspNode)
            return null;
        let int = null;
        const isFront = inFrontOf(p1, bspNode.p1, bspNode.p2);
        const nearChild = isFront ? bspNode.front : bspNode.back;
        const farChild = isFront ? bspNode.back : bspNode.front;
        int = this.rayTrace(p1, p2, nearChild, ignoreId, validId, order);
        if (!int || !int[2] || !int[3]) {
            int = this.checkNodeIntersection(p1, p2, bspNode, ignoreId);
        }
        if (!int || !int[2] || !int[3]) {
            int = this.rayTrace(p1, p2, farChild, ignoreId, validId, order);
        }
        return int;
    }
    /**
     * Reset performance metrics for a new frame
     */
    resetMetrics() {
        this.metrics = {
            totalLeafNodes: this.metrics.totalLeafNodes,
            bucketsTotal: this.metrics.bucketsTotal,
            bucketsSkipped: 0,
            bucketsChecked: 0,
            failLineCacheHits: 0,
            failLineCacheMisses: 0,
            raycastCount: 0,
            skipCircleCount: 0,
            validPathCount: 0
        };
    }
    /**
     * Get performance metrics from the last getPaths call
     * Useful for analyzing optimization effectiveness
     */
    getMetrics() {
        return { ...this.metrics };
    }
    /**
     * Clear all cached fail lines and skip circles
     * Call this when geometry changes significantly
     */
    clearCache() {
        for (const bucket of this.buckets) {
            bucket.skipCircle = null;
            for (const node of bucket.nodes) {
                node.clearFailLine();
            }
        }
    }
}
//# sourceMappingURL=optimization.js.map