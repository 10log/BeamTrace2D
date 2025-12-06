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
export declare function clipPolygonByPlane(poly: Polygon3D, plane: Plane3D, epsilon?: number): Polygon3D | null;
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
export declare function clipPolygonByPlanes(poly: Polygon3D, planes: Plane3D[], epsilon?: number): Polygon3D | null;
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
export declare function quickRejectPolygon(poly: Polygon3D, planes: Plane3D[], epsilon?: number): boolean;
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
export declare function polygonMayIntersectVolume(poly: Polygon3D, planes: Plane3D[], epsilon?: number): boolean;
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
export declare function clipPolygonByFrustum(poly: Polygon3D, frustumPlanes: Plane3D[], epsilon?: number): Polygon3D | null;
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
export declare function clipRayByPlanes(rayOrigin: Vector3, rayDirection: Vector3, planes: Plane3D[], tStart?: number, tEnd?: number): {
    tMin: number;
    tMax: number;
} | null;
//# sourceMappingURL=clipping3d.d.ts.map