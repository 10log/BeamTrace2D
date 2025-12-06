import { describe, it, expect } from 'vitest';
import { dot, subtract, add, scale, length, normalize, perpendicular, distance, lineFromPoints, signedDistanceToLine, isPointBehindLine, distanceToLine, mirrorPointAcrossWall, mirrorLineAcrossWall, flipLine, constructBeamBoundaryLines, isPointInBeam, findBeamViolation } from '../geometry';
describe('Geometry utilities', () => {
    describe('Vector operations', () => {
        it('computes dot product correctly', () => {
            expect(dot([1, 0], [0, 1])).toBe(0);
            expect(dot([1, 0], [1, 0])).toBe(1);
            expect(dot([2, 3], [4, 5])).toBe(23);
            expect(dot([1, 2], [-2, 1])).toBe(0); // Perpendicular
        });
        it('subtracts vectors correctly', () => {
            expect(subtract([5, 3], [2, 1])).toEqual([3, 2]);
            expect(subtract([0, 0], [1, 1])).toEqual([-1, -1]);
        });
        it('adds vectors correctly', () => {
            expect(add([1, 2], [3, 4])).toEqual([4, 6]);
            expect(add([0, 0], [-1, -1])).toEqual([-1, -1]);
        });
        it('scales vectors correctly', () => {
            expect(scale([2, 3], 2)).toEqual([4, 6]);
            expect(scale([1, -1], -1)).toEqual([-1, 1]);
            expect(scale([5, 5], 0)).toEqual([0, 0]);
        });
        it('computes length correctly', () => {
            expect(length([3, 4])).toBe(5);
            expect(length([0, 0])).toBe(0);
            expect(length([1, 0])).toBe(1);
        });
        it('normalizes vectors correctly', () => {
            const n1 = normalize([3, 4]);
            expect(n1[0]).toBeCloseTo(0.6);
            expect(n1[1]).toBeCloseTo(0.8);
            const n2 = normalize([0, 5]);
            expect(n2[0]).toBeCloseTo(0);
            expect(n2[1]).toBeCloseTo(1);
            // Zero vector case
            expect(normalize([0, 0])).toEqual([0, 0]);
        });
        it('computes perpendicular vectors correctly', () => {
            const p1 = perpendicular([1, 0]);
            expect(p1[0]).toBeCloseTo(0);
            expect(p1[1]).toBeCloseTo(1);
            const p2 = perpendicular([0, 1]);
            expect(p2[0]).toBeCloseTo(-1);
            expect(p2[1]).toBeCloseTo(0);
            const p3 = perpendicular([3, 4]);
            expect(p3[0]).toBeCloseTo(-4);
            expect(p3[1]).toBeCloseTo(3);
        });
        it('computes distance between points correctly', () => {
            expect(distance([0, 0], [3, 4])).toBe(5);
            expect(distance([1, 1], [1, 1])).toBe(0);
            expect(distance([0, 0], [1, 0])).toBe(1);
        });
    });
    describe('Line operations', () => {
        it('creates line from two points', () => {
            // Horizontal line y = 0
            const line = lineFromPoints([0, 0], [1, 0]);
            // Normal should be perpendicular to x-axis
            expect(Math.abs(line.a)).toBeLessThan(0.001);
            expect(Math.abs(line.b)).toBeCloseTo(1);
        });
        it('computes signed distance to line correctly', () => {
            // Horizontal line through origin
            const line = lineFromPoints([0, 0], [1, 0]);
            // Points above should be positive (in front), below negative
            const above = signedDistanceToLine([0, 1], line);
            const below = signedDistanceToLine([0, -1], line);
            expect(above * below).toBeLessThan(0); // Opposite signs
            expect(Math.abs(above)).toBeCloseTo(1);
            expect(Math.abs(below)).toBeCloseTo(1);
        });
        it('checks if point is behind line correctly', () => {
            const line = lineFromPoints([0, 0], [1, 0]); // Normal points up
            // One of these should be behind, one in front
            const behindCheck1 = isPointBehindLine([0, 1], line);
            const behindCheck2 = isPointBehindLine([0, -1], line);
            expect(behindCheck1).not.toBe(behindCheck2); // One true, one false
        });
        it('computes absolute distance to line correctly', () => {
            const line = lineFromPoints([0, 0], [1, 0]);
            expect(distanceToLine([0, 5], line)).toBeCloseTo(5);
            expect(distanceToLine([0, -5], line)).toBeCloseTo(5);
            expect(distanceToLine([100, 0], line)).toBeCloseTo(0);
        });
        it('flips line correctly', () => {
            const line = { a: 1, b: 2, c: 3 };
            const flipped = flipLine(line);
            expect(flipped.a).toBe(-1);
            expect(flipped.b).toBe(-2);
            expect(flipped.c).toBe(-3);
        });
    });
    describe('Mirror operations', () => {
        it('mirrors point across horizontal wall', () => {
            // Wall on x-axis
            const wallP1 = [0, 0];
            const wallP2 = [100, 0];
            const point = [50, 10];
            const mirrored = mirrorPointAcrossWall(point, wallP1, wallP2);
            expect(mirrored[0]).toBeCloseTo(50);
            expect(mirrored[1]).toBeCloseTo(-10);
        });
        it('mirrors point across vertical wall', () => {
            // Wall on y-axis
            const wallP1 = [0, 0];
            const wallP2 = [0, 100];
            const point = [10, 50];
            const mirrored = mirrorPointAcrossWall(point, wallP1, wallP2);
            expect(mirrored[0]).toBeCloseTo(-10);
            expect(mirrored[1]).toBeCloseTo(50);
        });
        it('mirrors point across diagonal wall', () => {
            // Wall at 45 degrees
            const wallP1 = [0, 0];
            const wallP2 = [1, 1];
            const point = [1, 0];
            const mirrored = mirrorPointAcrossWall(point, wallP1, wallP2);
            // Point (1, 0) mirrored across y=x should be (0, 1)
            expect(mirrored[0]).toBeCloseTo(0);
            expect(mirrored[1]).toBeCloseTo(1);
        });
        it('mirrors line across wall correctly', () => {
            // Wall on x-axis
            const wallP1 = [0, 0];
            const wallP2 = [100, 0];
            // Line at y = 1
            const line = lineFromPoints([0, 1], [1, 1]);
            const mirrored = mirrorLineAcrossWall(line, wallP1, wallP2);
            // Mirrored line should pass through (0, -1) and (1, -1)
            expect(Math.abs(signedDistanceToLine([0, -1], mirrored))).toBeLessThan(0.001);
            expect(Math.abs(signedDistanceToLine([1, -1], mirrored))).toBeLessThan(0.001);
        });
        it('mirrors diagonal line across wall correctly', () => {
            // Wall on x-axis
            const wallP1 = [0, 0];
            const wallP2 = [100, 0];
            // Diagonal line through (0, 1) and (1, 2)
            const line = lineFromPoints([0, 1], [1, 2]);
            const mirrored = mirrorLineAcrossWall(line, wallP1, wallP2);
            // Mirrored line should pass through (0, -1) and (1, -2)
            expect(Math.abs(signedDistanceToLine([0, -1], mirrored))).toBeLessThan(0.001);
            expect(Math.abs(signedDistanceToLine([1, -2], mirrored))).toBeLessThan(0.001);
        });
    });
    describe('Beam boundary operations', () => {
        it('constructs beam boundary lines', () => {
            // Virtual source below the window (y=-50), window on x-axis
            // Beam extends upward (positive Y) from the window
            const virtualSource = [50, -50];
            const windowP1 = [0, 0];
            const windowP2 = [100, 0];
            const boundaries = constructBeamBoundaryLines(virtualSource, windowP1, windowP2);
            // Should have three boundary lines
            expect(boundaries.left).toBeDefined();
            expect(boundaries.right).toBeDefined();
            expect(boundaries.window).toBeDefined();
        });
        it('correctly identifies point inside beam', () => {
            // Virtual source at (50, 50), window at y=0
            // The beam extends downward from the source through the window
            const virtualSource = [50, 50];
            const windowP1 = [0, 0];
            const windowP2 = [100, 0];
            const boundaries = constructBeamBoundaryLines(virtualSource, windowP1, windowP2);
            // Point inside the beam - between source and window, within the cone
            const insidePoint = [50, 25];
            expect(isPointInBeam(insidePoint, boundaries)).toBe(true);
        });
        it('correctly identifies point outside beam', () => {
            const virtualSource = [50, 50];
            const windowP1 = [0, 0];
            const windowP2 = [100, 0];
            const boundaries = constructBeamBoundaryLines(virtualSource, windowP1, windowP2);
            // Point outside the beam (to the left of the cone)
            const outsidePoint = [-50, 25];
            expect(isPointInBeam(outsidePoint, boundaries)).toBe(false);
        });
        it('finds correct beam violation', () => {
            const virtualSource = [50, 50];
            const windowP1 = [0, 0];
            const windowP2 = [100, 0];
            const boundaries = constructBeamBoundaryLines(virtualSource, windowP1, windowP2);
            // Point outside on the left
            const leftOutside = [-50, 25];
            const leftViolation = findBeamViolation(leftOutside, boundaries);
            expect(leftViolation).not.toBeNull();
            // Point inside should have no violation
            const inside = [50, 25];
            expect(findBeamViolation(inside, boundaries)).toBeNull();
        });
        it('handles inverted source position', () => {
            // Source below window
            const virtualSource = [50, -50];
            const windowP1 = [0, 0];
            const windowP2 = [100, 0];
            const boundaries = constructBeamBoundaryLines(virtualSource, windowP1, windowP2);
            // Should still construct valid boundaries
            expect(boundaries.left).toBeDefined();
            expect(boundaries.right).toBeDefined();
            expect(boundaries.window).toBeDefined();
        });
    });
});
//# sourceMappingURL=geometry.test.js.map