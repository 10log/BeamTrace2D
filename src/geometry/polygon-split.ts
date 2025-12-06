/**
 * Polygon splitting for BSP tree construction
 *
 * Splits a polygon by a plane into front and back pieces.
 */

import { Vector3 } from '../core/vector3';
import { Plane3D } from '../core/plane3d';
import { Polygon3D } from './polygon3d';

export interface SplitResult {
  front: Polygon3D | null;
  back: Polygon3D | null;
}

/**
 * Split a polygon by a plane
 *
 * Returns front and back pieces. Either may be null if the polygon
 * is entirely on one side of the plane.
 *
 * @param poly - The polygon to split
 * @param plane - The splitting plane
 * @param epsilon - Tolerance for point-on-plane classification
 */
export function splitPolygon(
  poly: Polygon3D,
  plane: Plane3D,
  epsilon: number = 1e-6
): SplitResult {
  const classification = Polygon3D.classify(poly, plane, epsilon);

  // Fast path: polygon entirely on one side
  if (classification === 'front' || classification === 'coplanar') {
    return { front: poly, back: null };
  }
  if (classification === 'back') {
    return { front: null, back: poly };
  }

  // Polygon spans the plane - need to split
  const frontVerts: Vector3[] = [];
  const backVerts: Vector3[] = [];
  const n = poly.vertices.length;

  for (let i = 0; i < n; i++) {
    const v1 = poly.vertices[i];
    const v2 = poly.vertices[(i + 1) % n];

    const d1 = Plane3D.signedDistance(v1, plane);
    const d2 = Plane3D.signedDistance(v2, plane);

    const c1 = d1 > epsilon ? 'front' : d1 < -epsilon ? 'back' : 'on';
    const c2 = d2 > epsilon ? 'front' : d2 < -epsilon ? 'back' : 'on';

    // Add v1 to appropriate list(s)
    if (c1 === 'front') {
      frontVerts.push(v1);
    } else if (c1 === 'back') {
      backVerts.push(v1);
    } else {
      // On the plane - add to both sides
      frontVerts.push(v1);
      backVerts.push(v1);
    }

    // Check if edge crosses the plane
    if ((c1 === 'front' && c2 === 'back') || (c1 === 'back' && c2 === 'front')) {
      // Compute intersection point
      const t = d1 / (d1 - d2);
      const intersection = Vector3.lerp(v1, v2, t);

      // Add intersection to both sides
      frontVerts.push(intersection);
      backVerts.push(intersection);
    }
  }

  // Create result polygons if they have at least 3 vertices
  const front = frontVerts.length >= 3
    ? Polygon3D.createWithPlane(frontVerts, poly.plane, poly.materialId)
    : null;
  const back = backVerts.length >= 3
    ? Polygon3D.createWithPlane(backVerts, poly.plane, poly.materialId)
    : null;

  return { front, back };
}

/**
 * Split multiple polygons by a plane
 *
 * Useful for BSP tree construction where multiple polygons need to be
 * partitioned by the same splitting plane.
 */
export function splitPolygons(
  polygons: Polygon3D[],
  plane: Plane3D,
  epsilon: number = 1e-6
): { front: Polygon3D[]; back: Polygon3D[]; coplanar: Polygon3D[] } {
  const front: Polygon3D[] = [];
  const back: Polygon3D[] = [];
  const coplanar: Polygon3D[] = [];

  for (const poly of polygons) {
    const classification = Polygon3D.classify(poly, plane, epsilon);

    switch (classification) {
      case 'coplanar':
        coplanar.push(poly);
        break;

      case 'front':
        front.push(poly);
        break;

      case 'back':
        back.push(poly);
        break;

      case 'spanning': {
        const { front: f, back: b } = splitPolygon(poly, plane, epsilon);
        if (f) front.push(f);
        if (b) back.push(b);
        break;
      }
    }
  }

  return { front, back, coplanar };
}
