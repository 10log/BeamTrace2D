/**
 * 3D Polygon representation and operations for BeamTrace3D
 *
 * Polygons are convex and stored with counter-clockwise vertex winding
 * when viewed from the front (normal) side.
 */
import { Vector3 } from '../core/vector3';
import { Plane3D } from '../core/plane3d';
export const Polygon3D = {
    /**
     * Create a polygon from vertices (computes plane automatically)
     * Vertices must be in counter-clockwise order when viewed from front
     */
    create(vertices, materialId) {
        if (vertices.length < 3) {
            throw new Error('Polygon requires at least 3 vertices');
        }
        // Clone vertices to prevent external mutation
        const verts = vertices.map(v => Vector3.clone(v));
        const plane = Plane3D.fromPoints(verts[0], verts[1], verts[2]);
        return { vertices: verts, plane, materialId };
    },
    /**
     * Create a polygon with an explicit plane (for split polygons that may be degenerate)
     */
    createWithPlane(vertices, plane, materialId) {
        if (vertices.length < 3) {
            throw new Error('Polygon requires at least 3 vertices');
        }
        const verts = vertices.map(v => Vector3.clone(v));
        return { vertices: verts, plane, materialId };
    },
    /**
     * Get the number of vertices
     */
    vertexCount(poly) {
        return poly.vertices.length;
    },
    /**
     * Compute the centroid (geometric center) of the polygon
     */
    centroid(poly) {
        const sum = [0, 0, 0];
        for (const v of poly.vertices) {
            sum[0] += v[0];
            sum[1] += v[1];
            sum[2] += v[2];
        }
        const n = poly.vertices.length;
        return [sum[0] / n, sum[1] / n, sum[2] / n];
    },
    /**
     * Compute the area of the polygon using cross product method
     */
    area(poly) {
        if (poly.vertices.length < 3)
            return 0;
        let total = [0, 0, 0];
        const v0 = poly.vertices[0];
        for (let i = 1; i < poly.vertices.length - 1; i++) {
            const v1 = poly.vertices[i];
            const v2 = poly.vertices[i + 1];
            const cross = Vector3.cross(Vector3.subtract(v1, v0), Vector3.subtract(v2, v0));
            total = Vector3.add(total, cross);
        }
        return 0.5 * Vector3.length(total);
    },
    /**
     * Get the normal vector of the polygon (from the plane)
     */
    normal(poly) {
        return Plane3D.normal(poly.plane);
    },
    /**
     * Get edges as pairs of vertices [start, end]
     */
    edges(poly) {
        const result = [];
        for (let i = 0; i < poly.vertices.length; i++) {
            const next = (i + 1) % poly.vertices.length;
            result.push([poly.vertices[i], poly.vertices[next]]);
        }
        return result;
    },
    /**
     * Classify the polygon relative to a plane
     */
    classify(poly, plane, epsilon = 1e-6) {
        let front = 0;
        let back = 0;
        for (const v of poly.vertices) {
            const classification = Plane3D.classifyPoint(v, plane, epsilon);
            if (classification === 'front')
                front++;
            else if (classification === 'back')
                back++;
        }
        if (front > 0 && back > 0)
            return 'spanning';
        if (front > 0)
            return 'front';
        if (back > 0)
            return 'back';
        return 'coplanar';
    },
    /**
     * Check if a point is inside the polygon
     * Assumes the point is on (or very close to) the polygon's plane
     */
    containsPoint(poly, point, epsilon = 1e-6) {
        const normal = Plane3D.normal(poly.plane);
        const n = poly.vertices.length;
        for (let i = 0; i < n; i++) {
            const v1 = poly.vertices[i];
            const v2 = poly.vertices[(i + 1) % n];
            const edge = Vector3.subtract(v2, v1);
            const toPoint = Vector3.subtract(point, v1);
            const cross = Vector3.cross(edge, toPoint);
            // If cross product points opposite to normal, point is outside this edge
            if (Vector3.dot(cross, normal) < -epsilon) {
                return false;
            }
        }
        return true;
    },
    /**
     * Ray-polygon intersection
     * Returns t parameter and intersection point, or null if no hit
     */
    rayIntersection(rayOrigin, rayDirection, poly) {
        const t = Plane3D.rayIntersection(rayOrigin, rayDirection, poly.plane);
        if (t === null || t < 0) {
            return null;
        }
        const point = Vector3.add(rayOrigin, Vector3.scale(rayDirection, t));
        if (!Polygon3D.containsPoint(poly, point)) {
            return null;
        }
        return { t, point };
    },
    /**
     * Create a bounding box for the polygon
     */
    boundingBox(poly) {
        const min = [Infinity, Infinity, Infinity];
        const max = [-Infinity, -Infinity, -Infinity];
        for (const v of poly.vertices) {
            min[0] = Math.min(min[0], v[0]);
            min[1] = Math.min(min[1], v[1]);
            min[2] = Math.min(min[2], v[2]);
            max[0] = Math.max(max[0], v[0]);
            max[1] = Math.max(max[1], v[1]);
            max[2] = Math.max(max[2], v[2]);
        }
        return { min, max };
    },
    /**
     * Check if polygon is degenerate (zero or near-zero area)
     */
    isDegenerate(poly, areaThreshold = 1e-10) {
        return poly.vertices.length < 3 || Polygon3D.area(poly) < areaThreshold;
    },
    /**
     * Flip the polygon winding (reverse vertex order and flip plane)
     */
    flip(poly) {
        const reversedVerts = [...poly.vertices].reverse();
        const flippedPlane = Plane3D.flip(poly.plane);
        return {
            vertices: reversedVerts,
            plane: flippedPlane,
            materialId: poly.materialId
        };
    },
    /**
     * Clone a polygon
     */
    clone(poly) {
        return {
            vertices: poly.vertices.map(v => Vector3.clone(v)),
            plane: { ...poly.plane },
            materialId: poly.materialId
        };
    },
    /**
     * Convert to string for debugging
     */
    toString(poly) {
        const verts = poly.vertices.map(v => Vector3.toString(v, 2)).join(', ');
        return `Polygon3D(${poly.vertices.length} vertices: [${verts}])`;
    }
};
/**
 * Helper to create common room shapes
 */
