/**
 * 3D Vector operations for BeamTrace3D
 *
 * Vectors are represented as [x, y, z] tuples for performance.
 */
export type Vector3 = [number, number, number];
export declare const Vector3: {
    /**
     * Create a new Vector3
     */
    create(x: number, y: number, z: number): Vector3;
    /**
     * Create a zero vector
     */
    zero(): Vector3;
    /**
     * Clone a vector
     */
    clone(v: Vector3): Vector3;
    /**
     * Add two vectors
     */
    add(a: Vector3, b: Vector3): Vector3;
    /**
     * Subtract vector b from vector a
     */
    subtract(a: Vector3, b: Vector3): Vector3;
    /**
     * Scale a vector by a scalar
     */
    scale(v: Vector3, s: number): Vector3;
    /**
     * Negate a vector
     */
    negate(v: Vector3): Vector3;
    /**
     * Dot product of two vectors
     */
    dot(a: Vector3, b: Vector3): number;
    /**
     * Cross product of two vectors (a × b)
     */
    cross(a: Vector3, b: Vector3): Vector3;
    /**
     * Squared length of a vector
     */
    lengthSquared(v: Vector3): number;
    /**
     * Length (magnitude) of a vector
     */
    length(v: Vector3): number;
    /**
     * Normalize a vector to unit length
     * Returns zero vector if input has zero length
     */
    normalize(v: Vector3): Vector3;
    /**
     * Linear interpolation between two vectors
     */
    lerp(a: Vector3, b: Vector3, t: number): Vector3;
    /**
     * Distance between two points
     */
    distance(a: Vector3, b: Vector3): number;
    /**
     * Squared distance between two points (faster than distance)
     */
    distanceSquared(a: Vector3, b: Vector3): number;
    /**
     * Check if two vectors are approximately equal
     */
    equals(a: Vector3, b: Vector3, epsilon?: number): boolean;
    /**
     * Component-wise minimum
     */
    min(a: Vector3, b: Vector3): Vector3;
    /**
     * Component-wise maximum
     */
    max(a: Vector3, b: Vector3): Vector3;
    /**
     * Reflect vector v across a plane with given normal
     * v' = v - 2(v·n)n
     */
    reflect(v: Vector3, normal: Vector3): Vector3;
    /**
     * Project vector a onto vector b
     */
    project(a: Vector3, b: Vector3): Vector3;
    /**
     * Get the component of a perpendicular to b
     */
    reject(a: Vector3, b: Vector3): Vector3;
    /**
     * Convert to string for debugging
     */
    toString(v: Vector3, precision?: number): string;
};
//# sourceMappingURL=vector3.d.ts.map