/**
 * Unit tests for Vector3 module
 */
import { describe, it, expect } from 'vitest';
import { Vector3 } from '../core/vector3';
describe('Vector3', () => {
    describe('create', () => {
        it('creates a vector from components', () => {
            const v = Vector3.create(1, 2, 3);
            expect(v).toEqual([1, 2, 3]);
        });
    });
    describe('zero', () => {
        it('creates a zero vector', () => {
            const v = Vector3.zero();
            expect(v).toEqual([0, 0, 0]);
        });
    });
    describe('clone', () => {
        it('creates an independent copy', () => {
            const v1 = [1, 2, 3];
            const v2 = Vector3.clone(v1);
            v2[0] = 99;
            expect(v1[0]).toBe(1);
            expect(v2[0]).toBe(99);
        });
    });
    describe('add', () => {
        it('adds two vectors', () => {
            const a = [1, 2, 3];
            const b = [4, 5, 6];
            const result = Vector3.add(a, b);
            expect(result).toEqual([5, 7, 9]);
        });
    });
    describe('subtract', () => {
        it('subtracts second vector from first', () => {
            const a = [5, 7, 9];
            const b = [1, 2, 3];
            const result = Vector3.subtract(a, b);
            expect(result).toEqual([4, 5, 6]);
        });
    });
    describe('scale', () => {
        it('scales vector by scalar', () => {
            const v = [1, 2, 3];
            const result = Vector3.scale(v, 2);
            expect(result).toEqual([2, 4, 6]);
        });
        it('handles negative scale', () => {
            const v = [1, 2, 3];
            const result = Vector3.scale(v, -1);
            expect(result).toEqual([-1, -2, -3]);
        });
    });
    describe('negate', () => {
        it('negates all components', () => {
            const v = [1, -2, 3];
            const result = Vector3.negate(v);
            expect(result).toEqual([-1, 2, -3]);
        });
    });
    describe('dot', () => {
        it('computes dot product', () => {
            const a = [1, 2, 3];
            const b = [4, 5, 6];
            const result = Vector3.dot(a, b);
            expect(result).toBe(1 * 4 + 2 * 5 + 3 * 6); // 32
        });
        it('gives zero for perpendicular vectors', () => {
            const a = [1, 0, 0];
            const b = [0, 1, 0];
            const result = Vector3.dot(a, b);
            expect(result).toBe(0);
        });
    });
    describe('cross', () => {
        it('computes cross product', () => {
            const a = [1, 0, 0];
            const b = [0, 1, 0];
            const result = Vector3.cross(a, b);
            expect(result).toEqual([0, 0, 1]);
        });
        it('gives zero for parallel vectors', () => {
            const a = [1, 2, 3];
            const b = [2, 4, 6];
            const result = Vector3.cross(a, b);
            expect(result).toEqual([0, 0, 0]);
        });
        it('is anti-commutative', () => {
            const a = [1, 2, 3];
            const b = [4, 5, 6];
            const ab = Vector3.cross(a, b);
            const ba = Vector3.cross(b, a);
            expect(ab).toEqual(Vector3.negate(ba));
        });
    });
    describe('length', () => {
        it('computes length of vector', () => {
            const v = [3, 4, 0];
            expect(Vector3.length(v)).toBe(5);
        });
        it('handles zero vector', () => {
            const v = [0, 0, 0];
            expect(Vector3.length(v)).toBe(0);
        });
    });
    describe('lengthSquared', () => {
        it('computes squared length', () => {
            const v = [3, 4, 0];
            expect(Vector3.lengthSquared(v)).toBe(25);
        });
    });
    describe('normalize', () => {
        it('normalizes to unit length', () => {
            const v = [3, 4, 0];
            const result = Vector3.normalize(v);
            expect(Vector3.length(result)).toBeCloseTo(1, 10);
            expect(result[0]).toBeCloseTo(0.6, 10);
            expect(result[1]).toBeCloseTo(0.8, 10);
        });
        it('returns zero for zero vector', () => {
            const v = [0, 0, 0];
            const result = Vector3.normalize(v);
            expect(result).toEqual([0, 0, 0]);
        });
    });
    describe('lerp', () => {
        it('interpolates between vectors', () => {
            const a = [0, 0, 0];
            const b = [10, 20, 30];
            expect(Vector3.lerp(a, b, 0)).toEqual([0, 0, 0]);
            expect(Vector3.lerp(a, b, 1)).toEqual([10, 20, 30]);
            expect(Vector3.lerp(a, b, 0.5)).toEqual([5, 10, 15]);
        });
    });
    describe('distance', () => {
        it('computes distance between points', () => {
            const a = [0, 0, 0];
            const b = [3, 4, 0];
            expect(Vector3.distance(a, b)).toBe(5);
        });
    });
    describe('equals', () => {
        it('returns true for equal vectors', () => {
            const a = [1, 2, 3];
            const b = [1, 2, 3];
            expect(Vector3.equals(a, b)).toBe(true);
        });
        it('returns false for different vectors', () => {
            const a = [1, 2, 3];
            const b = [1, 2, 4];
            expect(Vector3.equals(a, b)).toBe(false);
        });
        it('uses epsilon for comparison', () => {
            const a = [1, 2, 3];
            const b = [1.000001, 2.000001, 3.000001];
            expect(Vector3.equals(a, b, 0.0001)).toBe(true);
            expect(Vector3.equals(a, b, 0.0000001)).toBe(false);
        });
    });
    describe('min/max', () => {
        it('computes component-wise minimum', () => {
            const a = [1, 5, 3];
            const b = [2, 3, 4];
            expect(Vector3.min(a, b)).toEqual([1, 3, 3]);
        });
        it('computes component-wise maximum', () => {
            const a = [1, 5, 3];
            const b = [2, 3, 4];
            expect(Vector3.max(a, b)).toEqual([2, 5, 4]);
        });
    });
    describe('reflect', () => {
        it('reflects vector across normal', () => {
            const v = [1, -1, 0];
            const normal = [0, 1, 0];
            const result = Vector3.reflect(v, normal);
            expect(result[0]).toBeCloseTo(1, 10);
            expect(result[1]).toBeCloseTo(1, 10);
            expect(result[2]).toBeCloseTo(0, 10);
        });
    });
    describe('project', () => {
        it('projects vector onto another', () => {
            const a = [3, 4, 0];
            const b = [1, 0, 0];
            const result = Vector3.project(a, b);
            expect(result).toEqual([3, 0, 0]);
        });
    });
    describe('reject', () => {
        it('gets perpendicular component', () => {
            const a = [3, 4, 0];
            const b = [1, 0, 0];
            const result = Vector3.reject(a, b);
            expect(result).toEqual([0, 4, 0]);
        });
    });
});
//# sourceMappingURL=vector3.test.js.map