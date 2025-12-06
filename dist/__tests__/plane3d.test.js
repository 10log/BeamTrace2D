/**
 * Unit tests for Plane3D module
 */
import { describe, it, expect } from 'vitest';
import { Vector3 } from '../core/vector3';
import { Plane3D } from '../core/plane3d';
describe('Plane3D', () => {
    describe('fromNormalAndPoint', () => {
        it('creates plane from normal and point', () => {
            const normal = [0, 0, 1];
            const point = [0, 0, 5];
            const plane = Plane3D.fromNormalAndPoint(normal, point);
            // Normal should be normalized
            expect(plane.a).toBeCloseTo(0, 10);
            expect(plane.b).toBeCloseTo(0, 10);
            expect(plane.c).toBeCloseTo(1, 10);
            // Point should be on the plane (distance = 0)
            expect(Plane3D.signedDistance(point, plane)).toBeCloseTo(0, 10);
        });
        it('normalizes non-unit normal', () => {
            const normal = [0, 0, 10];
            const point = [0, 0, 0];
            const plane = Plane3D.fromNormalAndPoint(normal, point);
            expect(plane.c).toBeCloseTo(1, 10);
        });
    });
    describe('fromPoints', () => {
        it('creates plane from three points', () => {
            const p1 = [0, 0, 0];
            const p2 = [1, 0, 0];
            const p3 = [0, 1, 0];
            const plane = Plane3D.fromPoints(p1, p2, p3);
            // Normal should point up (+Z) for CCW winding
            expect(plane.a).toBeCloseTo(0, 10);
            expect(plane.b).toBeCloseTo(0, 10);
            expect(plane.c).toBeCloseTo(1, 10);
        });
        it('all three points are on the plane', () => {
            const p1 = [1, 2, 3];
            const p2 = [4, 5, 6];
            const p3 = [7, 8, 1];
            const plane = Plane3D.fromPoints(p1, p2, p3);
            expect(Plane3D.signedDistance(p1, plane)).toBeCloseTo(0, 10);
            expect(Plane3D.signedDistance(p2, plane)).toBeCloseTo(0, 10);
            expect(Plane3D.signedDistance(p3, plane)).toBeCloseTo(0, 10);
        });
    });
    describe('signedDistance', () => {
        it('returns positive for points in front of plane', () => {
            const plane = Plane3D.fromNormalAndPoint([0, 0, 1], [0, 0, 0]);
            const point = [0, 0, 5];
            expect(Plane3D.signedDistance(point, plane)).toBeCloseTo(5, 10);
        });
        it('returns negative for points behind plane', () => {
            const plane = Plane3D.fromNormalAndPoint([0, 0, 1], [0, 0, 0]);
            const point = [0, 0, -5];
            expect(Plane3D.signedDistance(point, plane)).toBeCloseTo(-5, 10);
        });
        it('returns zero for points on plane', () => {
            const plane = Plane3D.fromNormalAndPoint([0, 0, 1], [0, 0, 0]);
            const point = [10, 20, 0];
            expect(Plane3D.signedDistance(point, plane)).toBeCloseTo(0, 10);
        });
    });
    describe('classifyPoint', () => {
        it('classifies point in front', () => {
            const plane = Plane3D.fromNormalAndPoint([0, 0, 1], [0, 0, 0]);
            expect(Plane3D.classifyPoint([0, 0, 1], plane)).toBe('front');
        });
        it('classifies point behind', () => {
            const plane = Plane3D.fromNormalAndPoint([0, 0, 1], [0, 0, 0]);
            expect(Plane3D.classifyPoint([0, 0, -1], plane)).toBe('back');
        });
        it('classifies point on plane', () => {
            const plane = Plane3D.fromNormalAndPoint([0, 0, 1], [0, 0, 0]);
            expect(Plane3D.classifyPoint([10, 20, 0], plane)).toBe('on');
        });
    });
    describe('mirrorPoint', () => {
        it('mirrors point across XY plane', () => {
            const plane = Plane3D.fromNormalAndPoint([0, 0, 1], [0, 0, 0]);
            const point = [1, 2, 3];
            const mirrored = Plane3D.mirrorPoint(point, plane);
            expect(mirrored[0]).toBeCloseTo(1, 10);
            expect(mirrored[1]).toBeCloseTo(2, 10);
            expect(mirrored[2]).toBeCloseTo(-3, 10);
        });
        it('mirrors point across offset plane', () => {
            const plane = Plane3D.fromNormalAndPoint([0, 0, 1], [0, 0, 5]);
            const point = [0, 0, 8];
            const mirrored = Plane3D.mirrorPoint(point, plane);
            expect(mirrored[2]).toBeCloseTo(2, 10);
        });
        it('point on plane mirrors to itself', () => {
            const plane = Plane3D.fromNormalAndPoint([0, 0, 1], [0, 0, 0]);
            const point = [1, 2, 0];
            const mirrored = Plane3D.mirrorPoint(point, plane);
            expect(Vector3.equals(point, mirrored)).toBe(true);
        });
    });
    describe('flip', () => {
        it('negates normal and d', () => {
            const plane = { a: 0, b: 0, c: 1, d: -5 };
            const flipped = Plane3D.flip(plane);
            expect(flipped.a).toBeCloseTo(0, 10);
            expect(flipped.b).toBeCloseTo(0, 10);
            expect(flipped.c).toBe(-1);
            expect(flipped.d).toBe(5);
        });
        it('reverses front/back classification', () => {
            const plane = Plane3D.fromNormalAndPoint([0, 0, 1], [0, 0, 0]);
            const flipped = Plane3D.flip(plane);
            const point = [0, 0, 5];
            expect(Plane3D.signedDistance(point, plane)).toBeGreaterThan(0);
            expect(Plane3D.signedDistance(point, flipped)).toBeLessThan(0);
        });
    });
    describe('rayIntersection', () => {
        it('finds intersection with plane', () => {
            const plane = Plane3D.fromNormalAndPoint([0, 0, 1], [0, 0, 5]);
            const origin = [0, 0, 0];
            const direction = [0, 0, 1];
            const t = Plane3D.rayIntersection(origin, direction, plane);
            expect(t).toBeCloseTo(5, 10);
        });
        it('returns null for parallel ray', () => {
            const plane = Plane3D.fromNormalAndPoint([0, 0, 1], [0, 0, 5]);
            const origin = [0, 0, 0];
            const direction = [1, 0, 0]; // Parallel to plane
            const t = Plane3D.rayIntersection(origin, direction, plane);
            expect(t).toBeNull();
        });
        it('returns negative t for intersection behind origin', () => {
            const plane = Plane3D.fromNormalAndPoint([0, 0, 1], [0, 0, -5]);
            const origin = [0, 0, 0];
            const direction = [0, 0, 1]; // Pointing away from plane
            const t = Plane3D.rayIntersection(origin, direction, plane);
            expect(t).toBeCloseTo(-5, 10);
        });
    });
    describe('rayIntersectionPoint', () => {
        it('returns intersection point', () => {
            const plane = Plane3D.fromNormalAndPoint([0, 0, 1], [0, 0, 5]);
            const origin = [1, 2, 0];
            const direction = [0, 0, 1];
            const point = Plane3D.rayIntersectionPoint(origin, direction, plane);
            expect(point).not.toBeNull();
            expect(point[0]).toBeCloseTo(1, 10);
            expect(point[1]).toBeCloseTo(2, 10);
            expect(point[2]).toBeCloseTo(5, 10);
        });
    });
    describe('projectPoint', () => {
        it('projects point onto plane', () => {
            const plane = Plane3D.fromNormalAndPoint([0, 0, 1], [0, 0, 5]);
            const point = [1, 2, 10];
            const projected = Plane3D.projectPoint(point, plane);
            expect(projected[0]).toBeCloseTo(1, 10);
            expect(projected[1]).toBeCloseTo(2, 10);
            expect(projected[2]).toBeCloseTo(5, 10);
        });
    });
    describe('mirrorPlane', () => {
        it('mirrors plane across another plane', () => {
            // Create a plane at z=3
            const planeToMirror = Plane3D.fromNormalAndPoint([0, 0, 1], [0, 0, 3]);
            // Mirror across z=0 (XY plane)
            const mirrorPlane = Plane3D.fromNormalAndPoint([0, 0, 1], [0, 0, 0]);
            const mirrored = Plane3D.mirrorPlane(planeToMirror, mirrorPlane);
            // Should now be at z=-3
            const testPoint = [0, 0, -3];
            expect(Math.abs(Plane3D.signedDistance(testPoint, mirrored))).toBeLessThan(0.0001);
        });
    });
});
//# sourceMappingURL=plane3d.test.js.map