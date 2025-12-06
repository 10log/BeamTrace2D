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
import { ReflectionPath3D } from '../core/types';
import { Polygon3D } from '../geometry/polygon3d';
/**
 * Performance metrics for the solver
 */
export interface PerformanceMetrics3D {
    totalLeafNodes: number;
    bucketsTotal: number;
    bucketsSkipped: number;
    bucketsChecked: number;
    failPlaneCacheHits: number;
    failPlaneCacheMisses: number;
    raycastCount: number;
    skipSphereCount: number;
    validPathCount: number;
}
/**
 * Configuration options for the solver
 */
export interface OptimizedSolver3DConfig {
    maxReflectionOrder?: number;
    bucketSize?: number;
}
/**
 * Data for visualizing a single beam cone
 */
export interface BeamVisualizationData {
    virtualSource: Vector3;
    apertureVertices: Vector3[];
    reflectionOrder: number;
    polygonId: number;
}
/**
 * Optimized 3D Beam Tracing Solver
 *
 * Provides efficient acoustic path finding using:
 * - BSP tree for O(log n) ray-polygon intersection
 * - Beam tree for reflection path enumeration
 * - Fail plane caching for O(1) early rejection
 * - Skip sphere bucketing for spatial acceleration
 */
export declare class OptimizedSolver3D {
    private readonly polygons;
    private readonly sourcePosition;
    private readonly bspRoot;
    private readonly beamTree;
    private readonly buckets;
    private metrics;
    /**
     * Create a new 3D beam tracing solver
     *
     * @param polygons - Room geometry as an array of polygons
     * @param sourcePosition - Position of the sound source
     * @param config - Optional configuration
     */
    constructor(polygons: Polygon3D[], sourcePosition: Vector3, config?: OptimizedSolver3DConfig);
    /**
     * Get all valid reflection paths from source to listener
     *
     * @param listenerPos - Position of the listener
     * @returns Array of valid reflection paths
     */
    getPaths(listenerPos: Vector3): ReflectionPath3D[];
    /**
     * Validate the direct path from listener to source
     */
    private validateDirectPath;
    /**
     * Find paths through intermediate (non-leaf) nodes
     *
     * These are lower-order reflections that didn't spawn further children.
     */
    private findIntermediatePaths;
    /**
     * Traverse a beam from listener to source, building the reflection path
     */
    private traverseBeam;
    /**
     * Validate a path through a beam node
     */
    private validatePath;
    /**
     * Get performance metrics from the last getPaths() call
     */
    getMetrics(): PerformanceMetrics3D;
    /**
     * Clear all cached fail planes and skip spheres
     *
     * Call this if the room geometry changes.
     */
    clearCache(): void;
    /**
     * Get the number of leaf nodes in the beam tree
     */
    getLeafNodeCount(): number;
    /**
     * Get the maximum reflection order
     */
    getMaxReflectionOrder(): number;
    /**
     * Get the source position
     */
    getSourcePosition(): Vector3;
    /**
     * Get beam data for visualization
     * Returns beams organized by reflection order
     */
    getBeamsForVisualization(maxOrder?: number): BeamVisualizationData[];
    /**
     * Create empty metrics object
     */
    private createEmptyMetrics;
    /**
     * Reset metrics for a new getPaths() call
     */
    private resetMetrics;
}
/**
 * Compute the total path length of a reflection path
 */
export declare function computePathLength(path: ReflectionPath3D): number;
/**
 * Compute arrival time for a path (assuming speed of sound)
 */
export declare function computeArrivalTime(path: ReflectionPath3D, speedOfSound?: number): number;
/**
 * Get the reflection order of a path (number of reflections)
 */
export declare function getPathReflectionOrder(path: ReflectionPath3D): number;
//# sourceMappingURL=solver3d.d.ts.map