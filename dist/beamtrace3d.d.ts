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
export { Vector3 } from './core/vector3';
export { Plane3D } from './core/plane3d';
export type { Point3D, PathPoint3D, ReflectionPath3D, PointClassification, PolygonClassification, FailPlaneType } from './core/types';
export { Polygon3D, createShoeboxRoom, createQuad } from './geometry/polygon3d';
export { splitPolygon, splitPolygons } from './geometry/polygon-split';
export { clipPolygonByPlane, clipPolygonByPlanes, clipPolygonByFrustum, quickRejectPolygon, polygonMayIntersectVolume, clipRayByPlanes } from './geometry/clipping3d';
export { buildBSP, rayTraceBSP, rayOccluded, rayTraceAll, countNodes, treeDepth } from './structures/bsp3d';
export type { BSPNode3D, RayHit3D } from './structures/bsp3d';
export { createBeam3D, constructBeamBoundaryPlanes, isPointInBeam, findBeamViolation, distanceToBeamBoundary, mirrorPointAcrossPolygon, polygonMayBeInBeam, isPolygonFacingSource, beamSolidAngle } from './structures/beam3d';
export type { Beam3D, BeamViolation } from './structures/beam3d';
export { buildBeamTree3D, collectNodesAtOrder, getNodeOrder, getReflectionPath, countBeamNodes, getBeamTreeStats, clearFailPlanes, iterateNodes } from './structures/beamtree3d';
export type { BeamNode3D, BeamTree3D, BeamTreeStats } from './structures/beamtree3d';
export { detectFailPlane, propagateFailPlane, isListenerBehindFailPlane, distanceToFailPlane, minDistanceToFailPlanes, updateNodeFailPlane, clearNodeFailPlane, hasFailPlane } from './optimization/failplane3d';
export type { FailPlaneInfo } from './optimization/failplane3d';
export { createBuckets3D, isInsideSkipSphere, checkSkipSphere, createSkipSphere, invalidateSkipSphere, clearBucketFailPlanes, updateBucketSkipSphere, processBucketSkipSphere, getSkipSphereStats, DEFAULT_BUCKET_SIZE_3D } from './optimization/skipsphere3d';
export type { SkipSphere, Bucket3D, SkipSphereStatus, BucketProcessingResult, SkipSphereStats } from './optimization/skipsphere3d';
export { OptimizedSolver3D, computePathLength, computeArrivalTime, getPathReflectionOrder } from './solver/solver3d';
export type { PerformanceMetrics3D, OptimizedSolver3DConfig, BeamVisualizationData } from './solver/solver3d';
import { Vector3 } from './core/vector3';
import { Polygon3D } from './geometry/polygon3d';
import { OptimizedSolver3DConfig, BeamVisualizationData } from './solver/solver3d';
import type { ReflectionPath3D } from './core/types';
/**
 * 3D Sound source
 */
export declare class Source3D {
    readonly position: Vector3;
    constructor(position: Vector3);
}
/**
 * 3D Listener
 */
export declare class Listener3D {
    position: Vector3;
    constructor(position: Vector3);
    /**
     * Update listener position
     */
    moveTo(position: Vector3): void;
}
/**
 * Main 3D Solver class (alias for OptimizedSolver3D with simpler interface)
 */
export declare class Solver3D {
    private readonly solver;
    readonly source: Source3D;
    constructor(polygons: Polygon3D[], source: Source3D, config?: OptimizedSolver3DConfig);
    /**
     * Get all valid reflection paths to a listener
     */
    getPaths(listener: Listener3D | Vector3): ReflectionPath3D[];
    /**
     * Get performance metrics from last getPaths() call
     */
    getMetrics(): import("./solver/solver3d").PerformanceMetrics3D;
    /**
     * Clear optimization caches
     */
    clearCache(): void;
    /**
     * Get number of leaf nodes in beam tree
     */
    getLeafNodeCount(): number;
    /**
     * Get maximum reflection order
     */
    getMaxReflectionOrder(): number;
    /**
     * Get beam data for visualization
     */
    getBeamsForVisualization(maxOrder?: number): BeamVisualizationData[];
}
/**
 * Create a simple shoebox room for testing
 */
export declare function createRoom(width: number, depth: number, height: number): Polygon3D[];
//# sourceMappingURL=beamtrace3d.d.ts.map