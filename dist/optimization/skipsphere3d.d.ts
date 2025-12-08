/**
 * Skip Sphere Optimization for BeamTrace3D
 *
 * The skip sphere optimization groups beam leaf nodes into buckets and
 * creates spatial rejection regions that allow skipping entire buckets
 * when the listener is inside the sphere.
 *
 * This is the 3D equivalent of the skip circle optimization from the
 * Laine et al. (2009) paper. When all paths in a bucket fail, a skip
 * sphere is created centered at the listener position with radius
 * equal to the minimum distance to any fail plane in the bucket.
 *
 * The paper found bucket size of 16 to be optimal for performance.
 */
import { Vector3 } from '../core/vector3';
import { BeamNode3D } from '../structures/beamtree3d';
/**
 * Skip sphere for bucket-level spatial rejection
 */
export interface SkipSphere {
    center: Vector3;
    radius: number;
}
/**
 * Bucket grouping beam leaf nodes for skip sphere optimization
 */
export interface Bucket3D {
    id: number;
    nodes: BeamNode3D[];
    skipSphere: SkipSphere | null;
}
/**
 * Default bucket size (from paper: 16 nodes per bucket is optimal)
 */
export declare const DEFAULT_BUCKET_SIZE_3D = 16;
/**
 * Create buckets from leaf nodes
 *
 * Nodes are grouped sequentially into buckets of the specified size.
 *
 * @param leafNodes - Array of leaf beam nodes
 * @param bucketSize - Number of nodes per bucket
 * @returns Array of buckets
 */
export declare function createBuckets3D(leafNodes: BeamNode3D[], bucketSize?: number): Bucket3D[];
/**
 * Check if a point is inside a skip sphere
 */
export declare function isInsideSkipSphere(point: Vector3, skipSphere: SkipSphere): boolean;
/**
 * Skip sphere status for a bucket
 */
export type SkipSphereStatus = 'inside' | 'outside' | 'none';
/**
 * Check skip sphere status for a bucket
 *
 * @param listenerPos - Current listener position
 * @param bucket - The bucket to check
 * @returns 'inside' if listener is inside skip sphere (can skip bucket),
 *          'outside' if listener escaped (must invalidate sphere),
 *          'none' if no skip sphere exists
 */
export declare function checkSkipSphere(listenerPos: Vector3, bucket: Bucket3D): SkipSphereStatus;
/**
 * Create a skip sphere for a bucket where all paths failed
 *
 * The radius is the minimum distance to any fail plane in the bucket.
 * This ensures that as long as the listener stays inside the sphere,
 * it will still be behind all fail planes and all paths will still fail.
 *
 * @param listenerPos - Current listener position (center of sphere)
 * @param nodes - Nodes in the bucket (all should have fail planes)
 * @returns Skip sphere, or null if any node lacks a fail plane
 */
export declare function createSkipSphere(listenerPos: Vector3, nodes: BeamNode3D[]): SkipSphere | null;
/**
 * Invalidate a bucket's skip sphere
 *
 * Called when listener escapes the skip sphere.
 */
export declare function invalidateSkipSphere(bucket: Bucket3D): void;
/**
 * Clear all fail planes in a bucket
 *
 * Called when skip sphere is invalidated to force re-evaluation.
 */
export declare function clearBucketFailPlanes(bucket: Bucket3D): void;
/**
 * Update skip sphere for a bucket after processing
 *
 * If all paths in the bucket failed and all have fail planes,
 * create a skip sphere for future optimization.
 *
 * @param bucket - The bucket to update
 * @param listenerPos - Current listener position
 * @param allFailed - Whether all paths in bucket failed
 * @returns true if skip sphere was created
 */
export declare function updateBucketSkipSphere(bucket: Bucket3D, listenerPos: Vector3, allFailed: boolean): boolean;
/**
 * Process a bucket with skip sphere optimization
 *
 * Returns information about whether the bucket can be skipped
 * and whether it needs full processing.
 *
 * @param bucket - The bucket to process
 * @param listenerPos - Current listener position
 * @returns Processing decision
 */
export interface BucketProcessingResult {
    skip: boolean;
    needsRevalidation: boolean;
}
export declare function processBucketSkipSphere(bucket: Bucket3D, listenerPos: Vector3): BucketProcessingResult;
/**
 * Get statistics about skip sphere usage
 */
export interface SkipSphereStats {
    totalBuckets: number;
    bucketsWithSphere: number;
    averageRadius: number;
    minRadius: number;
    maxRadius: number;
}
export declare function getSkipSphereStats(buckets: Bucket3D[]): SkipSphereStats;
//# sourceMappingURL=skipsphere3d.d.ts.map