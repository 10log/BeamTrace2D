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
import type { Point, ReflectionPath } from './beamtrace2d';
import { Wall, Source, Listener } from './beamtrace2d';
import { Line2D, FailLineType } from './geometry';
export type { Line2D, FailLineType };
/**
 * Skip circle for bucket-level spatial rejection
 * In 2D, the skip sphere becomes a skip circle
 */
export interface SkipCircle {
    center: Point;
    radius: number;
}
/**
 * Bucket grouping beam nodes for skip circle optimization
 */
export interface Bucket {
    id: number;
    nodes: OptimizedBeamNode[];
    skipCircle: SkipCircle | null;
}
/**
 * Performance metrics for optimization analysis
 */
export interface PerformanceMetrics {
    totalLeafNodes: number;
    bucketsTotal: number;
    bucketsSkipped: number;
    bucketsChecked: number;
    failLineCacheHits: number;
    failLineCacheMisses: number;
    raycastCount: number;
    skipCircleCount: number;
    validPathCount: number;
}
/**
 * Extended BeamNode with optimization fields
 */
declare class OptimizedBeamNode {
    id: number;
    parent: OptimizedBeamNode | null;
    vs: Point;
    windowP1?: Point | undefined;
    windowP2?: Point | undefined;
    children: OptimizedBeamNode[];
    failLine?: Line2D;
    failLineType?: FailLineType;
    constructor(id: number, parent: OptimizedBeamNode | null, vs: Point, windowP1?: Point | undefined, windowP2?: Point | undefined);
    clearFailLine(): void;
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
export declare class OptimizedSolver {
    private readonly maxOrder;
    private readonly walls;
    private readonly source;
    private readonly bsp;
    private readonly beamTree;
    private readonly buckets;
    private metrics;
    /**
     * @param walls Array of Wall objects defining the environment
     * @param source The sound source position
     * @param reflectionOrder Maximum number of reflections to compute (default: 5)
     * @param bucketSize Number of beam nodes per bucket for skip circle optimization (default: 16)
     */
    constructor(walls: Wall[], source: Source, reflectionOrder?: number, bucketSize?: number);
    /**
     * Get all valid reflection paths from source to listener
     * Uses fail line and skip circle optimizations for accelerated performance
     */
    getPaths(listener: Listener): ReflectionPath[];
    /**
     * Find paths from non-leaf nodes (direct path and intermediate reflections)
     */
    private findNonLeafPaths;
    /**
     * Validate a path with fail line detection and caching
     *
     * For correctness, we use the same validation logic as the basic solver.
     * The fail line optimization is applied AFTER validation fails, to cache
     * the geometric reason for the failure. This ensures we never reject
     * paths that the basic solver would accept.
     */
    private validatePathOptimized;
    /**
     * Traverse the beam at the given node (for non-leaf paths)
     */
    private traverseBeam;
    /**
     * Check intersection with current BSP node
     */
    private checkNodeIntersection;
    /**
     * Ray tracing using BSP tree
     */
    private rayTrace;
    /**
     * Reset performance metrics for a new frame
     */
    private resetMetrics;
    /**
     * Get performance metrics from the last getPaths call
     * Useful for analyzing optimization effectiveness
     */
    getMetrics(): PerformanceMetrics;
    /**
     * Clear all cached fail lines and skip circles
     * Call this when geometry changes significantly
     */
    clearCache(): void;
}
//# sourceMappingURL=optimization.d.ts.map