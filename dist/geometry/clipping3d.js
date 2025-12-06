/**
 * 3D Polygon clipping using Sutherland-Hodgman algorithm
 *
 * This is the critical algorithm for clipping polygons against beam boundaries.
 * Clips a polygon against one or more planes, keeping the portion on the
 * front (positive) side of each plane.
 */
import { Vector3 } from '../core/vector3';
import { Plane3D } from '../core/plane3d';
import { Polygon3D } from './polygon3d';
/**
 * Clip a polygon against a single plane using Sutherland-Hodgman algorithm
 *
 * Keeps the portion on the FRONT side of the plane (where signedDistance > 0)
 *
 * @param poly - The polygon to clip
 * @param plane - The clipping plane (normal points toward kept region)
 * @param epsilon - Tolerance for point-on-plane classification
 * @returns The clipped polygon, or null if entirely clipped away
 */
export function clipPolygonByPlane(poly, plane, epsilon = 1e-6) {
    const input = poly.vertices;
    const output = [];
    if (input.length < 3)
        return null;
    for (let i = 0; i < input.length; i++) {
        const current = input[i];
        const next = input[(i + 1) % input.length];
        const dCurrent = Plane3D.signedDistance(current, plane);
        const dNext = Plane3D.signedDistance(next, plane);
        // Inside = on front side of plane (dCurrent >= -epsilon)
        const currentInside = dCurrent >= -epsilon;
        const nextInside = dNext >= -epsilon;
        if (currentInside) {
            // Current vertex is inside - add it
            output.push(current);
        }
        // Check for edge crossing
        if ((currentInside && !nextInside) || (!currentInside && nextInside)) {
            // Edge crosses the plane - compute intersection
            const t = dCurrent / (dCurrent - dNext);
            const intersection = Vector3.lerp(current, next, Math.max(0, Math.min(1, t)));
            output.push(intersection);
        }
    }
    if (output.length < 3)
        return null;
    return Polygon3D.createWithPlane(output, poly.plane, poly.materialId);
}
/**
 * Clip a polygon against multiple planes (e.g., beam boundaries)
 *
 * The polygon must be on the front side of ALL planes to survive.
 * This is iterative Sutherland-Hodgman clipping.
 *
 * @param poly - The polygon to clip
 * @param planes - Array of clipping planes
 * @param epsilon - Tolerance for classification
 * @returns The clipped polygon, or null if entirely clipped away
 */
export function clipPolygonByPlanes(poly, planes, epsilon = 1e-6) {
    let current = poly;
    for (const plane of planes) {
        if (!current)
            return null;
        current = clipPolygonByPlane(current, plane, epsilon);
    }
    return current;
}
/**
 * Quick rejection test - check if polygon is entirely outside any clipping plane
 *
 * This is faster than full clipping when we only need to know if the result
 * would be non-empty.
 *
 * @param poly - The polygon to test
 * @param planes - Array of clipping planes
 * @param epsilon - Tolerance for classification
 * @returns true if polygon is entirely outside at least one plane
 */
export function quickRejectPolygon(poly, planes, epsilon = 1e-6) {
    for (const plane of planes) {
        let allBehind = true;
        for (const v of poly.vertices) {
            if (Plane3D.signedDistance(v, plane) >= -epsilon) {
                allBehind = false;
                break;
            }
        }
        if (allBehind) {
            return true; // Polygon is entirely behind this plane
        }
    }
    return false;
}
/**
 * Check if a polygon potentially intersects a convex volume defined by planes
 *
 * Returns false if the polygon is definitely outside the volume.
 * Returns true if it might be inside (requires full clipping to confirm).
 *
 * @param poly - The polygon to test
 * @param planes - Array of planes defining the convex volume (normals point inward)
 * @param epsilon - Tolerance for classification
 */
export function polygonMayIntersectVolume(poly, planes, epsilon = 1e-6) {
    // Polygon is definitely outside if all vertices are behind any single plane
    return !quickRejectPolygon(poly, planes, epsilon);
}
/**
 * Clip a polygon against a frustum (beam volume)
 *
 * A frustum is defined by multiple boundary planes. For beam tracing,
 * this is typically N edge planes + 1 aperture plane.
 *
 * @param poly - The polygon to clip
 * @param frustumPlanes - Array of planes defining the frustum (normals point inward)
 * @param epsilon - Tolerance for classification
 * @returns The clipped polygon, or null if entirely outside the frustum
 */
export function clipPolygonByFrustum(poly, frustumPlanes, epsilon = 1e-6) {
    // Quick rejection first
    if (quickRejectPolygon(poly, frustumPlanes, epsilon)) {
        return null;
    }
    // Full clip
    return clipPolygonByPlanes(poly, frustumPlanes, epsilon);
}
/**
 * Clip a ray segment against a convex volume defined by planes
 *
 * Returns the clipped segment [tMin, tMax] or null if ray misses the volume.
 *
 * @param rayOrigin - Start of the ray
 * @param rayDirection - Direction of the ray (normalized)
 * @param planes - Planes defining the convex volume (normals point inward)
 * @param tStart - Starting t value (default 0)
 * @param tEnd - Ending t value (default Infinity)
 */
export function clipRayByPlanes(rayOrigin, rayDirection, planes, tStart = 0, tEnd = Infinity) {
    let tMin = tStart;
    let tMax = tEnd;
    for (const plane of planes) {
        const normal = Plane3D.normal(plane);
        const denom = Vector3.dot(normal, rayDirection);
        const dist = Plane3D.signedDistance(rayOrigin, plane);
        if (Math.abs(denom) < 1e-10) {
            // Ray parallel to plane
            if (dist < 0) {
                // Ray origin is behind the plane - ray is outside
                return null;
            }
            // Ray origin is in front - continue
            continue;
        }
        const t = -dist / denom;
        if (denom > 0) {
            // Ray is going in the direction of the normal
            if (dist >= 0) {
                // Starting in front, ray goes further in front - no exit through this plane
                // (t would be negative, meaning the plane is behind us)
                // No constraint needed
            }
            else {
                // Starting behind, ray will enter at t
                tMin = Math.max(tMin, t);
            }
        }
        else {
            // Ray is going against the normal (denom < 0)
            if (dist >= 0) {
                // Starting in front, ray goes toward the plane and will exit at t
                tMax = Math.min(tMax, t);
            }
            else {
                // Starting behind, going further behind - ray never enters
                return null;
            }
        }
        if (tMin > tMax) {
            return null; // Ray misses the volume
        }
    }
    // Make sure tMax is positive (ray goes forward)
    if (tMax < 0) {
        return null;
    }
    // Clamp tMin to 0 if it's negative
    tMin = Math.max(0, tMin);
    if (tMin > tMax) {
        return null;
    }
    return { tMin, tMax };
}
//# sourceMappingURL=clipping3d.js.map