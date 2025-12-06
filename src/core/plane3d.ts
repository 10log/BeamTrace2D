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
  a: number;  // Normal x component
  b: number;  // Normal y component
  c: number;  // Normal z component
  d: number;  // Distance term (d = -dot(normal, pointOnPlane))
}

export const Plane3D = {
  /**
   * Create a plane from a normal vector and a point on the plane
   */
  fromNormalAndPoint(normal: Vector3, point: Vector3): Plane3D {
    const n = Vector3.normalize(normal);
    const d = -Vector3.dot(n, point);
    return { a: n[0], b: n[1], c: n[2], d };
  },

  /**
   * Create a plane from three non-collinear points
   * Uses counter-clockwise winding order: normal points toward viewer when
   * p1 → p2 → p3 appears counter-clockwise
   */
  fromPoints(p1: Vector3, p2: Vector3, p3: Vector3): Plane3D {
    const v1 = Vector3.subtract(p2, p1);
    const v2 = Vector3.subtract(p3, p1);
    const normal = Vector3.normalize(Vector3.cross(v1, v2));
    return Plane3D.fromNormalAndPoint(normal, p1);
  },

  /**
   * Create a plane directly from coefficients
   */
  create(a: number, b: number, c: number, d: number): Plane3D {
    return { a, b, c, d };
  },

  /**
   * Get the normal vector of the plane
   */
  normal(plane: Plane3D): Vector3 {
    return [plane.a, plane.b, plane.c];
  },

  /**
   * Signed distance from a point to the plane
   * Positive = point is in front (on normal side)
   * Negative = point is behind
   * Zero = point is on the plane
   */
  signedDistance(point: Vector3, plane: Plane3D): number {
    return plane.a * point[0] + plane.b * point[1] + plane.c * point[2] + plane.d;
  },

  /**
   * Absolute distance from a point to the plane
   */
  distance(point: Vector3, plane: Plane3D): number {
    return Math.abs(Plane3D.signedDistance(point, plane));
  },

  /**
   * Classify a point relative to the plane
   */
  classifyPoint(point: Vector3, plane: Plane3D, epsilon: number = 1e-6): PointClassification {
    const dist = Plane3D.signedDistance(point, plane);
    if (dist > epsilon) return 'front';
    if (dist < -epsilon) return 'back';
    return 'on';
  },

  /**
   * Check if a point is in front of the plane
   */
  isPointInFront(point: Vector3, plane: Plane3D, epsilon: number = 1e-6): boolean {
    return Plane3D.signedDistance(point, plane) > epsilon;
  },

  /**
   * Check if a point is behind the plane
   */
  isPointBehind(point: Vector3, plane: Plane3D, epsilon: number = 1e-6): boolean {
    return Plane3D.signedDistance(point, plane) < -epsilon;
  },

  /**
   * Check if a point is on the plane
   */
  isPointOn(point: Vector3, plane: Plane3D, epsilon: number = 1e-6): boolean {
    return Math.abs(Plane3D.signedDistance(point, plane)) <= epsilon;
  },

  /**
   * Mirror a point across the plane
   * p' = p - 2 * signedDistance(p) * normal
   */
  mirrorPoint(point: Vector3, plane: Plane3D): Vector3 {
    const dist = Plane3D.signedDistance(point, plane);
    const normal = Plane3D.normal(plane);
    return Vector3.subtract(point, Vector3.scale(normal, 2 * dist));
  },

  /**
   * Mirror a plane across another plane (for fail plane propagation)
   * This mirrors two points on the source plane and reconstructs.
   */
  mirrorPlane(planeToMirror: Plane3D, mirrorPlane: Plane3D): Plane3D {
    const n = Plane3D.normal(planeToMirror);

    // Find a point on planeToMirror
    let p1: Vector3;
    if (Math.abs(n[2]) > 0.5) {
      p1 = [0, 0, -planeToMirror.d / planeToMirror.c];
    } else if (Math.abs(n[1]) > 0.5) {
      p1 = [0, -planeToMirror.d / planeToMirror.b, 0];
    } else {
      p1 = [-planeToMirror.d / planeToMirror.a, 0, 0];
    }

    // Second point offset along a tangent
    const offset: Vector3 = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const tangent = Vector3.normalize(Vector3.cross(n, offset));
    const p2 = Vector3.add(p1, tangent);

    // Third point along bitangent
    const bitangent = Vector3.cross(n, tangent);
    const p3 = Vector3.add(p1, bitangent);

    // Mirror all three points
    const p1m = Plane3D.mirrorPoint(p1, mirrorPlane);
    const p2m = Plane3D.mirrorPoint(p2, mirrorPlane);
    const p3m = Plane3D.mirrorPoint(p3, mirrorPlane);

    return Plane3D.fromPoints(p1m, p2m, p3m);
  },

  /**
   * Flip the plane orientation (negate normal and d)
   */
  flip(plane: Plane3D): Plane3D {
    return { a: -plane.a, b: -plane.b, c: -plane.c, d: -plane.d };
  },

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
  rayIntersection(
    rayOrigin: Vector3,
    rayDirection: Vector3,
    plane: Plane3D
  ): number | null {
    const normal = Plane3D.normal(plane);
    const denom = Vector3.dot(normal, rayDirection);

    if (Math.abs(denom) < 1e-10) {
      return null; // Ray is parallel to plane
    }

    const t = -(Vector3.dot(normal, rayOrigin) + plane.d) / denom;
    return t;
  },

  /**
   * Get the point of intersection between a ray and plane
   */
  rayIntersectionPoint(
    rayOrigin: Vector3,
    rayDirection: Vector3,
    plane: Plane3D
  ): Vector3 | null {
    const t = Plane3D.rayIntersection(rayOrigin, rayDirection, plane);
    if (t === null) return null;
    return Vector3.add(rayOrigin, Vector3.scale(rayDirection, t));
  },

  /**
   * Project a point onto the plane
   */
  projectPoint(point: Vector3, plane: Plane3D): Vector3 {
    const dist = Plane3D.signedDistance(point, plane);
    const normal = Plane3D.normal(plane);
    return Vector3.subtract(point, Vector3.scale(normal, dist));
  },

  /**
   * Check if two planes are approximately equal
   */
  equals(a: Plane3D, b: Plane3D, epsilon: number = 1e-6): boolean {
    // Planes are equal if normals are parallel and d values are equal (or negated)
    const dotNormals = a.a * b.a + a.b * b.b + a.c * b.c;

    if (Math.abs(dotNormals - 1) < epsilon) {
      // Same orientation
      return Math.abs(a.d - b.d) < epsilon;
    }

    if (Math.abs(dotNormals + 1) < epsilon) {
      // Opposite orientation
      return Math.abs(a.d + b.d) < epsilon;
    }

    return false;
  },

  /**
   * Convert to string for debugging
   */
  toString(plane: Plane3D, precision: number = 4): string {
    return `Plane3D(${plane.a.toFixed(precision)}x + ${plane.b.toFixed(precision)}y + ${plane.c.toFixed(precision)}z + ${plane.d.toFixed(precision)} = 0)`;
  }
};
