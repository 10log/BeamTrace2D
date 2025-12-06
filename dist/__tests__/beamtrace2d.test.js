import { describe, it, expect } from 'vitest';
import { Wall, Source, Listener, Solver } from '../beamtrace2d';
describe('BeamTrace2D', () => {
    describe('Wall', () => {
        it('creates a wall with two points', () => {
            const wall = new Wall([0, 0], [100, 0]);
            expect(wall.p1).toEqual([0, 0]);
            expect(wall.p2).toEqual([100, 0]);
        });
        it('has a draw method', () => {
            const wall = new Wall([0, 0], [100, 100]);
            expect(typeof wall.draw).toBe('function');
        });
    });
    describe('Source', () => {
        it('creates a source at a point', () => {
            const source = new Source([50, 50]);
            expect(source.p0).toEqual([50, 50]);
        });
        it('has a draw method', () => {
            const source = new Source([50, 50]);
            expect(typeof source.draw).toBe('function');
        });
    });
    describe('Listener', () => {
        it('creates a listener at a point', () => {
            const listener = new Listener([60, 60]);
            expect(listener.p0).toEqual([60, 60]);
        });
        it('has a draw method', () => {
            const listener = new Listener([60, 60]);
            expect(typeof listener.draw).toBe('function');
        });
    });
    describe('Solver', () => {
        it('returns an array of paths', () => {
            const walls = [
                new Wall([0, 0], [100, 0]),
                new Wall([100, 0], [100, 100]),
                new Wall([100, 100], [0, 100]),
                new Wall([0, 100], [0, 0]),
            ];
            const source = new Source([50, 50]);
            const solver = new Solver(walls, source, 3);
            const listener = new Listener([60, 60]);
            const paths = solver.getPaths(listener);
            expect(Array.isArray(paths)).toBe(true);
        });
        it('returns direct path when source and listener can see each other', () => {
            const walls = [
                new Wall([0, 0], [100, 0]),
                new Wall([100, 0], [100, 100]),
                new Wall([100, 100], [0, 100]),
                new Wall([0, 100], [0, 0]),
            ];
            const source = new Source([50, 50]);
            const solver = new Solver(walls, source, 2);
            const listener = new Listener([60, 60]);
            const paths = solver.getPaths(listener);
            expect(paths.length).toBeGreaterThan(0);
            // Should have at least the direct path
            const directPath = paths.find(path => path.length === 2 && path[1][2] === null);
            expect(directPath).toBeDefined();
        });
        // Replicate the original QUnit test
        // Note: v1.x used reflectionOrder=4 with a -2 offset bug, giving maxOrder=2
        // v2.0 fixed the API: reflectionOrder=3 now correctly gives 3 reflection levels (maxOrder=2)
        it('generates correct path_array for test scene', () => {
            const walls = [
                new Wall([100, 130], [120, 220]), // Wall id 0
                new Wall([50, 55], [220, 60]), // Wall id 1
                new Wall([220, 60], [250, 220]), // Wall id 2
                new Wall([50, 220], [200, 220]), // Wall id 3
                new Wall([50, 220], [50, 55]), // Wall id 4
                new Wall([200, 220], [40, 230]), // Wall id 5
                new Wall([40, 230], [30, 290]), // Wall id 6
                new Wall([30, 290], [60, 270]), // Wall id 7
                new Wall([60, 270], [290, 270]), // Wall id 8
                new Wall([290, 270], [250, 220]), // Wall id 9
            ];
            const listener = new Listener([80, 100]);
            const source = new Source([200, 80]);
            const reflectionOrder = 3;
            const solver = new Solver(walls, source, reflectionOrder);
            const pathArray = solver.getPaths(listener);
            expect(pathArray).not.toBeNull();
            expect(Array.isArray(pathArray)).toBe(true);
            expect(pathArray.length).toBe(16);
        });
        it('computes reflection paths off walls', () => {
            const walls = [
                new Wall([0, 0], [100, 0]),
                new Wall([100, 0], [100, 100]),
                new Wall([100, 100], [0, 100]),
                new Wall([0, 100], [0, 0]),
            ];
            const source = new Source([25, 50]);
            const solver = new Solver(walls, source, 3);
            const listener = new Listener([75, 50]);
            const paths = solver.getPaths(listener);
            // Should have multiple paths including reflections
            expect(paths.length).toBeGreaterThan(1);
        });
        it('throws error when listener is not provided', () => {
            const walls = [
                new Wall([0, 0], [100, 0]),
                new Wall([100, 0], [100, 100]),
            ];
            const source = new Source([50, 50]);
            const solver = new Solver(walls, source, 2);
            // @ts-expect-error - testing runtime behavior with invalid input
            expect(() => solver.getPaths(undefined)).toThrow('BeamTrace2D: listener is required');
        });
        it('uses default reflection order when not specified', () => {
            const walls = [
                new Wall([0, 0], [100, 0]),
                new Wall([100, 0], [100, 100]),
                new Wall([100, 100], [0, 100]),
                new Wall([0, 100], [0, 0]),
            ];
            const source = new Source([50, 50]);
            // Should not throw when reflection_order is not provided
            const solver = new Solver(walls, source);
            const listener = new Listener([60, 60]);
            const paths = solver.getPaths(listener);
            expect(Array.isArray(paths)).toBe(true);
        });
        it('path points have correct structure', () => {
            const walls = [
                new Wall([100, 130], [120, 220]),
                new Wall([50, 55], [220, 60]),
                new Wall([220, 60], [250, 220]),
                new Wall([50, 220], [200, 220]),
                new Wall([50, 220], [50, 55]),
            ];
            const listener = new Listener([80, 100]);
            const source = new Source([200, 80]);
            const solver = new Solver(walls, source, 3);
            const paths = solver.getPaths(listener);
            // Each path should be an array of points
            for (const path of paths) {
                expect(Array.isArray(path)).toBe(true);
                expect(path.length).toBeGreaterThanOrEqual(2);
                // First point is listener position [x, y] (2 elements)
                expect(path[0][0]).toBe(80);
                expect(path[0][1]).toBe(100);
                // Last point should have null wall id (source) [x, y, null]
                const lastPoint = path[path.length - 1];
                expect(lastPoint[2]).toBeNull();
                // Points after the first should be [x, y, wallId]
                for (let i = 1; i < path.length; i++) {
                    const point = path[i];
                    expect(point.length).toBe(3);
                    expect(typeof point[0]).toBe('number');
                    expect(typeof point[1]).toBe('number');
                    expect(point[2] === null || typeof point[2] === 'number').toBe(true);
                }
            }
        });
    });
});
//# sourceMappingURL=beamtrace2d.test.js.map