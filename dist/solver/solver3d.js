/**
 * Optimized 3D Beam Tracing Solver
 *
 * Main solver that combines BSP tree, beam tree, fail plane, and skip sphere
 * optimizations for efficient acoustic path finding in 3D environments.
 *
 * Based on: Laine, S., Siltanen, S., Lokki, T., & Savioja, L. (2009).
 * "Accelerated beam tracing algorithm." Applied Acoustics, 70(1), 172-181.
 */
import { Vector3 } from '../core/vector3';
import { Polygon3D } from '../geometry/polygon3d';
import { Plane3D } from '../core/plane3d';
import { buildBSP, rayTraceBSP, rayTraceBSPMultiIgnore } from '../structures/bsp3d';
import { buildBeamTree3D, clearFailPlanes } from '../structures/beamtree3d';
import { detectFailPlane, isListenerBehindFailPlane } from '../optimization/failplane3d';
import { createBuckets3D, checkSkipSphere, createSkipSphere, invalidateSkipSphere, clearBucketFailPlanes, DEFAULT_BUCKET_SIZE_3D } from '../optimization/skipsphere3d';
/**
 * Optimized 3D Beam Tracing Solver
 *
 * Provides efficient acoustic path finding using:
 * - BSP tree for O(log n) ray-polygon intersection
 * - Beam tree for reflection path enumeration
 * - Fail plane caching for O(1) early rejection
 * - Skip sphere bucketing for spatial acceleration
 */
