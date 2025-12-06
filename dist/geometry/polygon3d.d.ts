/**
 * 3D Polygon representation and operations for BeamTrace3D
 *
 * Polygons are convex and stored with counter-clockwise vertex winding
 * when viewed from the front (normal) side.
 */
import { Vector3 } from '../core/vector3';
import { Plane3D } from '../core/plane3d';
import { PolygonClassification } from '../core/types';
/**
 * Convex polygon in 3D space
 */
export interface Polygon3D {
    vertices: Vector3[];
    plane: Plane3D;
    materialId?: number;
}
export declare const Polygon3D: {
    /**
     * Create a polygon from vertices (computes plane automatically)
     * Vertices must be in counter-clockwise order when viewed from front
     */
    create(vertices: Vector3[], materialId?: number): Polygon3D;
    /**
     * Create a polygon with an explicit plane (for split polygons that may be degenerate)
     */
    createWithPlane(vertices: Vector3[], plane: Plane3D, materialId?: number): Polygon3D;
    /**
     * Get the number of vertices
     */
    vertexCount(poly: Polygon3D): number;
    /**
     * Compute the centroid (geometric center) of the polygon
     */
    centroid(poly: Polygon3D): Vector3;
    /**
     * Compute the area of the polygon using cross product method
     */
    area(poly: Polygon3D): number;
    /**
     * Get the normal vector of the polygon (from the plane)
     */
    normal(poly: Polygon3D): Vector3;
    /**
     * Get edges as pairs of vertices [start, end]
     */
    edges(poly: Polygon3D): Array<[Vector3, Vector3]>;
    /**
     * Classify the polygon relative to a plane
     */
    classify(poly: Polygon3D, plane: Plane3D, epsilon?: number): PolygonClassification;
    /**
     * Check if a point is inside the polygon
     * Assumes the point is on (or very close to) the polygon's plane
     */
    containsPoint(poly: Polygon3D, point: Vector3, epsilon?: number): boolean;
    /**
     * Ray-polygon intersection
     * Returns t parameter and intersection point, or null if no hit
     */
    rayIntersection(rayOrigin: Vector3, rayDirection: Vector3, poly: Polygon3D): {
        t: number;
        point: Vector3;
    } | null;
    /**
     * Create a bounding box for the polygon
     */
    boundingBox(poly: Polygon3D): {
        min: Vector3;
        max: Vector3;
    };
    /**
     * Check if polygon is degenerate (zero or near-zero area)
     */
    isDegenerate(poly: Polygon3D, areaThreshold?: number): boolean;
    /**
     * Flip the polygon winding (reverse vertex order and flip plane)
     */
    flip(poly: Polygon3D): Polygon3D;
    /**
     * Clone a polygon
     */
    clone(poly: Polygon3D): Polygon3D;
    /**
     * Convert to string for debugging
     */
    toString(poly: Polygon3D): string;
};
/**
 * Helper to create common room shapes
 */
export declare function createQuad(p1: Vector3, p2: Vector3, p3: Vector3, p4: Vector3, materialId?: number): Polygon3D;
/**
 * Create a shoebox room (6 walls as polygons)
 * Origin is at one corner, room extends in positive x, y, z
 */
export declare function createShoeboxRoom(width: number, // x dimension
depth: number, // y dimension
height: number, // z dimension
floorMaterial?: number, ceilingMaterial?: number, wallMaterial?: number): Polygon3D[];
//# sourceMappingURL=polygon3d.d.ts.map