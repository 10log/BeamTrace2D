/**
 * BeamTrace3D - 3D Beam Tracing for Acoustic Simulations
 *
 * Main entry point for the 3D beam tracing library.
 * Extends the 2D BeamTrace implementation to full 3D with:
 * - 3D polygonal room geometry
 * - BSP tree acceleration
 * - Fail plane caching
 * - Skip sphere bucketing
 *
 * Based on: Laine, S., Siltanen, S., Lokki, T., & Savioja, L. (2009).
 * "Accelerated beam tracing algorithm." Applied Acoustics, 70(1), 172-181.
 *
 * @example
 * ```typescript
 * import { Polygon3D, Source3D, Listener3D, Solver3D, createShoeboxRoom } from './beamtrace3d';
 *
 * // Create a simple room
 * const room = createShoeboxRoom(10, 8, 3);
 *
 * // Create source and solver
 * const source = new Source3D([5, 4, 1.5]);
 * const solver = new Solver3D(room, source, { maxReflectionOrder: 4 });
 *
 * // Find paths to listener
 * const listener = new Listener3D([2, 2, 1.2]);
 * const paths = solver.getPaths(listener.position);
 * ```
 */
// Core types
export { Vector3 } from './core/vector3';
export { Plane3D } from './core/plane3d';
// Geometry
export { Polygon3D, createShoeboxRoom, createQuad } from './geometry/polygon3d';
export { splitPolygon, splitPolygons } from './geometry/polygon-split';
export { clipPolygonByPlane, clipPolygonByPlanes, clipPolygonByFrustum, quickRejectPolygon, polygonMayIntersectVolume, clipRayByPlanes } from './geometry/clipping3d';
// Structures
export { buildBSP, rayTraceBSP, rayOccluded, rayTraceAll, countNodes, treeDepth } from './structures/bsp3d';
export { createBeam3D, constructBeamBoundaryPlanes, isPointInBeam, findBeamViolation, distanceToBeamBoundary, mirrorPointAcrossPolygon, polygonMayBeInBeam, isPolygonFacingSource, beamSolidAngle } from './structures/beam3d';
export { buildBeamTree3D, collectNodesAtOrder, getNodeOrder, getReflectionPath, countBeamNodes, getBeamTreeStats, clearFailPlanes, iterateNodes } from './structures/beamtree3d';
// Optimization
export { detectFailPlane, propagateFailPlane, isListenerBehindFailPlane, distanceToFailPlane, minDistanceToFailPlanes, updateNodeFailPlane, clearNodeFailPlane, hasFailPlane } from './optimization/failplane3d';
export { createBuckets3D, isInsideSkipSphere, checkSkipSphere, createSkipSphere, invalidateSkipSphere, clearBucketFailPlanes, updateBucketSkipSphere, processBucketSkipSphere, getSkipSphereStats, DEFAULT_BUCKET_SIZE_3D } from './optimization/skipsphere3d';
// Solver
export { OptimizedSolver3D, computePathLength, computeArrivalTime, getPathReflectionOrder } from './solver/solver3d';
// Convenience aliases
import { Vector3 } from './core/vector3';
import { createShoeboxRoom } from './geometry/polygon3d';
import { OptimizedSolver3D } from './solver/solver3d';
/**
 * 3D Sound source
 */
export class Source3D {
    constructor(position) {
        this.position = Vector3.clone(position);
    }
}
/**
 * 3D Listener
 */
export class Listener3D {
    constructor(position) {
        this.position = Vector3.clone(position);
    }
    /**
     * Update listener position
     */
    moveTo(position) {
        this.position = Vector3.clone(position);
    }
}
/**
 * Main 3D Solver class (alias for OptimizedSolver3D with simpler interface)
 */
export class Solver3D {
    constructor(polygons, source, config) {
        this.source = source;
        this.solver = new OptimizedSolver3D(polygons, source.position, config);
    }
    /**
     * Get all valid reflection paths to a listener
     */
    getPaths(listener) {
        const pos = Array.isArray(listener) ? listener : listener.position;
        return this.solver.getPaths(pos);
    }
    /**
     * Get performance metrics from last getPaths() call
     */
    getMetrics() {
        return this.solver.getMetrics();
    }
    /**
     * Clear optimization caches
     */
    clearCache() {
        this.solver.clearCache();
    }
    /**
     * Get number of leaf nodes in beam tree
     */
    getLeafNodeCount() {
        return this.solver.getLeafNodeCount();
    }
    /**
     * Get maximum reflection order
     */
    getMaxReflectionOrder() {
        return this.solver.getMaxReflectionOrder();
    }
    /**
     * Get beam data for visualization
     */
    getBeamsForVisualization(maxOrder) {
        return this.solver.getBeamsForVisualization(maxOrder);
    }
}
/**
 * Create a simple shoebox room for testing
 */
export function createRoom(width, depth, height) {
    return createShoeboxRoom(width, depth, height);
}
//# sourceMappingURL=beamtrace3d.js.map