export class OptimizedSolver3D {
    /**
     * Create a new 3D beam tracing solver
     *
     * @param polygons - Room geometry as an array of polygons
     * @param sourcePosition - Position of the sound source
     * @param config - Optional configuration
     */
    constructor(polygons, sourcePosition, config = {}) {
        const maxOrder = config.maxReflectionOrder ?? 5;
        const bucketSize = config.bucketSize ?? DEFAULT_BUCKET_SIZE_3D;
        this.polygons = polygons;
        this.sourcePosition = Vector3.clone(sourcePosition);
        // Build BSP tree for ray tracing
        this.bspRoot = buildBSP(polygons);
        // Build beam tree for reflection enumeration
        this.beamTree = buildBeamTree3D(sourcePosition, polygons, maxOrder);
        // Create buckets for skip sphere optimization
        this.buckets = createBuckets3D(this.beamTree.leafNodes, bucketSize);
        // Initialize metrics
        this.metrics = this.createEmptyMetrics();
        this.metrics.totalLeafNodes = this.beamTree.leafNodes.length;
        this.metrics.bucketsTotal = this.buckets.length;
    }
    /**
     * Get all valid reflection paths from source to listener
     *
     * @param listenerPos - Position of the listener
     * @returns Array of valid reflection paths
     */
    getPaths(listenerPos) {
        this.resetMetrics();
        const validPaths = [];
        // 1. Check direct path (order 0)
        const directPath = this.validateDirectPath(listenerPos);
        if (directPath) {
            validPaths.push(directPath);
        }
        // 2. Check intermediate reflection orders (non-leaf nodes)
        const intermediatePaths = this.findIntermediatePaths(listenerPos, this.beamTree.root);
        validPaths.push(...intermediatePaths);
        // 3. Process leaf nodes with bucket optimization
        for (const bucket of this.buckets) {
            const skipStatus = checkSkipSphere(listenerPos, bucket);
            if (skipStatus === 'inside') {
                // Listener inside skip sphere - skip entire bucket
                this.metrics.bucketsSkipped++;
                continue;
            }
            if (skipStatus === 'outside') {
                // Listener escaped - invalidate sphere and clear fail planes
                invalidateSkipSphere(bucket);
                clearBucketFailPlanes(bucket);
            }
            this.metrics.bucketsChecked++;
            let allFailed = true;
            let allHaveFailPlanes = true;
            for (const node of bucket.nodes) {
                // Check fail plane cache first (O(1))
                if (node.failPlane && isListenerBehindFailPlane(listenerPos, node.failPlane)) {
                    this.metrics.failPlaneCacheHits++;
                    continue;
                }
                // Fail plane was invalidated or listener escaped
                if (node.failPlane) {
                    node.failPlane = undefined;
                    node.failPlaneType = undefined;
                    this.metrics.failPlaneCacheMisses++;
                }
                // Full path validation
                const result = this.validatePath(listenerPos, node);
                if (result.valid && result.path) {
                    validPaths.push(result.path);
                    allFailed = false;
                    allHaveFailPlanes = false;
                }
                else if (!node.failPlane) {
                    allHaveFailPlanes = false;
                }
            }
            // Create skip sphere if all paths failed with fail planes
            if (allFailed && allHaveFailPlanes && bucket.nodes.length > 0) {
                bucket.skipSphere = createSkipSphere(listenerPos, bucket.nodes);
                if (bucket.skipSphere) {
                    this.metrics.skipSphereCount++;
                }
            }
        }
        this.metrics.validPathCount = validPaths.length;
        return validPaths;
    }
    /**
     * Get all valid reflection paths with detailed information about each reflection.
     *
     * This method returns the same paths as getPaths() but with additional details:
     * - Angle of incidence and reflection at each surface
     * - Surface normal vectors
     * - Segment lengths and cumulative distances
     * - Grazing incidence detection
     *
     * @param listenerPos - Position of the listener
     * @returns Array of detailed reflection paths
     */
    getDetailedPaths(listenerPos) {
        const simplePaths = this.getPaths(listenerPos);
        return simplePaths.map(path => convertToDetailedPath3D(path, this.polygons));
    }
    /**
     * Validate the direct path from listener to source
     */
    validateDirectPath(listenerPos) {
        const direction = Vector3.subtract(this.sourcePosition, listenerPos);
        const dist = Vector3.length(direction);
        const dir = Vector3.normalize(direction);
        this.metrics.raycastCount++;
        const hit = rayTraceBSP(listenerPos, dir, this.bspRoot, 0, dist, -1);
        // If something blocks the path before reaching source, no direct path
        if (hit && hit.t < dist - 1e-6) {
            return null;
        }
        return [
            { position: Vector3.clone(listenerPos), polygonId: null },
            { position: Vector3.clone(this.sourcePosition), polygonId: null }
        ];
    }
    /**
     * Find paths through intermediate (non-leaf) nodes
     *
     * These are lower-order reflections that didn't spawn further children.
     */
    findIntermediatePaths(listenerPos, node) {
        const paths = [];
        // Process children recursively
        for (const child of node.children) {
            if (child.children.length > 0) {
                // Has children - recurse
                paths.push(...this.findIntermediatePaths(listenerPos, child));
            }
        }
        // Try this node if it has an aperture (is a reflection, not root)
        if (node.id !== -1 && node.aperture) {
            const path = this.traverseBeam(listenerPos, node);
            if (path) {
                paths.push(path);
            }
        }
        return paths;
    }
    /**
     * Traverse a beam from listener to source, building the reflection path
     */
    traverseBeam(listenerPos, node, debug = false) {
        const pathPoints = [
            { position: Vector3.clone(listenerPos), polygonId: null }
        ];
        // Build polygon path for logging
        const polygonPath = [];
        let tempNode = node;
        while (tempNode && tempNode.id !== -1) {
            polygonPath.unshift(tempNode.id);
            tempNode = tempNode.parent;
        }
        if (debug) {
            console.log(`[traverseBeam] Exploring beam with polygonPath: [${polygonPath.join(', ')}]`);
            console.log(`  Listener: [${listenerPos[0].toFixed(3)}, ${listenerPos[1].toFixed(3)}, ${listenerPos[2].toFixed(3)}]`);
            console.log(`  Virtual source: [${node.virtualSource[0].toFixed(3)}, ${node.virtualSource[1].toFixed(3)}, ${node.virtualSource[2].toFixed(3)}]`);
        }
        let currentPoint = listenerPos;
        let currentNode = node;
        // Track all polygon IDs that should be ignored in occlusion checks
        // (the polygon we're coming from and the polygon we're going to)
        const ignoreIds = new Set();
        let segmentIndex = 0;
        // Walk from leaf to root, finding reflection points
        while (currentNode && currentNode.id !== -1) {
            const poly = this.polygons[currentNode.id];
            const imageSource = currentNode.virtualSource;
            // Direction from current point toward virtual source
            const dir = Vector3.normalize(Vector3.subtract(imageSource, currentPoint));
            // Find intersection with reflecting polygon
            const hit = Polygon3D.rayIntersection(currentPoint, dir, poly);
            if (!hit) {
                if (debug) {
                    console.log(`  [Segment ${segmentIndex}] FAIL: No intersection with polygon ${currentNode.id}`);
                }
                return null;
            }
            if (debug) {
                console.log(`  [Segment ${segmentIndex}] Ray from [${currentPoint[0].toFixed(3)}, ${currentPoint[1].toFixed(3)}, ${currentPoint[2].toFixed(3)}]`);
                console.log(`    Direction: [${dir[0].toFixed(3)}, ${dir[1].toFixed(3)}, ${dir[2].toFixed(3)}]`);
                console.log(`    Hit polygon ${currentNode.id} at t=${hit.t.toFixed(3)}, point=[${hit.point[0].toFixed(3)}, ${hit.point[1].toFixed(3)}, ${hit.point[2].toFixed(3)}]`);
            }
            // Check for occlusion between current point and reflection point
            // We need to ignore:
            // - The polygon we just came from (already in ignoreIds from previous iteration)
            // - The polygon we're reflecting to (currentNode.id) since it's at the endpoint
            ignoreIds.add(currentNode.id);
            this.metrics.raycastCount++;
            const occluder = rayTraceBSPMultiIgnore(currentPoint, dir, this.bspRoot, 1e-6, hit.t - 1e-6, ignoreIds);
            if (occluder) {
                if (debug) {
                    console.log(`    OCCLUDED by polygon ${occluder.polygonId} at t=${occluder.t.toFixed(3)}, point=[${occluder.point[0].toFixed(3)}, ${occluder.point[1].toFixed(3)}, ${occluder.point[2].toFixed(3)}]`);
                    console.log(`    ignoreIds: [${Array.from(ignoreIds).join(', ')}]`);
                }
                return null;
            }
            if (debug) {
                console.log(`    OK - no occlusion (ignoreIds: [${Array.from(ignoreIds).join(', ')}])`);
            }
            // Add reflection point to path
            pathPoints.push({
                position: Vector3.clone(hit.point),
                polygonId: currentNode.id
            });
            currentPoint = hit.point;
            // Keep the current polygon in ignoreIds for the next segment
            // (we're leaving from this polygon)
            currentNode = currentNode.parent;
            segmentIndex++;
        }
        // Final segment to actual source
        if (currentNode) {
            const dir = Vector3.normalize(Vector3.subtract(currentNode.virtualSource, currentPoint));
            const dist = Vector3.distance(currentNode.virtualSource, currentPoint);
            if (debug) {
                console.log(`  [Final segment] Ray from [${currentPoint[0].toFixed(3)}, ${currentPoint[1].toFixed(3)}, ${currentPoint[2].toFixed(3)}]`);
                console.log(`    To source: [${currentNode.virtualSource[0].toFixed(3)}, ${currentNode.virtualSource[1].toFixed(3)}, ${currentNode.virtualSource[2].toFixed(3)}]`);
                console.log(`    Direction: [${dir[0].toFixed(3)}, ${dir[1].toFixed(3)}, ${dir[2].toFixed(3)}]`);
                console.log(`    Distance: ${dist.toFixed(3)}`);
                console.log(`    tMin: ${1e-6}, tMax: ${(dist - 1e-6).toFixed(6)}`);
                console.log(`    ignoreIds: [${Array.from(ignoreIds).join(', ')}]`);
                // Check intersection with back1 (inner wall at y=5.575)
                // If segment crosses y=5.575, calculate where
                const p1 = currentPoint;
                const p2 = currentNode.virtualSource;
                if ((p1[1] < 5.575 && p2[1] > 5.575) || (p1[1] > 5.575 && p2[1] < 5.575)) {
                    const t = (5.575 - p1[1]) / (p2[1] - p1[1]);
                    const xAtCross = p1[0] + t * (p2[0] - p1[0]);
                    const zAtCross = p1[2] + t * (p2[2] - p1[2]);
                    console.log(`    CROSSING y=5.575 at t=${t.toFixed(3)}, x=${xAtCross.toFixed(3)}, z=${zAtCross.toFixed(3)}`);
                    console.log(`    back1 spans: x=[6.215, 12.43], z=[0, 4.877]`);
                    if (xAtCross >= 6.215 && xAtCross <= 12.43 && zAtCross >= 0 && zAtCross <= 4.877) {
                        console.log(`    *** SHOULD HIT back1 (polygons 3, 4) ***`);
                        // Direct ray test against polygons 3 and 4
                        console.log(`    Direct polygon intersection test:`);
                        for (const polyId of [3, 4]) {
                            const poly = this.polygons[polyId];
                            const testHit = Polygon3D.rayIntersection(currentPoint, dir, poly);
                            if (testHit) {
                                console.log(`      Polygon ${polyId}: HIT at t=${testHit.t.toFixed(3)}, point=[${testHit.point[0].toFixed(3)}, ${testHit.point[1].toFixed(3)}, ${testHit.point[2].toFixed(3)}]`);
                            }
                            else {
                                console.log(`      Polygon ${polyId}: NO HIT`);
                                // Debug: show polygon vertices
                                console.log(`        Vertices: ${poly.vertices.map(v => `[${v[0].toFixed(2)}, ${v[1].toFixed(2)}, ${v[2].toFixed(2)}]`).join(', ')}`);
                            }
                        }
                    }
                }
            }
            this.metrics.raycastCount++;
            // Use the same ignoreIds set which contains all polygons in the reflection chain
            const tMinVal = 1e-6;
            const tMaxVal = dist - 1e-6;
            const finalHit = rayTraceBSPMultiIgnore(currentPoint, dir, this.bspRoot, tMinVal, tMaxVal, ignoreIds);
            if (finalHit) {
                if (debug) {
                    console.log(`    OCCLUDED by polygon ${finalHit.polygonId} at t=${finalHit.t.toFixed(3)}, point=[${finalHit.point[0].toFixed(3)}, ${finalHit.point[1].toFixed(3)}, ${finalHit.point[2].toFixed(3)}]`);
                }
                return null;
            }
            if (debug) {
                console.log(`    OK - path valid!`);
            }
            // Add source point
            pathPoints.push({
                position: Vector3.clone(currentNode.virtualSource),
                polygonId: null
            });
        }
        return pathPoints;
    }
    /**
     * Validate a path through a beam node
     */
    validatePath(listenerPos, leafNode) {
        const path = this.traverseBeam(listenerPos, leafNode);
        if (path) {
            return { valid: true, path };
        }
        // Path failed - try to detect and cache fail plane
        const failInfo = detectFailPlane(listenerPos, leafNode, this.polygons);
        if (failInfo) {
            leafNode.failPlane = failInfo.plane;
            leafNode.failPlaneType = failInfo.type;
        }
        return { valid: false, path: null };
    }
    /**
     * Get performance metrics from the last getPaths() call
     */
    getMetrics() {
        return { ...this.metrics };
    }
    /**
     * Debug a specific beam path by polygon IDs
     * Logs detailed information about the path validation process
     */
    debugBeamPath(listenerPos, polygonPath) {
        console.log('=== DEBUG BEAM PATH ===');
        console.log(`Listener: [${listenerPos[0].toFixed(3)}, ${listenerPos[1].toFixed(3)}, ${listenerPos[2].toFixed(3)}]`);
        console.log(`Polygon path: [${polygonPath.join(', ')}]`);
        console.log(`Source: [${this.sourcePosition[0].toFixed(3)}, ${this.sourcePosition[1].toFixed(3)}, ${this.sourcePosition[2].toFixed(3)}]`);
        // Find the beam node matching this polygon path
        const findNode = (node, path, depth) => {
            if (depth === path.length) {
                return node;
            }
            for (const child of node.children) {
                if (child.id === path[depth]) {
                    return findNode(child, path, depth + 1);
                }
            }
            return null;
        };
        const targetNode = findNode(this.beamTree.root, polygonPath, 0);
        if (!targetNode) {
            console.log('ERROR: Could not find beam node for this polygon path');
            return;
        }
        console.log(`Found beam node with virtual source: [${targetNode.virtualSource[0].toFixed(3)}, ${targetNode.virtualSource[1].toFixed(3)}, ${targetNode.virtualSource[2].toFixed(3)}]`);
        // Run traverseBeam with debug enabled
        const result = this.traverseBeam(listenerPos, targetNode, true);
        if (result) {
            console.log('PATH VALID - returned path:');
            for (let i = 0; i < result.length; i++) {
                const p = result[i];
                console.log(`  [${i}] pos=[${p.position[0].toFixed(3)}, ${p.position[1].toFixed(3)}, ${p.position[2].toFixed(3)}], polygonId=${p.polygonId}`);
            }
        }
        else {
            console.log('PATH INVALID');
        }
        console.log('=== END DEBUG ===');
    }
    /**
     * Clear all cached fail planes and skip spheres
     *
     * Call this if the room geometry changes.
     */
    clearCache() {
        clearFailPlanes(this.beamTree);
        for (const bucket of this.buckets) {
            invalidateSkipSphere(bucket);
        }
    }
    /**
     * Get the number of leaf nodes in the beam tree
     */
    getLeafNodeCount() {
        return this.beamTree.leafNodes.length;
    }
    /**
     * Get the maximum reflection order
     */
    getMaxReflectionOrder() {
        return this.beamTree.maxReflectionOrder;
    }
    /**
     * Get the source position
     */
    getSourcePosition() {
        return Vector3.clone(this.sourcePosition);
    }
    /**
     * Get beam data for visualization
     * Returns beams organized by reflection order
     */
    getBeamsForVisualization(maxOrder) {
        const beams = [];
        const effectiveMaxOrder = maxOrder ?? this.beamTree.maxReflectionOrder;
        const traverse = (node, order, pathSoFar) => {
            if (order > effectiveMaxOrder)
                return;
            // Build the current path including this node's polygon
            const currentPath = node.id !== -1 ? [...pathSoFar, node.id] : pathSoFar;
            if (node.id !== -1 && node.aperture) {
                beams.push({
                    virtualSource: Vector3.clone(node.virtualSource),
                    apertureVertices: node.aperture.vertices.map(v => Vector3.clone(v)),
                    reflectionOrder: order,
                    polygonId: node.id,
                    polygonPath: currentPath
                });
            }
            for (const child of node.children) {
                traverse(child, order + 1, currentPath);
            }
        };
        traverse(this.beamTree.root, 0, []);
        return beams;
    }
    /**
     * Create empty metrics object
     */
    createEmptyMetrics() {
        return {
            totalLeafNodes: 0,
            bucketsTotal: 0,
            bucketsSkipped: 0,
            bucketsChecked: 0,
            failPlaneCacheHits: 0,
            failPlaneCacheMisses: 0,
            raycastCount: 0,
            skipSphereCount: 0,
            validPathCount: 0
        };
    }
    /**
     * Reset metrics for a new getPaths() call
     */
    resetMetrics() {
        const total = this.metrics.totalLeafNodes;
        const buckets = this.metrics.bucketsTotal;
        this.metrics = this.createEmptyMetrics();
        this.metrics.totalLeafNodes = total;
        this.metrics.bucketsTotal = buckets;
    }
}
/**
 * Compute the total path length of a reflection path
 */
