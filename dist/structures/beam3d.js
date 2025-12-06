/**
 * 3D Beam representation for BeamTrace3D
 *
 * A 3D beam is a polyhedral cone from a virtual source through an aperture polygon.
 * It is bounded by N+1 planes:
 * - N planes (one per aperture edge), with normals pointing INTO the beam
 * - 1 aperture plane, with normal pointing toward the source (INTO the beam)
 */
import { Vector3 } from '../core/vector3';
import { Plane3D } from '../core/plane3d';
import { Polygon3D } from '../geometry/polygon3d';
/**
 * Construct boundary planes for a 3D beam
 *
 * All normals are oriented to point INTO the beam volume.
 * This means a point is inside the beam if it's on the front side
 * (positive signed distance) of all boundary planes.
 *
 * @param virtualSource - The virtual source position
 * @param aperture - The aperture polygon
 * @returns Array of boundary planes (N edge planes + 1 aperture plane)
 */
export function constructBeamBoundaryPlanes(virtualSource, aperture) {
    const planes = [];
    const edges = Polygon3D.edges(aperture);
    const apertureCentroid = Polygon3D.centroid(aperture);
    // Create a plane for each edge of the aperture
    // Each plane passes through the virtual source and the edge vertices
    for (const [v1, v2] of edges) {
        // Create plane through virtualSource, v1, v2
        // The winding order determines the normal direction
        let edgePlane = Plane3D.fromPoints(virtualSource, v1, v2);
        // Ensure normal points INTO the beam (toward aperture centroid)
        if (Plane3D.signedDistance(apertureCentroid, edgePlane) < 0) {
            edgePlane = Plane3D.flip(edgePlane);
        }
        planes.push(edgePlane);
    }
    // Aperture plane - normal should point AWAY from source (toward the "open" side of beam)
    // This allows polygons beyond the aperture to be considered inside the beam
    let aperturePlane = aperture.plane;
    if (Plane3D.signedDistance(virtualSource, aperturePlane) > 0) {
        aperturePlane = Plane3D.flip(aperturePlane);
    }
    planes.push(aperturePlane);
    return planes;
}
/**
 * Create a Beam3D from virtual source and aperture
 */
export function createBeam3D(virtualSource, aperture, reflectingPolygonId) {
    return {
        virtualSource,
        aperture,
        boundaryPlanes: constructBeamBoundaryPlanes(virtualSource, aperture),
        reflectingPolygonId
    };
}
/**
 * Check if a point is inside the beam volume
 *
 * A point is inside if it's on the front (positive) side of all boundary planes.
 *
 * @param point - The point to test
 * @param beam - The beam to test against
 * @param epsilon - Tolerance for boundary tests
 */
export function isPointInBeam(point, beam, epsilon = 1e-6) {
    for (const plane of beam.boundaryPlanes) {
        if (Plane3D.signedDistance(point, plane) < -epsilon) {
            return false;
        }
    }
    return true;
}
/**
 * Find which boundary plane a point violates (if any)
 *
 * Returns null if the point is inside the beam.
 * Useful for fail plane detection - we want to know which boundary
 * caused the rejection.
 *
 * @param point - The point to test
 * @param beam - The beam to test against
 * @param epsilon - Tolerance for boundary tests
 */
export function findBeamViolation(point, beam, epsilon = 1e-6) {
    const edgeCount = beam.boundaryPlanes.length - 1;
    for (let i = 0; i < beam.boundaryPlanes.length; i++) {
        const plane = beam.boundaryPlanes[i];
        if (Plane3D.signedDistance(point, plane) < -epsilon) {
            const type = i < edgeCount ? 'edge' : 'aperture';
            return { plane, type, index: i };
        }
    }
    return null;
}
/**
 * Get the minimum signed distance from a point to any beam boundary
 *
 * Positive means the point is inside by at least that distance.
 * Negative means the point is outside by that distance.
 */
export function distanceToBeamBoundary(point, beam) {
    let minDist = Infinity;
    for (const plane of beam.boundaryPlanes) {
        const dist = Plane3D.signedDistance(point, plane);
        minDist = Math.min(minDist, dist);
    }
    return minDist;
}
/**
 * Mirror a point across the reflecting polygon's plane
 * (Used to compute virtual sources)
 */
export function mirrorPointAcrossPolygon(point, polygon) {
    return Plane3D.mirrorPoint(point, polygon.plane);
}
/**
 * Check if a polygon is potentially visible to the beam
 *
 * Quick rejection test: polygon must not be entirely behind any boundary plane.
 *
 * @param polygon - The polygon to test
 * @param beam - The beam to test against
 * @param epsilon - Tolerance
 */
export function polygonMayBeInBeam(polygon, beam, epsilon = 1e-6) {
    for (const plane of beam.boundaryPlanes) {
        let allBehind = true;
        for (const v of polygon.vertices) {
            if (Plane3D.signedDistance(v, plane) >= -epsilon) {
                allBehind = false;
                break;
            }
        }
        if (allBehind) {
            return false; // Polygon is entirely outside this boundary
        }
    }
    return true;
}
/**
 * Check if the beam's virtual source can "see" a polygon
 * (Backface culling from virtual source's perspective)
 */
export function isPolygonFacingSource(polygon, virtualSource) {
    const centroid = Polygon3D.centroid(polygon);
    const toSource = Vector3.subtract(virtualSource, centroid);
    const normal = Plane3D.normal(polygon.plane);
    return Vector3.dot(normal, toSource) > 0;
}
/**
 * Compute the solid angle subtended by the aperture from the virtual source
 * (Useful for importance sampling and energy calculations)
 */
export function beamSolidAngle(beam) {
    // Approximate solid angle using sum of triangular solid angles
    const source = beam.virtualSource;
    const verts = beam.aperture.vertices;
    const n = verts.length;
    let solidAngle = 0;
    // Use first vertex as pivot for fan triangulation
    for (let i = 1; i < n - 1; i++) {
        const a = Vector3.normalize(Vector3.subtract(verts[0], source));
        const b = Vector3.normalize(Vector3.subtract(verts[i], source));
        const c = Vector3.normalize(Vector3.subtract(verts[i + 1], source));
        // Compute solid angle of triangle using Oosterom-Strackee formula
        const numerator = Math.abs(Vector3.dot(a, Vector3.cross(b, c)));
        const denominator = 1 +
            Vector3.dot(a, b) +
            Vector3.dot(b, c) +
            Vector3.dot(c, a);
        solidAngle += 2 * Math.atan2(numerator, denominator);
    }
    return solidAngle;
}
//# sourceMappingURL=beam3d.js.map