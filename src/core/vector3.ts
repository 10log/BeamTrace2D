/**
 * 3D Vector operations for BeamTrace3D
 *
 * Vectors are represented as [x, y, z] tuples for performance.
 */

export type Vector3 = [number, number, number];

export const Vector3 = {
  /**
   * Create a new Vector3
   */
  create(x: number, y: number, z: number): Vector3 {
    return [x, y, z];
  },

  /**
   * Create a zero vector
   */
  zero(): Vector3 {
    return [0, 0, 0];
  },

  /**
   * Clone a vector
   */
  clone(v: Vector3): Vector3 {
    return [v[0], v[1], v[2]];
  },

  /**
   * Add two vectors
   */
  add(a: Vector3, b: Vector3): Vector3 {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  },

  /**
   * Subtract vector b from vector a
   */
  subtract(a: Vector3, b: Vector3): Vector3 {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  },

  /**
   * Scale a vector by a scalar
   */
  scale(v: Vector3, s: number): Vector3 {
    return [v[0] * s, v[1] * s, v[2] * s];
  },

  /**
   * Negate a vector
   */
  negate(v: Vector3): Vector3 {
    return [-v[0], -v[1], -v[2]];
  },

  /**
   * Dot product of two vectors
   */
  dot(a: Vector3, b: Vector3): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  },

  /**
   * Cross product of two vectors (a × b)
   */
  cross(a: Vector3, b: Vector3): Vector3 {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
  },

  /**
   * Squared length of a vector
   */
  lengthSquared(v: Vector3): number {
    return v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
  },

  /**
   * Length (magnitude) of a vector
   */
  length(v: Vector3): number {
    return Math.sqrt(Vector3.lengthSquared(v));
  },

  /**
   * Normalize a vector to unit length
   * Returns zero vector if input has zero length
   */
  normalize(v: Vector3): Vector3 {
    const len = Vector3.length(v);
    if (len < 1e-10) return [0, 0, 0];
    return [v[0] / len, v[1] / len, v[2] / len];
  },

  /**
   * Linear interpolation between two vectors
   */
  lerp(a: Vector3, b: Vector3, t: number): Vector3 {
    return [
      a[0] + t * (b[0] - a[0]),
      a[1] + t * (b[1] - a[1]),
      a[2] + t * (b[2] - a[2])
    ];
  },

  /**
   * Distance between two points
   */
  distance(a: Vector3, b: Vector3): number {
    return Vector3.length(Vector3.subtract(a, b));
  },

  /**
   * Squared distance between two points (faster than distance)
   */
  distanceSquared(a: Vector3, b: Vector3): number {
    return Vector3.lengthSquared(Vector3.subtract(a, b));
  },

  /**
   * Check if two vectors are approximately equal
   */
  equals(a: Vector3, b: Vector3, epsilon: number = 1e-10): boolean {
    return Math.abs(a[0] - b[0]) < epsilon &&
           Math.abs(a[1] - b[1]) < epsilon &&
           Math.abs(a[2] - b[2]) < epsilon;
  },

  /**
   * Component-wise minimum
   */
  min(a: Vector3, b: Vector3): Vector3 {
    return [
      Math.min(a[0], b[0]),
      Math.min(a[1], b[1]),
      Math.min(a[2], b[2])
    ];
  },

  /**
   * Component-wise maximum
   */
  max(a: Vector3, b: Vector3): Vector3 {
    return [
      Math.max(a[0], b[0]),
      Math.max(a[1], b[1]),
      Math.max(a[2], b[2])
    ];
  },

  /**
   * Reflect vector v across a plane with given normal
   * v' = v - 2(v·n)n
   */
  reflect(v: Vector3, normal: Vector3): Vector3 {
    const d = 2 * Vector3.dot(v, normal);
    return Vector3.subtract(v, Vector3.scale(normal, d));
  },

  /**
   * Project vector a onto vector b
   */
  project(a: Vector3, b: Vector3): Vector3 {
    const bLenSq = Vector3.lengthSquared(b);
    if (bLenSq < 1e-10) return [0, 0, 0];
    const scale = Vector3.dot(a, b) / bLenSq;
    return Vector3.scale(b, scale);
  },

  /**
   * Get the component of a perpendicular to b
   */
  reject(a: Vector3, b: Vector3): Vector3 {
    return Vector3.subtract(a, Vector3.project(a, b));
  },

  /**
   * Convert to string for debugging
   */
  toString(v: Vector3, precision: number = 4): string {
    return `[${v[0].toFixed(precision)}, ${v[1].toFixed(precision)}, ${v[2].toFixed(precision)}]`;
  }
};