export function createQuad(p1, p2, p3, p4, materialId) {
    return Polygon3D.create([p1, p2, p3, p4], materialId);
}
/**
 * Create a shoebox room (6 walls as polygons)
 * Origin is at one corner, room extends in positive x, y, z
 */
export function createShoeboxRoom(width, // x dimension
depth, // y dimension
height, // z dimension
floorMaterial, ceilingMaterial, wallMaterial) {
    // Corners
    const v000 = [0, 0, 0];
    const v100 = [width, 0, 0];
    const v010 = [0, depth, 0];
    const v110 = [width, depth, 0];
    const v001 = [0, 0, height];
    const v101 = [width, 0, height];
    const v011 = [0, depth, height];
    const v111 = [width, depth, height];
    return [
        // Floor (normal pointing up, CCW when viewed from above)
        Polygon3D.create([v000, v100, v110, v010], floorMaterial),
        // Ceiling (normal pointing down, CCW when viewed from below)
        Polygon3D.create([v001, v011, v111, v101], ceilingMaterial),
        // Front wall (y = 0, normal pointing +y)
        Polygon3D.create([v000, v001, v101, v100], wallMaterial),
        // Back wall (y = depth, normal pointing -y)
        Polygon3D.create([v010, v110, v111, v011], wallMaterial),
        // Left wall (x = 0, normal pointing +x)
        Polygon3D.create([v000, v010, v011, v001], wallMaterial),
        // Right wall (x = width, normal pointing -x)
        Polygon3D.create([v100, v101, v111, v110], wallMaterial)
    ];
}
//# sourceMappingURL=polygon3d.js.map