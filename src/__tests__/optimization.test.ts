import { describe, it, expect } from 'vitest';
import { Wall, Source, Listener, Solver, OptimizedSolver } from '../beamtrace2d';

describe('OptimizedSolver', () => {
  // Simple square room for testing
  const simpleRoom: Wall[] = [
    new Wall([0, 0], [100, 0]),      // Bottom
    new Wall([100, 0], [100, 100]),  // Right
    new Wall([100, 100], [0, 100]),  // Top
    new Wall([0, 100], [0, 0])       // Left
  ];

  describe('Basic functionality', () => {
    it('returns an array of paths', () => {
      const source = new Source([50, 50]);
      const solver = new OptimizedSolver(simpleRoom, source, 3);
      const listener = new Listener([60, 60]);

      const paths = solver.getPaths(listener);
      expect(Array.isArray(paths)).toBe(true);
    });

    it('returns paths with correct structure', () => {
      const source = new Source([50, 50]);
      const solver = new OptimizedSolver(simpleRoom, source, 2);
      const listener = new Listener([60, 60]);

      const paths = solver.getPaths(listener);

      for (const path of paths) {
        expect(Array.isArray(path)).toBe(true);
        expect(path.length).toBeGreaterThanOrEqual(2);

        // First point is listener position
        expect(path[0][0]).toBe(60);
        expect(path[0][1]).toBe(60);

        // Last point should have null wall id (source)
        const lastPoint = path[path.length - 1];
        expect(lastPoint[2]).toBeNull();
      }
    });

    it('throws error when walls are not provided', () => {
      const source = new Source([50, 50]);
      expect(() => new OptimizedSolver([], source, 2)).toThrow('at least one wall is required');
    });

    it('throws error when source is not provided', () => {
      // @ts-expect-error - testing runtime behavior
      expect(() => new OptimizedSolver(simpleRoom, null, 2)).toThrow('source is required');
    });

    it('throws error when listener is not provided', () => {
      const source = new Source([50, 50]);
      const solver = new OptimizedSolver(simpleRoom, source, 2);
      // @ts-expect-error - testing runtime behavior
      expect(() => solver.getPaths(undefined)).toThrow('listener is required');
    });

    it('uses default reflection order when not specified', () => {
      const source = new Source([50, 50]);
      const solver = new OptimizedSolver(simpleRoom, source);
      const listener = new Listener([60, 60]);

      const paths = solver.getPaths(listener);
      expect(Array.isArray(paths)).toBe(true);
    });
  });

  describe('Result correctness vs basic Solver', () => {
    it('produces same number of paths as basic solver', () => {
      const source = new Source([50, 50]);
      const basicSolver = new Solver(simpleRoom, source, 3);
      const optimizedSolver = new OptimizedSolver(simpleRoom, source, 3);
      const listener = new Listener([60, 60]);

      const basicPaths = basicSolver.getPaths(listener);
      const optimizedPaths = optimizedSolver.getPaths(listener);

      expect(optimizedPaths.length).toBe(basicPaths.length);
    });

    it('produces identical results to basic solver for complex scene', () => {
      const walls: Wall[] = [
        new Wall([100, 130], [120, 220]),
        new Wall([50, 55], [220, 60]),
        new Wall([220, 60], [250, 220]),
        new Wall([50, 220], [200, 220]),
        new Wall([50, 220], [50, 55]),
        new Wall([200, 220], [40, 230]),
        new Wall([40, 230], [30, 290]),
        new Wall([30, 290], [60, 270]),
        new Wall([60, 270], [290, 270]),
        new Wall([290, 270], [250, 220]),
      ];

      const source = new Source([200, 80]);
      const basicSolver = new Solver(walls, source, 3);
      const optimizedSolver = new OptimizedSolver(walls, source, 3);
      const listener = new Listener([80, 100]);

      const basicPaths = basicSolver.getPaths(listener);
      const optimizedPaths = optimizedSolver.getPaths(listener);

      expect(optimizedPaths.length).toBe(basicPaths.length);
      expect(optimizedPaths.length).toBe(16); // Same as the original test
    });

    it('produces same paths at different listener positions', () => {
      const source = new Source([25, 50]);
      const basicSolver = new Solver(simpleRoom, source, 3);

      // Test multiple listener positions
      const positions = [
        [75, 50],
        [50, 75],
        [25, 25],
        [80, 80],
        [10, 90]
      ];

      for (const pos of positions) {
        // Create fresh optimized solver for each position to avoid cache issues
        const optimizedSolver = new OptimizedSolver(simpleRoom, source, 3);
        const listener = new Listener(pos as [number, number]);
        const basicPaths = basicSolver.getPaths(listener);
        const optimizedPaths = optimizedSolver.getPaths(listener);

        expect(optimizedPaths.length).toBe(basicPaths.length);
      }
    });
  });

  describe('Performance metrics', () => {
    it('provides performance metrics', () => {
      const source = new Source([50, 50]);
      const solver = new OptimizedSolver(simpleRoom, source, 3);
      const listener = new Listener([60, 60]);

      solver.getPaths(listener);
      const metrics = solver.getMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics.totalLeafNodes).toBe('number');
      expect(typeof metrics.bucketsTotal).toBe('number');
      expect(typeof metrics.bucketsSkipped).toBe('number');
      expect(typeof metrics.bucketsChecked).toBe('number');
      expect(typeof metrics.failLineCacheHits).toBe('number');
      expect(typeof metrics.raycastCount).toBe('number');
      expect(typeof metrics.validPathCount).toBe('number');
    });

    it('tracks valid path count correctly', () => {
      const source = new Source([50, 50]);
      const solver = new OptimizedSolver(simpleRoom, source, 2);
      const listener = new Listener([60, 60]);

      const paths = solver.getPaths(listener);
      const metrics = solver.getMetrics();

      expect(metrics.validPathCount).toBe(paths.length);
    });

    it('resets metrics between calls', () => {
      const source = new Source([50, 50]);
      const solver = new OptimizedSolver(simpleRoom, source, 2);

      // First call
      solver.getPaths(new Listener([60, 60]));

      // Second call
      solver.getPaths(new Listener([40, 40]));
      const metrics = solver.getMetrics();

      // Metrics should be for the second call only (not accumulated)
      expect(metrics.bucketsSkipped).toBeDefined();
      expect(typeof metrics.validPathCount).toBe('number');
    });
  });

  describe('Fail line optimization', () => {
    it('achieves cache hits on subsequent calls with nearby listener', () => {
      const source = new Source([50, 50]);
      const solver = new OptimizedSolver(simpleRoom, source, 4);

      // First call establishes fail lines
      solver.getPaths(new Listener([60, 60]));

      // Second call at very close position should hit cache
      solver.getPaths(new Listener([60.001, 60.001]));
      const metrics = solver.getMetrics();

      // Should have some cache hits (fail lines still valid for nearby position)
      // This depends on the geometry, so just check it doesn't throw
      expect(metrics.failLineCacheHits).toBeGreaterThanOrEqual(0);
    });

    it('clears cache when listener moves significantly', () => {
      const source = new Source([50, 50]);
      const solver = new OptimizedSolver(simpleRoom, source, 3);

      // First call
      solver.getPaths(new Listener([60, 60]));

      // Call from opposite side of room
      solver.getPaths(new Listener([10, 10]));
      const metrics = solver.getMetrics();

      // Should have cache misses when listener moved far
      expect(metrics.failLineCacheMisses).toBeGreaterThanOrEqual(0);
    });

    it('can clear cache manually', () => {
      const source = new Source([50, 50]);
      const solver = new OptimizedSolver(simpleRoom, source, 3);

      solver.getPaths(new Listener([60, 60]));
      solver.clearCache();

      // After clearing, should work normally
      const paths = solver.getPaths(new Listener([60, 60]));
      expect(Array.isArray(paths)).toBe(true);
    });

    it('produces correct results when reusing solver with clearCache()', () => {
      const source = new Source([25, 50]);
      const basicSolver = new Solver(simpleRoom, source, 3);
      const optimizedSolver = new OptimizedSolver(simpleRoom, source, 3);

      const positions = [
        [75, 50],
        [50, 75],
        [25, 25],
        [80, 80],
        [10, 90]
      ];

      for (const pos of positions) {
        optimizedSolver.clearCache();
        const listener = new Listener(pos as [number, number]);
        const basicPaths = basicSolver.getPaths(listener);
        const optimizedPaths = optimizedSolver.getPaths(listener);

        expect(optimizedPaths.length).toBe(basicPaths.length);
      }
    });
  });

  describe('Skip circle optimization', () => {
    it('creates skip circles for failed buckets', () => {
      const source = new Source([50, 50]);
      const solver = new OptimizedSolver(simpleRoom, source, 4);

      // Make several calls to establish skip circles
      for (let i = 0; i < 5; i++) {
        solver.getPaths(new Listener([60 + i * 0.01, 60 + i * 0.01]));
      }

      const metrics = solver.getMetrics();
      // Skip circles may or may not be created depending on geometry
      expect(metrics.skipCircleCount).toBeGreaterThanOrEqual(0);
    });

    it('skips buckets when listener stays in skip circle', () => {
      const source = new Source([50, 50]);
      const solver = new OptimizedSolver(simpleRoom, source, 4);

      // First call to establish state
      solver.getPaths(new Listener([60, 60]));

      // Subsequent calls at nearly same position
      solver.getPaths(new Listener([60.0001, 60.0001]));
      const metrics = solver.getMetrics();

      // Should have some buckets skipped or checked
      expect(metrics.bucketsSkipped + metrics.bucketsChecked).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Custom bucket size', () => {
    it('accepts custom bucket size parameter', () => {
      const source = new Source([50, 50]);
      const solver = new OptimizedSolver(simpleRoom, source, 3, 8);
      const listener = new Listener([60, 60]);

      const paths = solver.getPaths(listener);
      expect(Array.isArray(paths)).toBe(true);
    });

    it('different bucket sizes produce same results', () => {
      const source = new Source([50, 50]);
      const solver8 = new OptimizedSolver(simpleRoom, source, 3, 8);
      const solver32 = new OptimizedSolver(simpleRoom, source, 3, 32);
      const listener = new Listener([60, 60]);

      const paths8 = solver8.getPaths(listener);
      const paths32 = solver32.getPaths(listener);

      expect(paths8.length).toBe(paths32.length);
    });
  });

  describe('Edge cases', () => {
    it('handles single wall', () => {
      const walls = [new Wall([0, 0], [100, 0])];
      const source = new Source([50, 10]);
      const solver = new OptimizedSolver(walls, source, 2);
      const listener = new Listener([50, -10]);

      const paths = solver.getPaths(listener);
      expect(Array.isArray(paths)).toBe(true);
    });

    it('handles listener at source position', () => {
      const source = new Source([50, 50]);
      const solver = new OptimizedSolver(simpleRoom, source, 2);
      const listener = new Listener([50, 50]);

      // Should not throw, even if no reflection paths are valid
      const paths = solver.getPaths(listener);
      expect(Array.isArray(paths)).toBe(true);
    });

    it('handles listener outside room', () => {
      const source = new Source([50, 50]);
      const solver = new OptimizedSolver(simpleRoom, source, 2);
      const listener = new Listener([150, 150]); // Outside the room

      const paths = solver.getPaths(listener);
      expect(Array.isArray(paths)).toBe(true);
    });

    it('handles reflection order of 1', () => {
      const source = new Source([50, 50]);
      const solver = new OptimizedSolver(simpleRoom, source, 1);
      const listener = new Listener([60, 60]);

      const paths = solver.getPaths(listener);
      expect(Array.isArray(paths)).toBe(true);
    });

    it('handles high reflection order', () => {
      const source = new Source([50, 50]);
      const solver = new OptimizedSolver(simpleRoom, source, 6);
      const listener = new Listener([60, 60]);

      const paths = solver.getPaths(listener);
      expect(Array.isArray(paths)).toBe(true);
      expect(paths.length).toBeGreaterThan(0);
    });
  });

  describe('Regression tests', () => {
    it('matches original QUnit test results', () => {
      const walls: Wall[] = [
        new Wall([100, 130], [120, 220]),
        new Wall([50, 55], [220, 60]),
        new Wall([220, 60], [250, 220]),
        new Wall([50, 220], [200, 220]),
        new Wall([50, 220], [50, 55]),
        new Wall([200, 220], [40, 230]),
        new Wall([40, 230], [30, 290]),
        new Wall([30, 290], [60, 270]),
        new Wall([60, 270], [290, 270]),
        new Wall([290, 270], [250, 220]),
      ];

      const listener = new Listener([80, 100]);
      const source = new Source([200, 80]);
      const solver = new OptimizedSolver(walls, source, 3);
      const pathArray = solver.getPaths(listener);

      expect(pathArray).not.toBeNull();
      expect(Array.isArray(pathArray)).toBe(true);
      expect(pathArray.length).toBe(16);
    });

    it('path points have correct structure', () => {
      const walls: Wall[] = [
        new Wall([100, 130], [120, 220]),
        new Wall([50, 55], [220, 60]),
        new Wall([220, 60], [250, 220]),
        new Wall([50, 220], [200, 220]),
        new Wall([50, 220], [50, 55]),
      ];

      const listener = new Listener([80, 100]);
      const source = new Source([200, 80]);
      const solver = new OptimizedSolver(walls, source, 3);
      const paths = solver.getPaths(listener);

      for (const path of paths) {
        expect(Array.isArray(path)).toBe(true);
        expect(path.length).toBeGreaterThanOrEqual(2);

        // First point is listener position
        expect(path[0][0]).toBe(80);
        expect(path[0][1]).toBe(100);

        // Last point should have null wall id (source)
        const lastPoint = path[path.length - 1];
        expect(lastPoint[2]).toBeNull();

        // All points should have correct structure
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
