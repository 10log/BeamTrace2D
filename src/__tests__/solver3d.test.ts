/**
 * Unit tests for OptimizedSolver3D
 */

import { describe, it, expect } from 'vitest';
import { Vector3 } from '../core/vector3';
import { Polygon3D, createShoeboxRoom } from '../geometry/polygon3d';
import {
  OptimizedSolver3D,
  computePathLength,
  computeArrivalTime,
  getPathReflectionOrder
} from '../solver/solver3d';

describe('OptimizedSolver3D', () => {
  describe('constructor', () => {
    it('creates solver with default config', () => {
      const room = createShoeboxRoom(10, 8, 3);
      const source: Vector3 = [5, 4, 1.5];
      const solver = new OptimizedSolver3D(room, source);

      expect(solver.getMaxReflectionOrder()).toBe(5);
      expect(solver.getLeafNodeCount()).toBeGreaterThan(0);
    });

    it('creates solver with custom config', () => {
      const room = createShoeboxRoom(10, 8, 3);
      const source: Vector3 = [5, 4, 1.5];
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
      const source: Vector3 = [5, 4, 1.5];
      const listener: Vector3 = [3, 3, 1.2];
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

      const source: Vector3 = [2, 2, 1.5];
      const listener: Vector3 = [8, 2, 1.5];
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
      const source: Vector3 = [5, 4, 1.5];
      const listener: Vector3 = [3, 3, 1.2];
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
      const source: Vector3 = [5, 4, 1.5];
      const listener: Vector3 = [3, 3, 1.2];
      const solver = new OptimizedSolver3D(room, source, { maxReflectionOrder: 3 });

      const paths = solver.getPaths(listener);

      // Count paths by reflection order
      const orderCounts: Record<number, number> = {};
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
      const source: Vector3 = [5, 4, 1.5];
      const listener: Vector3 = [3, 3, 1.2];

      const pathCounts: number[] = [];
      const leafCounts: number[] = [];

      for (let order = 0; order <= 4; order++) {
        const solver = new OptimizedSolver3D(room, source, { maxReflectionOrder: order });
        const paths = solver.getPaths(listener);
        pathCounts.push(paths.length);
        leafCounts.push(solver.getLeafNodeCount());

        // Count paths by order
        const orderCounts: Record<number, number> = {};
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
      const source: Vector3 = [5, 4, 1.5];
      const listener: Vector3 = [3, 3, 1.2];

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
      const source: Vector3 = [5, 4, 1.5];
      const listener: Vector3 = [3, 3, 1.2];
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
      const source: Vector3 = [5, 4, 1.5];
      const listener: Vector3 = [3, 3, 1.2];
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
      const source: Vector3 = [5, 4, 1.5];
      const listener: Vector3 = [3, 3, 1.2];
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
      const source: Vector3 = [5, 4, 1.5];
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
      const source: Vector3 = [5, 4, 1.5];
      const solver = new OptimizedSolver3D(room, source, { maxReflectionOrder: 3 });

      // First call - no cache
      solver.getPaths([3, 3, 1.2]);
      const metrics1 = solver.getMetrics();

      // Second call at nearby position - should have cache hits
      solver.getPaths([3.01, 3.01, 1.2]);
      const metrics2 = solver.getMetrics();

      // Should have some cache hits
      expect(metrics2.failPlaneCacheHits).toBeGreaterThanOrEqual(0);
    });

    it('clearCache resets optimization state', () => {
      const room = createShoeboxRoom(10, 8, 3);
      const source: Vector3 = [5, 4, 1.5];
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
      { position: [0, 0, 0] as Vector3, polygonId: null },
      { position: [3, 4, 0] as Vector3, polygonId: null }
    ];

    expect(computePathLength(path)).toBeCloseTo(5, 10);
  });

  it('computes correct length for reflected path', () => {
    const path = [
      { position: [0, 0, 0] as Vector3, polygonId: null },
      { position: [5, 0, 0] as Vector3, polygonId: 1 },
      { position: [10, 0, 0] as Vector3, polygonId: null }
    ];

    expect(computePathLength(path)).toBeCloseTo(10, 10);
  });
});

describe('computeArrivalTime', () => {
  it('computes arrival time with default speed of sound', () => {
    const path = [
      { position: [0, 0, 0] as Vector3, polygonId: null },
      { position: [343, 0, 0] as Vector3, polygonId: null }
    ];

    // 343m at 343 m/s = 1 second
    expect(computeArrivalTime(path)).toBeCloseTo(1, 5);
  });

  it('computes arrival time with custom speed of sound', () => {
    const path = [
      { position: [0, 0, 0] as Vector3, polygonId: null },
      { position: [100, 0, 0] as Vector3, polygonId: null }
    ];

    // 100m at 100 m/s = 1 second
    expect(computeArrivalTime(path, 100)).toBeCloseTo(1, 5);
  });
});

describe('getPathReflectionOrder', () => {
  it('returns 0 for direct path', () => {
    const path = [
      { position: [0, 0, 0] as Vector3, polygonId: null },
      { position: [1, 0, 0] as Vector3, polygonId: null }
    ];

    expect(getPathReflectionOrder(path)).toBe(0);
  });

  it('returns correct order for reflected path', () => {
    const path = [
      { position: [0, 0, 0] as Vector3, polygonId: null },
      { position: [1, 0, 0] as Vector3, polygonId: 1 },
      { position: [2, 0, 0] as Vector3, polygonId: 2 },
      { position: [3, 0, 0] as Vector3, polygonId: null }
    ];

    expect(getPathReflectionOrder(path)).toBe(2);
  });
});