export function computePathLength(path) {
    let length = 0;
    for (let i = 1; i < path.length; i++) {
        length += Vector3.distance(path[i - 1].position, path[i].position);
    }
    return length;
}
/**
 * Compute arrival time for a path (assuming speed of sound)
 */
export function computeArrivalTime(path, speedOfSound = 343) {
    return computePathLength(path) / speedOfSound;
}
/**
 * Get the reflection order of a path (number of reflections)
 */
export function getPathReflectionOrder(path) {
    // Count points with non-null polygonId (reflection points)
    return path.filter(p => p.polygonId !== null).length;
}
// ============================================================
// Helper functions for detailed path information
// ============================================================
/** Threshold angle (radians from 90°) for marking reflections as grazing */
const GRAZING_THRESHOLD_3D = 0.05; // ~3 degrees from grazing
/**
 * Calculate the incidence angle between an incoming direction and surface normal.
 * Returns angle in radians (0 = perpendicular to surface, π/2 = grazing).
 */
function calculateIncidenceAngle3D(incomingDir, surfaceNormal) {
    // The incoming direction points toward the surface, so we use -incomingDir
    // Angle of incidence is measured from the normal
    const cosAngle = Math.abs(Vector3.dot(Vector3.negate(incomingDir), surfaceNormal));
    // Clamp to [-1, 1] to handle floating point errors
    const clampedCos = Math.max(-1, Math.min(1, cosAngle));
    return Math.acos(clampedCos);
}
/**
 * Get the surface normal oriented toward the incoming ray.
 * This ensures the normal always points toward the side the ray came from.
 */
