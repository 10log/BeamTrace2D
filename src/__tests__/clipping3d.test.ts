/**
 * Unit tests for 3D clipping module
 */

import { describe, it, expect } from 'vitest';
import { Vector3 } from '../core/vector3';
import { Plane3D } from '../core/plane3d';
import { Polygon3D } from '../geometry/polygon3d';
import {
  clipPolygonByPlane,
  clipPolygonByPlanes,
  quickRejectPolygon,
  clipRayByPlanes
} from '../geometry/clipping3d';

describe('clipPolygonByPlane', () => {
  it('keeps polygon entirely in front', () => {
    const verts: Vector3[] = [[0, 0, 5], [1, 0, 5], [1, 1, 5], [0, 1, 5]];
    const poly = Polygon3D.create(verts);
    const plane = Plane3D.fromNormalAndPoint([0, 0, 1], [0, 0, 0]);

    const result = clipPolygonByPlane(poly, plane);
    expect(result).not.toBeNull();
    expect(result!.vertices.length).toBe(4);
  });

  it('removes polygon entirely behind', () => {
    const verts: Vector3[] = [[0, 0, -5], [1, 0, -5], [1, 1, -5], [0, 1, -5]];
    const poly = Polygon3D.create(verts);
    const plane = Plane3D.fromNormalAndPoint([0, 0, 1], [0, 0, 0]);

    const result = clipPolygonByPlane(poly, plane);
    expect(result).toBeNull();
  });

  it('clips spanning polygon', () => {
    const verts: Vector3[] = [[0, 0, -1], [2, 0, -1], [2, 0, 1], [0, 0, 1]];
    const poly = Polygon3D.create(verts);
    const plane = Plane3D.fromNormalAndPoint([0, 0, 1], [0, 0, 0]);

    const result = clipPolygonByPlane(poly, plane);
    expect(result).not.toBeNull();

    // Should keep the portion with z >= 0
    for (const v of result!.vertices) {
      expect(v[2]).toBeGreaterThanOrEqual(-0.0001);
    }
  });

  it('handles polygon touching plane', () => {
    const verts: Vector3[] = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]];
    const poly = Polygon3D.create(verts);
    const plane = Plane3D.fromNormalAndPoint([0, 0, 1], [0, 0, 0]);

    const result = clipPolygonByPlane(poly, plane);
    expect(result).not.toBeNull();
  });
});

describe('clipPolygonByPlanes', () => {
  it('clips against multiple planes', () => {
    // Large polygon
    const verts: Vector3[] = [[-10, -10, 0], [10, -10, 0], [10, 10, 0], [-10, 10, 0]];
    const poly = Polygon3D.create(verts);

    // Create a box that clips to a smaller region
    const planes: Plane3D[] = [
      Plane3D.fromNormalAndPoint([1, 0, 0], [-2, 0, 0]),   // x >= -2
      Plane3D.fromNormalAndPoint([-1, 0, 0], [2, 0, 0]),  // x <= 2
      Plane3D.fromNormalAndPoint([0, 1, 0], [0, -2, 0]),  // y >= -2
      Plane3D.fromNormalAndPoint([0, -1, 0], [0, 2, 0])   // y <= 2
    ];

    const result = clipPolygonByPlanes(poly, planes);
    expect(result).not.toBeNull();

    // Result should be smaller
    expect(Polygon3D.area(result!)).toBeLessThan(Polygon3D.area(poly));

    // All vertices should be within bounds
    for (const v of result!.vertices) {
      expect(v[0]).toBeGreaterThanOrEqual(-2 - 0.0001);
      expect(v[0]).toBeLessThanOrEqual(2 + 0.0001);
      expect(v[1]).toBeGreaterThanOrEqual(-2 - 0.0001);
      expect(v[1]).toBeLessThanOrEqual(2 + 0.0001);
    }
  });

  it('returns null if polygon is clipped away', () => {
    const verts: Vector3[] = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]];
    const poly = Polygon3D.create(verts);

    // Plane that rejects entire polygon
    const planes = [Plane3D.fromNormalAndPoint([0, 0, 1], [0, 0, 10])];

    const result = clipPolygonByPlanes(poly, planes);
    expect(result).toBeNull();
  });
});

describe('quickRejectPolygon', () => {
  it('returns true if polygon is entirely outside', () => {
    const verts: Vector3[] = [[0, 0, 10], [1, 0, 10], [1, 1, 10], [0, 1, 10]];
    const poly = Polygon3D.create(verts);
    const planes = [Plane3D.fromNormalAndPoint([0, 0, -1], [0, 0, 5])]; // Points away from polygon

    expect(quickRejectPolygon(poly, planes)).toBe(true);
  });

  it('returns false if polygon may intersect', () => {
    const verts: Vector3[] = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]];
    const poly = Polygon3D.create(verts);
    const planes = [Plane3D.fromNormalAndPoint([0, 0, 1], [0, 0, 0])];

    expect(quickRejectPolygon(poly, planes)).toBe(false);
  });

  it('returns true if outside any single plane', () => {
    const verts: Vector3[] = [[5, 5, 0], [6, 5, 0], [6, 6, 0], [5, 6, 0]];
    const poly = Polygon3D.create(verts);
    const planes = [
      Plane3D.fromNormalAndPoint([1, 0, 0], [0, 0, 0]),  // x >= 0 (ok)
      Plane3D.fromNormalAndPoint([-1, 0, 0], [2, 0, 0]) // x <= 2 (fails)
    ];

    expect(quickRejectPolygon(poly, planes)).toBe(true);
  });
});

describe('clipRayByPlanes', () => {
  it('clips ray to convex volume', () => {
    const origin: Vector3 = [0, 0, 0];
    const direction: Vector3 = [1, 0, 0];

    // Box from x=2 to x=5
    const planes = [
      Plane3D.fromNormalAndPoint([1, 0, 0], [2, 0, 0]),   // x >= 2
      Plane3D.fromNormalAndPoint([-1, 0, 0], [5, 0, 0])  // x <= 5
    ];

    const result = clipRayByPlanes(origin, direction, planes);
    expect(result).not.toBeNull();
    expect(result!.tMin).toBeCloseTo(2, 10);
    expect(result!.tMax).toBeCloseTo(5, 10);
  });

  it('returns null if ray misses volume', () => {
    const origin: Vector3 = [0, 0, 10]; // Far from volume
    const direction: Vector3 = [1, 0, 0]; // Parallel to volume

    const planes = [
      Plane3D.fromNormalAndPoint([0, 0, 1], [0, 0, 0]),  // z >= 0
      Plane3D.fromNormalAndPoint([0, 0, -1], [0, 0, 5]) // z <= 5
    ];

    const result = clipRayByPlanes(origin, direction, planes);
    expect(result).toBeNull();
  });

  it('handles ray starting inside volume', () => {
    const origin: Vector3 = [3, 0, 0]; // Inside volume
    const direction: Vector3 = [1, 0, 0];

    const planes = [
      Plane3D.fromNormalAndPoint([1, 0, 0], [2, 0, 0]),
      Plane3D.fromNormalAndPoint([-1, 0, 0], [5, 0, 0])
    ];

    const result = clipRayByPlanes(origin, direction, planes);
    expect(result).not.toBeNull();
    expect(result!.tMin).toBeCloseTo(0, 10); // Starts at origin
    expect(result!.tMax).toBeCloseTo(2, 10); // Exits at x=5
  });
});
