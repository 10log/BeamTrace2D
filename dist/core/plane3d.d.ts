/**
 * 3D Plane representation and operations for BeamTrace3D
 *
 * Plane is represented in implicit form: ax + by + cz + d = 0
 * where [a, b, c] is the normalized normal vector and d is the distance term.
 *
 * Points in front of the plane (positive side) satisfy ax + by + cz + d > 0
 */
import { Vector3 } from './vector3';
import { PointClassification } from './types';
/**
 * 3D Plane in implicit form: ax + by + cz + d = 0
 */
export interface Plane3D {
    a: number;
    b: number;
    c: number;
    d: number;
}
export declare const Plane3D: {
    /**
     * Create a plane from a normal vector and a point on the plane
     */
    fromNormalAndPoint(normal: Vector3, point: Vector3): Plane3D;
    /**
     * Create a plane from three non-collinear points
     * Uses counter-clockwise winding order: normal points toward viewer when
     * p1 → p2 → p3 appears counter-clockwise
     */
    fromPoints(p1: Vector3, p2: Vector3, p3: Vector3): Plane3D;
    /**
     * Create a plane directly from coefficients
     */
    create(a: number, b: number, c: number, d: number): Plane3D;
    /**
     * Get the normal vector of the plane
     */
    normal(plane: Plane3D): Vector3;
    /**
     * Signed distance from a point to the plane
     * Positive = point is in front (on normal side)
     * Negative = point is behind
     * Zero = point is on the plane
     */
    signedDistance(point: Vector3, plane: Plane3D): number;
    /**
     * Absolute distance from a point to the plane
     */
    distance(point: Vector3, plane: Plane3D): number;
    /**
     * Classify a point relative to the plane
     */
    classifyPoint(point: Vector3, plane: Plane3D, epsilon?: number): PointClassification;
    /**
     * Check if a point is in front of the plane
     */
    isPointInFront(point: Vector3, plane: Plane3D, epsilon?: number): boolean;
    /**
     * Check if a point is behind the plane
     */
    isPointBehind(point: Vector3, plane: Plane3D, epsilon?: number): boolean;
    /**
     * Check if a point is on the plane
     */
    isPointOn(point: Vector3, plane: Plane3D, epsilon?: number): boolean;
    /**
     * Mirror a point across the plane
     * p' = p - 2 * signedDistance(p) * normal
     */
    mirrorPoint(point: Vector3, plane: Plane3D): Vector3;
    /**
     * Mirror a plane across another plane (for fail plane propagation)
     * This mirrors two points on the source plane and reconstructs.
     */
    mirrorPlane(planeToMirror: Plane3D, mirrorPlane: Plane3D): Plane3D;
    /**
     * Flip the plane orientation (negate normal and d)
     */
    flip(plane: Plane3D): Plane3D;
    /**
     * Ray-plane intersection
     *
     * Returns the t parameter along the ray where intersection occurs,
     * or null if the ray is parallel to the plane.
     *
     * Point of intersection = rayOrigin + t * rayDirection
     *
     * @param rayOrigin - Starting point of the ray
     * @param rayDirection - Direction of the ray (should be normalized for t to represent distance)
     * @param plane - The plane to intersect with
     */
    rayIntersection(rayOrigin: Vector3, rayDirection: Vector3, plane: Plane3D): number | null;
    /**
     * Get the point of intersection between a ray and plane
     */
    rayIntersectionPoint(rayOrigin: Vector3, rayDirection: Vector3, plane: Plane3D): Vector3 | null;
    /**
     * Project a point onto the plane
     */
    projectPoint(point: Vector3, plane: Plane3D): Vector3;
    /**
     * Check if two planes are approximately equal
     */
    equals(a: Plane3D, b: Plane3D, epsilon?: number): boolean;
    /**
     * Convert to string for debugging
     */
    toString(plane: Plane3D, precision?: number): string;
};
//# sourceMappingURL=plane3d.d.ts.map