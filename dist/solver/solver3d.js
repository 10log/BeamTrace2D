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
import { buildBSP, rayTraceBSP } from '../structures/bsp3d';
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
    traverseBeam(listenerPos, node) {
        const pathPoints = [
            { position: Vector3.clone(listenerPos), polygonId: null }
        ];
        let currentPoint = listenerPos;
        let currentNode = node;
        let prevPolyId = -1;
        // Walk from leaf to root, finding reflection points
        while (currentNode && currentNode.id !== -1) {
            const poly = this.polygons[currentNode.id];
            const imageSource = currentNode.virtualSource;
            // Direction from current point toward virtual source
            const dir = Vector3.normalize(Vector3.subtract(imageSource, currentPoint));
            // Find intersection with reflecting polygon
            const hit = Polygon3D.rayIntersection(currentPoint, dir, poly);
            if (!hit) {
                // Should intersect reflecting polygon - validation failure
                return null;
            }
            // Check for occlusion between current point and reflection point
            this.metrics.raycastCount++;
            const occluder = rayTraceBSP(currentPoint, dir, this.bspRoot, 1e-6, hit.t - 1e-6, prevPolyId);
            if (occluder) {
                // Path is blocked
                return null;
            }
            // Add reflection point to path
            pathPoints.push({
                position: Vector3.clone(hit.point),
                polygonId: currentNode.id
            });
            currentPoint = hit.point;
            prevPolyId = currentNode.id;
            currentNode = currentNode.parent;
        }
        // Final segment to actual source
        if (currentNode) {
            const dir = Vector3.normalize(Vector3.subtract(currentNode.virtualSource, currentPoint));
            const dist = Vector3.distance(currentNode.virtualSource, currentPoint);
            this.metrics.raycastCount++;
            const finalHit = rayTraceBSP(currentPoint, dir, this.bspRoot, 1e-6, dist - 1e-6, prevPolyId);
            if (finalHit) {
                // Final segment is blocked
                return null;
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
        const traverse = (node, order) => {
            if (order > effectiveMaxOrder)
                return;
            if (node.id !== -1 && node.aperture) {
                beams.push({
                    virtualSource: Vector3.clone(node.virtualSource),
                    apertureVertices: node.aperture.vertices.map(v => Vector3.clone(v)),
                    reflectionOrder: order,
                    polygonId: node.id
                });
            }
            for (const child of node.children) {
                traverse(child, order + 1);
            }
        };
        traverse(this.beamTree.root, 0);
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
//# sourceMappingURL=solver3d.js.map