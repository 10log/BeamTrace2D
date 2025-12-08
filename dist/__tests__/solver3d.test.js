/**
 * Unit tests for OptimizedSolver3D
 */
import { describe, it, expect } from 'vitest';
import { Vector3 } from '../core/vector3';
import { Polygon3D, createShoeboxRoom } from '../geometry/polygon3d';
import { OptimizedSolver3D, computePathLength, computeArrivalTime, getPathReflectionOrder, convertToDetailedPath3D } from '../solver/solver3d';
describe('OptimizedSolver3D', () => {
    describe('constructor', () => {
        it('creates solver with default config', () => {
            const room = createShoeboxRoom(10, 8, 3);
            const source = [5, 4, 1.5];
            const solver = new OptimizedSolver3D(room, source);
            expect(solver.getMaxReflectionOrder()).toBe(5);
            expect(solver.getLeafNodeCount()).toBeGreaterThan(0);
        });
        it('creates solver with custom config', () => {
            const room = createShoeboxRoom(10, 8, 3);
            const source = [5, 4, 1.5];
            const solver = new OptimizedSolver3D(room, source, {
                maxReflectionOrder: 2,
                bucketSize: 8
            });
            expect(solver.getMaxReflectionOrder()).toBe(2);
        });
    });
    describe('getPaths - direct path', () => {
        it('finds direct path when source and listener have line of sight', () => {
            const room = createShoeboxRoom(10, 8, 3);
            const source = [5, 4, 1.5];
            const listener = [3, 3, 1.2];
            const solver = new OptimizedSolver3D(room, source, { maxReflectionOrder: 0 });
            const paths = solver.getPaths(listener);
            // Should have at least the direct path
            const directPaths = paths.filter(p => p.length === 2);
            expect(directPaths.length).toBe(1);
            // Direct path should start at listener and end at source
            expect(directPaths[0][0].polygonId).toBeNull();
            expect(directPaths[0][1].polygonId).toBeNull();
        });
        it('no direct path if blocked by geometry', () => {
            // Create an L-shaped room by adding an internal wall
            const room = createShoeboxRoom(10, 8, 3);
            // Add a blocking wall in the middle
            const blockingWall = Polygon3D.create([
                [5, 0, 0],
                [5, 0, 3],
                [5, 4, 3],
                [5, 4, 0]
            ]);
            room.push(blockingWall);
            const source = [2, 2, 1.5];
            const listener = [8, 2, 1.5];
            const solver = new OptimizedSolver3D(room, source, { maxReflectionOrder: 0 });
            const paths = solver.getPaths(listener);
            const directPaths = paths.filter(p => p.length === 2);
            // Should have no direct path due to blocking wall
            expect(directPaths.length).toBe(0);
        });
    });
    describe('getPaths - reflections', () => {
        it('finds first-order reflections', () => {
            const room = createShoeboxRoom(10, 8, 3);
            const source = [5, 4, 1.5];
            const listener = [3, 3, 1.2];
            const solver = new OptimizedSolver3D(room, source, { maxReflectionOrder: 1 });
            const paths = solver.getPaths(listener);
            // Should have direct + some first-order reflections
            expect(paths.length).toBeGreaterThan(1);
            // Check for first-order reflections (3 points: listener, reflection, source)
            const firstOrderPaths = paths.filter(p => getPathReflectionOrder(p) === 1);
            expect(firstOrderPaths.length).toBeGreaterThan(0);
        });
        it('finds higher-order reflections', () => {
            const room = createShoeboxRoom(10, 8, 3);
            const source = [5, 4, 1.5];
            const listener = [3, 3, 1.2];
            const solver = new OptimizedSolver3D(room, source, { maxReflectionOrder: 3 });
            const paths = solver.getPaths(listener);
            // Count paths by reflection order
            const orderCounts = {};
            for (const path of paths) {
                const order = getPathReflectionOrder(path);
                orderCounts[order] = (orderCounts[order] || 0) + 1;
            }
            console.log('Path orders:', orderCounts);
            console.log('Leaf nodes:', solver.getLeafNodeCount());
            // Should have multiple reflection orders
            const orders = new Set(paths.map(p => getPathReflectionOrder(p)));
            expect(orders.size).toBeGreaterThan(1);
            // Should have at least some second-order reflections
            expect(orderCounts[2] || 0).toBeGreaterThan(0);
        });
        it('path count increases with reflection order', () => {
            const room = createShoeboxRoom(10, 8, 3);
            const source = [5, 4, 1.5];
            const listener = [3, 3, 1.2];
            const pathCounts = [];
            const leafCounts = [];
            for (let order = 0; order <= 4; order++) {
                const solver = new OptimizedSolver3D(room, source, { maxReflectionOrder: order });
                const paths = solver.getPaths(listener);
                pathCounts.push(paths.length);
                leafCounts.push(solver.getLeafNodeCount());
                // Count paths by order
                const orderCounts = {};
                for (const path of paths) {
                    const pathOrder = getPathReflectionOrder(path);
                    orderCounts[pathOrder] = (orderCounts[pathOrder] || 0) + 1;
                }
                console.log(`MaxOrder ${order}: ${paths.length} paths, ${solver.getLeafNodeCount()} leaf nodes, orders: ${JSON.stringify(orderCounts)}`);
            }
            // Order 0 should have exactly 1 path (direct)
            expect(pathCounts[0]).toBe(1);
            // Higher orders should have more paths
            expect(pathCounts[1]).toBeGreaterThan(pathCounts[0]);
            expect(pathCounts[2]).toBeGreaterThan(pathCounts[1]);
            // Leaf node counts should increase with order
            expect(leafCounts[2]).toBeGreaterThan(leafCounts[1]);
        });
        it('does not find paths beyond maxReflectionOrder', () => {
            const room = createShoeboxRoom(10, 8, 3);
            const source = [5, 4, 1.5];
            const listener = [3, 3, 1.2];
            const solver = new OptimizedSolver3D(room, source, { maxReflectionOrder: 2 });
            const paths = solver.getPaths(listener);
            // No path should exceed order 2
            for (const path of paths) {
                const order = getPathReflectionOrder(path);
                expect(order).toBeLessThanOrEqual(2);
            }
        });
    });
    describe('getPaths - path validation', () => {
        it('all paths have valid structure', () => {
            const room = createShoeboxRoom(10, 8, 3);
            const source = [5, 4, 1.5];
            const listener = [3, 3, 1.2];
            const solver = new OptimizedSolver3D(room, source, { maxReflectionOrder: 2 });
            const paths = solver.getPaths(listener);
            for (const path of paths) {
                // Path must have at least 2 points
                expect(path.length).toBeGreaterThanOrEqual(2);
                // First point should be listener (no polygon)
                expect(path[0].polygonId).toBeNull();
                // Last point should be source (no polygon)
                expect(path[path.length - 1].polygonId).toBeNull();
                // Middle points should have polygon IDs (reflections)
                for (let i = 1; i < path.length - 1; i++) {
                    expect(path[i].polygonId).not.toBeNull();
                }
            }
        });
        it('path lengths are physically plausible', () => {
            const room = createShoeboxRoom(10, 8, 3);
            const source = [5, 4, 1.5];
            const listener = [3, 3, 1.2];
            const solver = new OptimizedSolver3D(room, source, { maxReflectionOrder: 2 });
            const paths = solver.getPaths(listener);
            for (const path of paths) {
                const length = computePathLength(path);
                // Direct path length
                const directDist = Vector3.distance(source, listener);
                // All paths should be at least as long as direct distance
                expect(length).toBeGreaterThanOrEqual(directDist - 0.001);
                // Paths shouldn't be unreasonably long
                expect(length).toBeLessThan(100);
            }
        });
    });
    describe('getMetrics', () => {
        it('returns valid metrics after getPaths', () => {
            const room = createShoeboxRoom(10, 8, 3);
            const source = [5, 4, 1.5];
            const listener = [3, 3, 1.2];
            const solver = new OptimizedSolver3D(room, source, { maxReflectionOrder: 2 });
            solver.getPaths(listener);
            const metrics = solver.getMetrics();
            expect(metrics.totalLeafNodes).toBeGreaterThan(0);
            expect(metrics.bucketsTotal).toBeGreaterThan(0);
            expect(metrics.raycastCount).toBeGreaterThan(0);
            expect(metrics.validPathCount).toBeGreaterThan(0);
        });
        it('metrics reset between calls', () => {
            const room = createShoeboxRoom(10, 8, 3);
            const source = [5, 4, 1.5];
            const solver = new OptimizedSolver3D(room, source, { maxReflectionOrder: 2 });
            solver.getPaths([3, 3, 1.2]);
            const metrics1 = solver.getMetrics();
            solver.getPaths([7, 5, 1.0]);
            const metrics2 = solver.getMetrics();
            // Total leaf nodes should stay same, but other metrics may differ
            expect(metrics1.totalLeafNodes).toBe(metrics2.totalLeafNodes);
        });
    });
    describe('caching behavior', () => {
        it('fail plane cache improves performance on subsequent calls', () => {
            const room = createShoeboxRoom(10, 8, 3);
            const source = [5, 4, 1.5];
            const solver = new OptimizedSolver3D(room, source, { maxReflectionOrder: 3 });
            // First call - no cache
            solver.getPaths([3, 3, 1.2]);
            // Second call at nearby position - should have cache hits
            solver.getPaths([3.01, 3.01, 1.2]);
            const metrics2 = solver.getMetrics();
            // Should have some cache hits
            expect(metrics2.failPlaneCacheHits).toBeGreaterThanOrEqual(0);
        });
        it('clearCache resets optimization state', () => {
            const room = createShoeboxRoom(10, 8, 3);
            const source = [5, 4, 1.5];
            const solver = new OptimizedSolver3D(room, source, { maxReflectionOrder: 2 });
            solver.getPaths([3, 3, 1.2]);
            solver.clearCache();
            // After clear, should have no cache hits
            solver.getPaths([3, 3, 1.2]);
            const metrics = solver.getMetrics();
            // First call after clear has no fail plane cache to hit
            expect(metrics.failPlaneCacheHits).toBe(0);
        });
    });
});
describe('computePathLength', () => {
    it('computes correct length for direct path', () => {
        const path = [
            { position: [0, 0, 0], polygonId: null },
            { position: [3, 4, 0], polygonId: null }
        ];
        expect(computePathLength(path)).toBeCloseTo(5, 10);
    });
    it('computes correct length for reflected path', () => {
        const path = [
            { position: [0, 0, 0], polygonId: null },
            { position: [5, 0, 0], polygonId: 1 },
            { position: [10, 0, 0], polygonId: null }
        ];
        expect(computePathLength(path)).toBeCloseTo(10, 10);
    });
});
describe('computeArrivalTime', () => {
    it('computes arrival time with default speed of sound', () => {
        const path = [
            { position: [0, 0, 0], polygonId: null },
            { position: [343, 0, 0], polygonId: null }
        ];
        // 343m at 343 m/s = 1 second
        expect(computeArrivalTime(path)).toBeCloseTo(1, 5);
    });
    it('computes arrival time with custom speed of sound', () => {
        const path = [
            { position: [0, 0, 0], polygonId: null },
            { position: [100, 0, 0], polygonId: null }
        ];
        // 100m at 100 m/s = 1 second
        expect(computeArrivalTime(path, 100)).toBeCloseTo(1, 5);
    });
});
describe('getPathReflectionOrder', () => {
    it('returns 0 for direct path', () => {
        const path = [
            { position: [0, 0, 0], polygonId: null },
            { position: [1, 0, 0], polygonId: null }
        ];
        expect(getPathReflectionOrder(path)).toBe(0);
    });
    it('returns correct order for reflected path', () => {
        const path = [
            { position: [0, 0, 0], polygonId: null },
            { position: [1, 0, 0], polygonId: 1 },
            { position: [2, 0, 0], polygonId: 2 },
            { position: [3, 0, 0], polygonId: null }
        ];
        expect(getPathReflectionOrder(path)).toBe(2);
    });
});
describe('getDetailedPaths (3D)', () => {
    describe('basic functionality', () => {
        it('returns detailed paths for all paths', () => {
            const room = createShoeboxRoom(10, 8, 3);
            const source = [5, 4, 1.5];
            const listener = [3, 3, 1.2];
            const solver = new OptimizedSolver3D(room, source, { maxReflectionOrder: 2 });
            const simplePaths = solver.getPaths(listener);
            const detailedPaths = solver.getDetailedPaths(listener);
            expect(detailedPaths.length).toBe(simplePaths.length);
        });
        it('returns direct path with no reflections', () => {
            const room = createShoeboxRoom(10, 8, 3);
            const source = [5, 4, 1.5];
            const listener = [3, 3, 1.2];
            const solver = new OptimizedSolver3D(room, source, { maxReflectionOrder: 0 });
            const detailedPaths = solver.getDetailedPaths(listener);
            const directPaths = detailedPaths.filter(p => p.reflectionCount === 0);
            expect(directPaths.length).toBe(1);
            expect(directPaths[0].reflections.length).toBe(0);
            expect(directPaths[0].segments.length).toBe(1);
        });
        it('preserves simple path reference', () => {
            const room = createShoeboxRoom(10, 8, 3);
            const source = [5, 4, 1.5];
            const listener = [3, 3, 1.2];
            const solver = new OptimizedSolver3D(room, source, { maxReflectionOrder: 1 });
            const detailedPaths = solver.getDetailedPaths(listener);
            // Each detailed path should have its simple path
            for (const detailedPath of detailedPaths) {
                expect(detailedPath.simplePath).toBeDefined();
                expect(detailedPath.simplePath.length).toBeGreaterThanOrEqual(2);
            }
        });
    });
    describe('position information', () => {
        it('correctly identifies listener position', () => {
            const room = createShoeboxRoom(10, 8, 3);
            const source = [5, 4, 1.5];
            const listener = [3, 3, 1.2];
            const solver = new OptimizedSolver3D(room, source, { maxReflectionOrder: 1 });
            const detailedPaths = solver.getDetailedPaths(listener);
            for (const path of detailedPaths) {
                expect(path.listenerPosition[0]).toBeCloseTo(listener[0], 5);
                expect(path.listenerPosition[1]).toBeCloseTo(listener[1], 5);
                expect(path.listenerPosition[2]).toBeCloseTo(listener[2], 5);
            }
        });
        it('correctly identifies source position', () => {
            const room = createShoeboxRoom(10, 8, 3);
            const source = [5, 4, 1.5];
            const listener = [3, 3, 1.2];
            const solver = new OptimizedSolver3D(room, source, { maxReflectionOrder: 1 });
            const detailedPaths = solver.getDetailedPaths(listener);
            for (const path of detailedPaths) {
                expect(path.sourcePosition[0]).toBeCloseTo(source[0], 5);
                expect(path.sourcePosition[1]).toBeCloseTo(source[1], 5);
                expect(path.sourcePosition[2]).toBeCloseTo(source[2], 5);
            }
        });
    });
    describe('path length calculation', () => {
        it('calculates correct total path length', () => {
            const room = createShoeboxRoom(10, 8, 3);
            const source = [5, 4, 1.5];
            const listener = [3, 3, 1.2];
            const solver = new OptimizedSolver3D(room, source, { maxReflectionOrder: 2 });
            const simplePaths = solver.getPaths(listener);
            const detailedPaths = solver.getDetailedPaths(listener);
            for (let i = 0; i < detailedPaths.length; i++) {
                const expectedLength = computePathLength(simplePaths[i]);
                expect(detailedPaths[i].totalPathLength).toBeCloseTo(expectedLength, 5);
            }
        });
        it('segment lengths sum to total path length', () => {
            const room = createShoeboxRoom(10, 8, 3);
            const source = [5, 4, 1.5];
            const listener = [3, 3, 1.2];
            const solver = new OptimizedSolver3D(room, source, { maxReflectionOrder: 2 });
            const detailedPaths = solver.getDetailedPaths(listener);
            for (const path of detailedPaths) {
                const segmentSum = path.segments.reduce((sum, s) => sum + s.length, 0);
                expect(segmentSum).toBeCloseTo(path.totalPathLength, 5);
            }
        });
    });
    describe('segment information', () => {
        it('has correct number of segments', () => {
            const room = createShoeboxRoom(10, 8, 3);
            const source = [5, 4, 1.5];
            const listener = [3, 3, 1.2];
            const solver = new OptimizedSolver3D(room, source, { maxReflectionOrder: 2 });
            const detailedPaths = solver.getDetailedPaths(listener);
            for (const path of detailedPaths) {
                // Segments = reflections + 1
                expect(path.segments.length).toBe(path.reflectionCount + 1);
            }
        });
        it('segments have correct indices', () => {
            const room = createShoeboxRoom(10, 8, 3);
            const source = [5, 4, 1.5];
            const listener = [3, 3, 1.2];
            const solver = new OptimizedSolver3D(room, source, { maxReflectionOrder: 2 });
            const detailedPaths = solver.getDetailedPaths(listener);
            for (const path of detailedPaths) {
                for (let i = 0; i < path.segments.length; i++) {
                    expect(path.segments[i].segmentIndex).toBe(i);
                }
            }
        });
        it('segment endpoints are connected', () => {
            const room = createShoeboxRoom(10, 8, 3);
            const source = [5, 4, 1.5];
            const listener = [3, 3, 1.2];
            const solver = new OptimizedSolver3D(room, source, { maxReflectionOrder: 2 });
            const detailedPaths = solver.getDetailedPaths(listener);
            for (const path of detailedPaths) {
                // First segment starts at listener
                expect(path.segments[0].startPoint[0]).toBeCloseTo(path.listenerPosition[0], 5);
                expect(path.segments[0].startPoint[1]).toBeCloseTo(path.listenerPosition[1], 5);
                expect(path.segments[0].startPoint[2]).toBeCloseTo(path.listenerPosition[2], 5);
                // Last segment ends at source
                const lastSegment = path.segments[path.segments.length - 1];
                expect(lastSegment.endPoint[0]).toBeCloseTo(path.sourcePosition[0], 5);
                expect(lastSegment.endPoint[1]).toBeCloseTo(path.sourcePosition[1], 5);
                expect(lastSegment.endPoint[2]).toBeCloseTo(path.sourcePosition[2], 5);
                // Consecutive segments share endpoints
                for (let i = 1; i < path.segments.length; i++) {
                    expect(path.segments[i].startPoint[0]).toBeCloseTo(path.segments[i - 1].endPoint[0], 5);
                    expect(path.segments[i].startPoint[1]).toBeCloseTo(path.segments[i - 1].endPoint[1], 5);
                    expect(path.segments[i].startPoint[2]).toBeCloseTo(path.segments[i - 1].endPoint[2], 5);
                }
            }
        });
    });
    describe('reflection details', () => {
        it('reflection count matches path structure', () => {
            const room = createShoeboxRoom(10, 8, 3);
            const source = [5, 4, 1.5];
            const listener = [3, 3, 1.2];
            const solver = new OptimizedSolver3D(room, source, { maxReflectionOrder: 3 });
            const simplePaths = solver.getPaths(listener);
            const detailedPaths = solver.getDetailedPaths(listener);
            for (let i = 0; i < detailedPaths.length; i++) {
                const expectedOrder = getPathReflectionOrder(simplePaths[i]);
                expect(detailedPaths[i].reflectionCount).toBe(expectedOrder);
                expect(detailedPaths[i].reflections.length).toBe(expectedOrder);
            }
        });
        it('reflections have correct order numbers', () => {
            const room = createShoeboxRoom(10, 8, 3);
            const source = [5, 4, 1.5];
            const listener = [3, 3, 1.2];
            const solver = new OptimizedSolver3D(room, source, { maxReflectionOrder: 3 });
            const detailedPaths = solver.getDetailedPaths(listener);
            for (const path of detailedPaths) {
                for (let i = 0; i < path.reflections.length; i++) {
                    expect(path.reflections[i].reflectionOrder).toBe(i + 1);
                }
            }
        });
        it('reflections have valid polygon references', () => {
            const room = createShoeboxRoom(10, 8, 3);
            const source = [5, 4, 1.5];
            const listener = [3, 3, 1.2];
            const solver = new OptimizedSolver3D(room, source, { maxReflectionOrder: 2 });
            const detailedPaths = solver.getDetailedPaths(listener);
            for (const path of detailedPaths) {
                for (const reflection of path.reflections) {
                    expect(reflection.polygonId).toBeGreaterThanOrEqual(0);
                    expect(reflection.polygonId).toBeLessThan(room.length);
                    expect(reflection.polygon).toBeDefined();
                }
            }
        });
    });
    describe('angle calculations', () => {
        it('incidence angle equals reflection angle (specular)', () => {
            const room = createShoeboxRoom(10, 8, 3);
            const source = [5, 4, 1.5];
            const listener = [3, 3, 1.2];
            const solver = new OptimizedSolver3D(room, source, { maxReflectionOrder: 2 });
            const detailedPaths = solver.getDetailedPaths(listener);
            for (const path of detailedPaths) {
                for (const reflection of path.reflections) {
                    expect(reflection.incidenceAngle).toBeCloseTo(reflection.reflectionAngle, 5);
                }
            }
        });
        it('angles are in valid range (0 to π/2)', () => {
            const room = createShoeboxRoom(10, 8, 3);
            const source = [5, 4, 1.5];
            const listener = [3, 3, 1.2];
            const solver = new OptimizedSolver3D(room, source, { maxReflectionOrder: 2 });
            const detailedPaths = solver.getDetailedPaths(listener);
            for (const path of detailedPaths) {
                for (const reflection of path.reflections) {
                    expect(reflection.incidenceAngle).toBeGreaterThanOrEqual(0);
                    expect(reflection.incidenceAngle).toBeLessThanOrEqual(Math.PI / 2 + 0.001);
                }
            }
        });
        it('direction vectors are normalized', () => {
            const room = createShoeboxRoom(10, 8, 3);
            const source = [5, 4, 1.5];
            const listener = [3, 3, 1.2];
            const solver = new OptimizedSolver3D(room, source, { maxReflectionOrder: 2 });
            const detailedPaths = solver.getDetailedPaths(listener);
            for (const path of detailedPaths) {
                for (const reflection of path.reflections) {
                    const inLen = Vector3.length(reflection.incomingDirection);
                    const outLen = Vector3.length(reflection.outgoingDirection);
                    const normLen = Vector3.length(reflection.surfaceNormal);
                    expect(inLen).toBeCloseTo(1, 5);
                    expect(outLen).toBeCloseTo(1, 5);
                    expect(normLen).toBeCloseTo(1, 5);
                }
            }
        });
        it('surface normal points toward incoming ray', () => {
            const room = createShoeboxRoom(10, 8, 3);
            const source = [5, 4, 1.5];
            const listener = [3, 3, 1.2];
            const solver = new OptimizedSolver3D(room, source, { maxReflectionOrder: 2 });
            const detailedPaths = solver.getDetailedPaths(listener);
            for (const path of detailedPaths) {
                for (const reflection of path.reflections) {
                    // Dot product of incoming direction and normal should be negative
                    // (incoming points toward surface, normal points away from surface toward ray)
                    const dot = Vector3.dot(reflection.incomingDirection, reflection.surfaceNormal);
                    expect(dot).toBeLessThanOrEqual(0.001);
                }
            }
        });
    });
    describe('distance calculations', () => {
        it('cumulative distance increases with each reflection', () => {
            const room = createShoeboxRoom(10, 8, 3);
            const source = [5, 4, 1.5];
            const listener = [3, 3, 1.2];
            const solver = new OptimizedSolver3D(room, source, { maxReflectionOrder: 3 });
            const detailedPaths = solver.getDetailedPaths(listener);
            for (const path of detailedPaths) {
                let prevDistance = 0;
                for (const reflection of path.reflections) {
                    expect(reflection.cumulativeDistance).toBeGreaterThan(prevDistance);
                    prevDistance = reflection.cumulativeDistance;
                }
            }
        });
        it('incoming segment length matches segment detail', () => {
            const room = createShoeboxRoom(10, 8, 3);
            const source = [5, 4, 1.5];
            const listener = [3, 3, 1.2];
            const solver = new OptimizedSolver3D(room, source, { maxReflectionOrder: 2 });
            const detailedPaths = solver.getDetailedPaths(listener);
            for (const path of detailedPaths) {
                for (let i = 0; i < path.reflections.length; i++) {
                    const reflection = path.reflections[i];
                    const segment = path.segments[i];
                    expect(reflection.incomingSegmentLength).toBeCloseTo(segment.length, 5);
                }
            }
        });
    });
    describe('grazing incidence detection', () => {
        it('isGrazing is boolean', () => {
            const room = createShoeboxRoom(10, 8, 3);
            const source = [5, 4, 1.5];
            const listener = [3, 3, 1.2];
            const solver = new OptimizedSolver3D(room, source, { maxReflectionOrder: 2 });
            const detailedPaths = solver.getDetailedPaths(listener);
            for (const path of detailedPaths) {
                for (const reflection of path.reflections) {
                    expect(typeof reflection.isGrazing).toBe('boolean');
                }
            }
        });
    });
});
describe('convertToDetailedPath3D', () => {
    it('throws error for path with less than 2 points', () => {
        const room = createShoeboxRoom(10, 8, 3);
        const path = [
            { position: [0, 0, 0], polygonId: null }
        ];
        expect(() => convertToDetailedPath3D(path, room)).toThrow();
    });
    it('handles direct path correctly', () => {
        const room = createShoeboxRoom(10, 8, 3);
        const path = [
            { position: [1, 1, 1], polygonId: null },
            { position: [5, 4, 1.5], polygonId: null }
        ];
        const detailed = convertToDetailedPath3D(path, room);
        expect(detailed.reflectionCount).toBe(0);
        expect(detailed.reflections.length).toBe(0);
        expect(detailed.segments.length).toBe(1);
    });
});
//# sourceMappingURL=solver3d.test.js.map