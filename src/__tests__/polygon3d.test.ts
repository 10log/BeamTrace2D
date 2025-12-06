/**
 * Unit tests for Polygon3D module
 */

import { describe, it, expect } from 'vitest';
import { Vector3 } from '../core/vector3';
import { Plane3D } from '../core/plane3d';
import { Polygon3D, createShoeboxRoom, createQuad } from '../geometry/polygon3d';

describe('Polygon3D', () => {
  describe('create', () => {
    it('creates polygon from vertices', () => {
      const verts: Vector3[] = [
        [0, 0, 0],
        [1, 0, 0],
        [1, 1, 0],
        [0, 1, 0]
      ];
      const poly = Polygon3D.create(verts);

      expect(poly.vertices.length).toBe(4);
      expect(poly.plane).toBeDefined();
    });

    it('throws for less than 3 vertices', () => {
      expect(() => Polygon3D.create([[0, 0, 0], [1, 0, 0]])).toThrow();
    });

    it('assigns material ID', () => {
      const verts: Vector3[] = [[0, 0, 0], [1, 0, 0], [0, 1, 0]];
      const poly = Polygon3D.create(verts, 42);
      expect(poly.materialId).toBe(42);
    });
  });

  describe('centroid', () => {
    it('computes centroid of triangle', () => {
      const verts: Vector3[] = [[0, 0, 0], [3, 0, 0], [0, 3, 0]];
      const poly = Polygon3D.create(verts);
      const centroid = Polygon3D.centroid(poly);

      expect(centroid[0]).toBeCloseTo(1, 10);
      expect(centroid[1]).toBeCloseTo(1, 10);
      expect(centroid[2]).toBeCloseTo(0, 10);
    });

    it('computes centroid of square', () => {
      const verts: Vector3[] = [[0, 0, 0], [2, 0, 0], [2, 2, 0], [0, 2, 0]];
      const poly = Polygon3D.create(verts);
      const centroid = Polygon3D.centroid(poly);

      expect(centroid[0]).toBeCloseTo(1, 10);
      expect(centroid[1]).toBeCloseTo(1, 10);
      expect(centroid[2]).toBeCloseTo(0, 10);
    });
  });

  describe('area', () => {
    it('computes area of unit square', () => {
      const verts: Vector3[] = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]];
      const poly = Polygon3D.create(verts);
      expect(Polygon3D.area(poly)).toBeCloseTo(1, 10);
    });

    it('computes area of triangle', () => {
      const verts: Vector3[] = [[0, 0, 0], [4, 0, 0], [0, 3, 0]];
      const poly = Polygon3D.create(verts);
      expect(Polygon3D.area(poly)).toBeCloseTo(6, 10); // 0.5 * 4 * 3
    });

    it('handles non-planar axis alignment', () => {
      // Square in YZ plane
      const verts: Vector3[] = [[0, 0, 0], [0, 2, 0], [0, 2, 2], [0, 0, 2]];
      const poly = Polygon3D.create(verts);
      expect(Polygon3D.area(poly)).toBeCloseTo(4, 10);
    });
  });

  describe('normal', () => {
    it('returns plane normal', () => {
      const verts: Vector3[] = [[0, 0, 0], [1, 0, 0], [0, 1, 0]];
      const poly = Polygon3D.create(verts);
      const normal = Polygon3D.normal(poly);

      // CCW winding in XY plane should have +Z normal
      expect(normal[0]).toBeCloseTo(0, 10);
      expect(normal[1]).toBeCloseTo(0, 10);
      expect(normal[2]).toBeCloseTo(1, 10);
    });
  });

  describe('edges', () => {
    it('returns edges as vertex pairs', () => {
      const verts: Vector3[] = [[0, 0, 0], [1, 0, 0], [1, 1, 0]];
      const poly = Polygon3D.create(verts);
      const edges = Polygon3D.edges(poly);

      expect(edges.length).toBe(3);
      expect(edges[0]).toEqual([[0, 0, 0], [1, 0, 0]]);
      expect(edges[2]).toEqual([[1, 1, 0], [0, 0, 0]]); // Wraps around
    });
  });

  describe('classify', () => {
    it('classifies polygon in front of plane', () => {
      const verts: Vector3[] = [[0, 0, 1], [1, 0, 1], [0, 1, 1]];
      const poly = Polygon3D.create(verts);
      const plane = Plane3D.fromNormalAndPoint([0, 0, 1], [0, 0, 0]);

      expect(Polygon3D.classify(poly, plane)).toBe('front');
    });

    it('classifies polygon behind plane', () => {
      const verts: Vector3[] = [[0, 0, -1], [1, 0, -1], [0, 1, -1]];
      const poly = Polygon3D.create(verts);
      const plane = Plane3D.fromNormalAndPoint([0, 0, 1], [0, 0, 0]);

      expect(Polygon3D.classify(poly, plane)).toBe('back');
    });

    it('classifies polygon spanning plane', () => {
      const verts: Vector3[] = [[0, 0, -1], [1, 0, 1], [0, 1, 0]];
      const poly = Polygon3D.create(verts);
      const plane = Plane3D.fromNormalAndPoint([0, 0, 1], [0, 0, 0]);

      expect(Polygon3D.classify(poly, plane)).toBe('spanning');
    });

    it('classifies coplanar polygon', () => {
      const verts: Vector3[] = [[0, 0, 0], [1, 0, 0], [0, 1, 0]];
      const poly = Polygon3D.create(verts);
      const plane = Plane3D.fromNormalAndPoint([0, 0, 1], [0, 0, 0]);

      expect(Polygon3D.classify(poly, plane)).toBe('coplanar');
    });
  });

  describe('containsPoint', () => {
    it('returns true for point inside', () => {
      const verts: Vector3[] = [[0, 0, 0], [4, 0, 0], [4, 4, 0], [0, 4, 0]];
      const poly = Polygon3D.create(verts);

      expect(Polygon3D.containsPoint(poly, [2, 2, 0])).toBe(true);
    });

    it('returns false for point outside', () => {
      const verts: Vector3[] = [[0, 0, 0], [4, 0, 0], [4, 4, 0], [0, 4, 0]];
      const poly = Polygon3D.create(verts);

      expect(Polygon3D.containsPoint(poly, [5, 2, 0])).toBe(false);
    });

    it('returns true for point on edge', () => {
      const verts: Vector3[] = [[0, 0, 0], [4, 0, 0], [4, 4, 0], [0, 4, 0]];
      const poly = Polygon3D.create(verts);

      expect(Polygon3D.containsPoint(poly, [2, 0, 0])).toBe(true);
    });

    it('returns true for point at vertex', () => {
      const verts: Vector3[] = [[0, 0, 0], [4, 0, 0], [4, 4, 0], [0, 4, 0]];
      const poly = Polygon3D.create(verts);

      expect(Polygon3D.containsPoint(poly, [0, 0, 0])).toBe(true);
    });
  });

  describe('rayIntersection', () => {
    it('finds intersection with polygon', () => {
      const verts: Vector3[] = [[0, 0, 0], [4, 0, 0], [4, 4, 0], [0, 4, 0]];
      const poly = Polygon3D.create(verts);

      const origin: Vector3 = [2, 2, 5];
      const direction: Vector3 = [0, 0, -1];
      const hit = Polygon3D.rayIntersection(origin, direction, poly);

      expect(hit).not.toBeNull();
      expect(hit!.t).toBeCloseTo(5, 10);
      expect(hit!.point[0]).toBeCloseTo(2, 10);
      expect(hit!.point[1]).toBeCloseTo(2, 10);
      expect(hit!.point[2]).toBeCloseTo(0, 10);
    });

    it('returns null for miss', () => {
      const verts: Vector3[] = [[0, 0, 0], [4, 0, 0], [4, 4, 0], [0, 4, 0]];
      const poly = Polygon3D.create(verts);

      const origin: Vector3 = [10, 10, 5];
      const direction: Vector3 = [0, 0, -1];
      const hit = Polygon3D.rayIntersection(origin, direction, poly);

      expect(hit).toBeNull();
    });

    it('returns null for ray parallel to polygon', () => {
      const verts: Vector3[] = [[0, 0, 0], [4, 0, 0], [4, 4, 0], [0, 4, 0]];
      const poly = Polygon3D.create(verts);

      const origin: Vector3 = [2, 2, 5];
      const direction: Vector3 = [1, 0, 0]; // Parallel
      const hit = Polygon3D.rayIntersection(origin, direction, poly);

      expect(hit).toBeNull();
    });

    it('returns null for intersection behind ray origin', () => {
      const verts: Vector3[] = [[0, 0, 0], [4, 0, 0], [4, 4, 0], [0, 4, 0]];
      const poly = Polygon3D.create(verts);

      const origin: Vector3 = [2, 2, 5];
      const direction: Vector3 = [0, 0, 1]; // Away from polygon
      const hit = Polygon3D.rayIntersection(origin, direction, poly);

      expect(hit).toBeNull();
    });
  });

  describe('boundingBox', () => {
    it('computes tight bounding box', () => {
      const verts: Vector3[] = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
      const poly = Polygon3D.create(verts);
      const bbox = Polygon3D.boundingBox(poly);

      expect(bbox.min).toEqual([1, 2, 3]);
      expect(bbox.max).toEqual([7, 8, 9]);
    });
  });

  describe('isDegenerate', () => {
    it('returns true for zero area polygon', () => {
      // Collinear points
      const verts: Vector3[] = [[0, 0, 0], [1, 0, 0], [2, 0, 0]];
      const poly = Polygon3D.create(verts);

      expect(Polygon3D.isDegenerate(poly)).toBe(true);
    });

    it('returns false for valid polygon', () => {
      const verts: Vector3[] = [[0, 0, 0], [1, 0, 0], [0, 1, 0]];
      const poly = Polygon3D.create(verts);

      expect(Polygon3D.isDegenerate(poly)).toBe(false);
    });
  });

  describe('flip', () => {
    it('reverses vertex order', () => {
      const verts: Vector3[] = [[0, 0, 0], [1, 0, 0], [0, 1, 0]];
      const poly = Polygon3D.create(verts);
      const flipped = Polygon3D.flip(poly);

      expect(flipped.vertices[0]).toEqual([0, 1, 0]);
      expect(flipped.vertices[2]).toEqual([0, 0, 0]);
    });

    it('reverses normal direction', () => {
      const verts: Vector3[] = [[0, 0, 0], [1, 0, 0], [0, 1, 0]];
      const poly = Polygon3D.create(verts);
      const flipped = Polygon3D.flip(poly);

      const n1 = Polygon3D.normal(poly);
      const n2 = Polygon3D.normal(flipped);

      expect(n1[2]).toBeCloseTo(1, 10);
      expect(n2[2]).toBeCloseTo(-1, 10);
    });
  });
});

describe('createQuad', () => {
  it('creates a 4-vertex polygon', () => {
    const quad = createQuad([0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]);
    expect(quad.vertices.length).toBe(4);
  });
});

describe('createShoeboxRoom', () => {
  it('creates 6 polygons for walls, floor, ceiling', () => {
    const room = createShoeboxRoom(10, 8, 3);
    expect(room.length).toBe(6);
  });

  it('creates room with correct dimensions', () => {
    const room = createShoeboxRoom(10, 8, 3);

    // Check all polygons are valid
    for (const poly of room) {
      expect(poly.vertices.length).toBeGreaterThanOrEqual(4);
      expect(Polygon3D.area(poly)).toBeGreaterThan(0);
    }
  });

  it('assigns material IDs', () => {
    const room = createShoeboxRoom(10, 8, 3, 1, 2, 3);

    // Floor should have materialId 1
    expect(room[0].materialId).toBe(1);
    // Ceiling should have materialId 2
    expect(room[1].materialId).toBe(2);
    // Walls should have materialId 3
    expect(room[2].materialId).toBe(3);
    expect(room[3].materialId).toBe(3);
    expect(room[4].materialId).toBe(3);
    expect(room[5].materialId).toBe(3);
  });
});