function getOrientedNormal3D(polygon, incomingDir) {
    const normal = Plane3D.normal(polygon.plane);
    // If ray is coming from the back side, flip the normal
    const dot = Vector3.dot(incomingDir, normal);
    if (dot > 0) {
        return Vector3.negate(normal);
    }
    return Vector3.clone(normal);
}
/**
 * Convert a simple reflection path to a detailed path with full reflection information.
 *
 * @param path - The simple reflection path from getPaths()
 * @param polygons - The room polygons (to look up polygon info by ID)
 * @returns Detailed path information including angles, normals, and distances
 */
export function convertToDetailedPath3D(path, polygons) {
    if (path.length < 2) {
        throw new Error('Path must have at least 2 points (listener and source)');
    }
    const listenerPosition = Vector3.clone(path[0].position);
    const sourcePosition = Vector3.clone(path[path.length - 1].position);
    const reflections = [];
    const segments = [];
    let cumulativeDistance = 0;
    // Process each segment and reflection
    for (let i = 0; i < path.length - 1; i++) {
        const startPoint = path[i].position;
        const endPoint = path[i + 1].position;
        // Calculate segment info
        const segmentLength = Vector3.distance(startPoint, endPoint);
        segments.push({
            startPoint: Vector3.clone(startPoint),
            endPoint: Vector3.clone(endPoint),
            length: segmentLength,
            segmentIndex: i
        });
        // If the end point is a reflection (not the source), calculate reflection details
        const endPolygonId = path[i + 1].polygonId;
        if (endPolygonId !== null) {
            const polygon = polygons[endPolygonId];
            const hitPoint = path[i + 1].position;
            // Incoming direction (normalized)
            const incomingDirection = Vector3.normalize(Vector3.subtract(hitPoint, startPoint));
            // Get the next point to calculate outgoing direction
            const nextPoint = path[i + 2]?.position;
            let outgoingDirection;
            if (nextPoint) {
                outgoingDirection = Vector3.normalize(Vector3.subtract(nextPoint, hitPoint));
            }
            else {
                // Shouldn't happen in valid paths, but handle gracefully
                outgoingDirection = Vector3.reflect(incomingDirection, Plane3D.normal(polygon.plane));
            }
            // Surface normal oriented toward incoming ray
            const surfaceNormal = getOrientedNormal3D(polygon, incomingDirection);
            // Calculate angles
            const incidenceAngle = calculateIncidenceAngle3D(incomingDirection, surfaceNormal);
            const reflectionAngle = incidenceAngle; // Specular reflection
            // Update cumulative distance (includes this segment)
            cumulativeDistance += segmentLength;
            // Check if grazing (angle close to 90°)
            const isGrazing = Math.abs(incidenceAngle - Math.PI / 2) < GRAZING_THRESHOLD_3D;
            reflections.push({
                polygon,
                polygonId: endPolygonId,
                hitPoint: Vector3.clone(hitPoint),
                incidenceAngle,
                reflectionAngle,
                incomingDirection,
                outgoingDirection,
                surfaceNormal,
                reflectionOrder: reflections.length + 1,
                cumulativeDistance,
                incomingSegmentLength: segmentLength,
                isGrazing
            });
        }
        else {
            // Final segment to source - just add to cumulative distance
            cumulativeDistance += segmentLength;
        }
    }
    return {
        listenerPosition,
        sourcePosition,
        totalPathLength: cumulativeDistance,
        reflectionCount: reflections.length,
        reflections,
        segments,
        simplePath: path
    };
}
//# sourceMappingURL=solver3d.js.map