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
 * 3D Beam - a polyhedral cone from virtual source through an aperture
 */
export interface Beam3D {
    virtualSource: Vector3;
    aperture: Polygon3D;
    boundaryPlanes: Plane3D[];
    reflectingPolygonId: number;
}
/**
 * Information about which beam boundary was violated
 */
export interface BeamViolation {
    plane: Plane3D;
    type: 'edge' | 'aperture';
    index: number;
}
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
export declare function constructBeamBoundaryPlanes(virtualSource: Vector3, aperture: Polygon3D): Plane3D[];
/**
 * Create a Beam3D from virtual source and aperture
 */
export declare function createBeam3D(virtualSource: Vector3, aperture: Polygon3D, reflectingPolygonId: number): Beam3D;
/**
 * Check if a point is inside the beam volume
 *
 * A point is inside if it's on the front (positive) side of all boundary planes.
 *
 * @param point - The point to test
 * @param beam - The beam to test against
 * @param epsilon - Tolerance for boundary tests
 */
export declare function isPointInBeam(point: Vector3, beam: Beam3D, epsilon?: number): boolean;
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
export declare function findBeamViolation(point: Vector3, beam: Beam3D, epsilon?: number): BeamViolation | null;
/**
 * Get the minimum signed distance from a point to any beam boundary
 *
 * Positive means the point is inside by at least that distance.
 * Negative means the point is outside by that distance.
 */
export declare function distanceToBeamBoundary(point: Vector3, beam: Beam3D): number;
/**
 * Mirror a point across the reflecting polygon's plane
 * (Used to compute virtual sources)
 */
export declare function mirrorPointAcrossPolygon(point: Vector3, polygon: Polygon3D): Vector3;
/**
 * Check if a polygon is potentially visible to the beam
 *
 * Quick rejection test: polygon must not be entirely behind any boundary plane.
 *
 * @param polygon - The polygon to test
 * @param beam - The beam to test against
 * @param epsilon - Tolerance
 */
export declare function polygonMayBeInBeam(polygon: Polygon3D, beam: Beam3D, epsilon?: number): boolean;
/**
 * Check if the beam's virtual source can "see" a polygon
 * (Backface culling from virtual source's perspective)
 */
export declare function isPolygonFacingSource(polygon: Polygon3D, virtualSource: Vector3): boolean;
/**
 * Compute the solid angle subtended by the aperture from the virtual source
 * (Useful for importance sampling and energy calculations)
 */
export declare function beamSolidAngle(beam: Beam3D): number;
//# sourceMappingURL=beam3d.d.ts.map