/**
 * beam-trace - 2D and 3D Beam Tracing for Acoustic Simulations
 *
 * Combined entry point for both 2D and 3D beam tracing modules.
 * For tree-shaking or smaller bundles, you can import from subpaths:
 *   - import { Wall, Source, Solver } from 'beam-trace/2d'
 *   - import { Polygon3D, Source3D, Solver3D } from 'beam-trace/3d'
 *
 * @example 2D Usage
 * ```typescript
 * import { Wall, Source, Listener, Solver } from 'beam-trace';
 *
 * const walls = [
 *   new Wall([0, 0], [100, 0]),
 *   new Wall([100, 0], [100, 100]),
 *   new Wall([100, 100], [0, 100]),
 *   new Wall([0, 100], [0, 0])
 * ];
 * const source = new Source([50, 50]);
 * const solver = new Solver(walls, source, 4);
 * const listener = new Listener([60, 60]);
 * const paths = solver.getPaths(listener);
 * ```
 *
 * @example 3D Usage
 * ```typescript
 * import { Polygon3D, Source3D, Listener3D, Solver3D, createShoeboxRoom } from 'beam-trace';
 *
 * const room = createShoeboxRoom(10, 8, 3);
 * const source = new Source3D([5, 4, 1.5]);
 * const solver = new Solver3D(room, source, { maxReflectionOrder: 4 });
 * const listener = new Listener3D([2, 2, 1.2]);
 * const paths = solver.getPaths(listener);
 * ```
 */
// =============================================================================
// 2D Exports
// =============================================================================
export { 
// Classes
Wall, Source, Listener, Solver, 
// Optimized solver
OptimizedSolver, 
// Geometry utilities namespace
geometry, 
// Default export object
default as BeamTrace2D } from './beamtrace2d';
// =============================================================================
// 3D Exports
// =============================================================================
export { 
// Core types
Vector3, Plane3D, 
// Geometry
Polygon3D, createShoeboxRoom, createQuad, splitPolygon, splitPolygons, clipPolygonByPlane, clipPolygonByPlanes, clipPolygonByFrustum, quickRejectPolygon, polygonMayIntersectVolume, clipRayByPlanes, 
// Structures - BSP
buildBSP, rayTraceBSP, rayOccluded, rayTraceAll, countNodes, treeDepth, 
// Structures - Beam
createBeam3D, constructBeamBoundaryPlanes, isPointInBeam, findBeamViolation, distanceToBeamBoundary, mirrorPointAcrossPolygon, polygonMayBeInBeam, isPolygonFacingSource, beamSolidAngle, 
// Structures - Beam Tree
buildBeamTree3D, collectNodesAtOrder, getNodeOrder, getReflectionPath, countBeamNodes, getBeamTreeStats, clearFailPlanes, iterateNodes, 
// Optimization - Fail Plane
detectFailPlane, propagateFailPlane, isListenerBehindFailPlane, distanceToFailPlane, minDistanceToFailPlanes, updateNodeFailPlane, clearNodeFailPlane, hasFailPlane, 
// Optimization - Skip Sphere
createBuckets3D, isInsideSkipSphere, checkSkipSphere, createSkipSphere, invalidateSkipSphere, clearBucketFailPlanes, updateBucketSkipSphere, processBucketSkipSphere, getSkipSphereStats, DEFAULT_BUCKET_SIZE_3D, 
// Solver
OptimizedSolver3D, computePathLength, computeArrivalTime, getPathReflectionOrder, 
// Convenience classes
Source3D, Listener3D, Solver3D, createRoom } from './beamtrace3d';
//# sourceMappingURL=index.js.map