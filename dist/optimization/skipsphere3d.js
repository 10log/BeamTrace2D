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
import { Plane3D } from '../core/plane3d';
/**
 * Default bucket size (from paper: 16 nodes per bucket is optimal)
 */
export const DEFAULT_BUCKET_SIZE_3D = 16;
/**
 * Create buckets from leaf nodes
 *
 * Nodes are grouped sequentially into buckets of the specified size.
 *
 * @param leafNodes - Array of leaf beam nodes
 * @param bucketSize - Number of nodes per bucket
 * @returns Array of buckets
 */
export function createBuckets3D(leafNodes, bucketSize = DEFAULT_BUCKET_SIZE_3D) {
    const buckets = [];
    for (let i = 0; i < leafNodes.length; i += bucketSize) {
        buckets.push({
            id: buckets.length,
            nodes: leafNodes.slice(i, Math.min(i + bucketSize, leafNodes.length)),
            skipSphere: null
        });
    }
    return buckets;
}
/**
 * Check if a point is inside a skip sphere
 */
export function isInsideSkipSphere(point, skipSphere) {
    const dist = Vector3.distance(point, skipSphere.center);
    return dist < skipSphere.radius;
}
/**
 * Check skip sphere status for a bucket
 *
 * @param listenerPos - Current listener position
 * @param bucket - The bucket to check
 * @returns 'inside' if listener is inside skip sphere (can skip bucket),
 *          'outside' if listener escaped (must invalidate sphere),
 *          'none' if no skip sphere exists
 */
export function checkSkipSphere(listenerPos, bucket) {
    if (!bucket.skipSphere) {
        return 'none';
    }
    return isInsideSkipSphere(listenerPos, bucket.skipSphere) ? 'inside' : 'outside';
}
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
export function createSkipSphere(listenerPos, nodes) {
    let minDist = Infinity;
    for (const node of nodes) {
        if (!node.failPlane) {
            // Can't create skip sphere if any node doesn't have a fail plane
            return null;
        }
        // Distance to the fail plane (absolute value since we want sphere radius)
        const dist = Math.abs(Plane3D.signedDistance(listenerPos, node.failPlane));
        minDist = Math.min(minDist, dist);
    }
    // Don't create degenerate spheres
    if (minDist === Infinity || minDist <= 1e-10) {
        return null;
    }
    return {
        center: Vector3.clone(listenerPos),
        radius: minDist
    };
}
/**
 * Invalidate a bucket's skip sphere
 *
 * Called when listener escapes the skip sphere.
 */
export function invalidateSkipSphere(bucket) {
    bucket.skipSphere = null;
}
/**
 * Clear all fail planes in a bucket
 *
 * Called when skip sphere is invalidated to force re-evaluation.
 */
export function clearBucketFailPlanes(bucket) {
    for (const node of bucket.nodes) {
        node.failPlane = undefined;
        node.failPlaneType = undefined;
    }
}
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
export function updateBucketSkipSphere(bucket, listenerPos, allFailed) {
    if (!allFailed) {
        // At least one path succeeded, no skip sphere needed
        return false;
    }
    // Check if all nodes have fail planes
    for (const node of bucket.nodes) {
        if (!node.failPlane) {
            return false;
        }
    }
    // Create skip sphere
    bucket.skipSphere = createSkipSphere(listenerPos, bucket.nodes);
    return bucket.skipSphere !== null;
}
export function processBucketSkipSphere(bucket, listenerPos) {
    const status = checkSkipSphere(listenerPos, bucket);
    switch (status) {
        case 'inside':
            // Listener inside skip sphere - skip entire bucket
            return { skip: true, needsRevalidation: false };
        case 'outside':
            // Listener escaped - need to invalidate and reprocess
            invalidateSkipSphere(bucket);
            clearBucketFailPlanes(bucket);
            return { skip: false, needsRevalidation: true };
        case 'none':
        default:
            // No skip sphere - normal processing
            return { skip: false, needsRevalidation: false };
    }
}
export function getSkipSphereStats(buckets) {
    let bucketsWithSphere = 0;
    let totalRadius = 0;
    let minRadius = Infinity;
    let maxRadius = 0;
    for (const bucket of buckets) {
        if (bucket.skipSphere) {
            bucketsWithSphere++;
            totalRadius += bucket.skipSphere.radius;
            minRadius = Math.min(minRadius, bucket.skipSphere.radius);
            maxRadius = Math.max(maxRadius, bucket.skipSphere.radius);
        }
    }
    return {
        totalBuckets: buckets.length,
        bucketsWithSphere,
        averageRadius: bucketsWithSphere > 0 ? totalRadius / bucketsWithSphere : 0,
        minRadius: minRadius === Infinity ? 0 : minRadius,
        maxRadius
    };
}
//# sourceMappingURL=skipsphere3d.js.map