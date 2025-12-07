import { describe, it, expect } from 'vitest';
import { Wall, Source, Listener, Solver, DetailedReflectionPath, ReflectionDetail } from '../beamtrace2d';

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
      const walls: Wall[] = [
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
      const walls: Wall[] = [
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
      const directPath = paths.find(path =>
        path.length === 2 && path[1][2] === null
      );
      expect(directPath).toBeDefined();
    });

    // Replicate the original QUnit test
    // Note: v1.x used reflectionOrder=4 with a -2 offset bug, giving maxOrder=2
    // v2.0 fixed the API: reflectionOrder=3 now correctly gives 3 reflection levels (maxOrder=2)
    it('generates correct path_array for test scene', () => {
      const walls: Wall[] = [
        new Wall([100, 130], [120, 220]), // Wall id 0
        new Wall([50, 55], [220, 60]),    // Wall id 1
        new Wall([220, 60], [250, 220]),  // Wall id 2
        new Wall([50, 220], [200, 220]),  // Wall id 3
        new Wall([50, 220], [50, 55]),    // Wall id 4
        new Wall([200, 220], [40, 230]),  // Wall id 5
        new Wall([40, 230], [30, 290]),   // Wall id 6
        new Wall([30, 290], [60, 270]),   // Wall id 7
        new Wall([60, 270], [290, 270]),  // Wall id 8
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
      const walls: Wall[] = [
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
      const walls: Wall[] = [
        new Wall([0, 0], [100, 0]),
        new Wall([100, 0], [100, 100]),
      ];
      const source = new Source([50, 50]);
      const solver = new Solver(walls, source, 2);

      // @ts-expect-error - testing runtime behavior with invalid input
      expect(() => solver.getPaths(undefined)).toThrow('BeamTrace2D: listener is required');
    });

    it('uses default reflection order when not specified', () => {
      const walls: Wall[] = [
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
      const walls: Wall[] = [
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

  describe('Solver.getDetailedPaths', () => {
    it('returns an array of detailed paths', () => {
      const walls: Wall[] = [
        new Wall([0, 0], [100, 0]),
        new Wall([100, 0], [100, 100]),
        new Wall([100, 100], [0, 100]),
        new Wall([0, 100], [0, 0]),
      ];
      const source = new Source([50, 50]);
      const solver = new Solver(walls, source, 3);
      const listener = new Listener([60, 60]);

      const detailedPaths = solver.getDetailedPaths(listener);
      expect(Array.isArray(detailedPaths)).toBe(true);
    });

    it('returns same number of paths as getPaths', () => {
      const walls: Wall[] = [
        new Wall([0, 0], [100, 0]),
        new Wall([100, 0], [100, 100]),
        new Wall([100, 100], [0, 100]),
        new Wall([0, 100], [0, 0]),
      ];
      const source = new Source([50, 50]);
      const solver = new Solver(walls, source, 3);
      const listener = new Listener([60, 60]);

      const simplePaths = solver.getPaths(listener);
      const detailedPaths = solver.getDetailedPaths(listener);

      expect(detailedPaths.length).toBe(simplePaths.length);
    });

    it('detailed path has correct structure', () => {
      const walls: Wall[] = [
        new Wall([0, 0], [100, 0]),
        new Wall([100, 0], [100, 100]),
        new Wall([100, 100], [0, 100]),
        new Wall([0, 100], [0, 0]),
      ];
      const source = new Source([50, 50]);
      const solver = new Solver(walls, source, 3);
      const listener = new Listener([60, 60]);

      const detailedPaths = solver.getDetailedPaths(listener);

      for (const path of detailedPaths) {
        // Check structure
        expect(path.listenerPosition).toBeDefined();
        expect(path.sourcePosition).toBeDefined();
        expect(typeof path.totalPathLength).toBe('number');
        expect(typeof path.reflectionCount).toBe('number');
        expect(Array.isArray(path.reflections)).toBe(true);
        expect(Array.isArray(path.simplePath)).toBe(true);

        // Listener position should match
        expect(path.listenerPosition[0]).toBe(60);
        expect(path.listenerPosition[1]).toBe(60);

        // Source position should match
        expect(path.sourcePosition[0]).toBe(50);
        expect(path.sourcePosition[1]).toBe(50);
      }
    });

    it('direct path has zero reflections', () => {
      const walls: Wall[] = [
        new Wall([0, 0], [100, 0]),
        new Wall([100, 0], [100, 100]),
        new Wall([100, 100], [0, 100]),
        new Wall([0, 100], [0, 0]),
      ];
      const source = new Source([50, 50]);
      const solver = new Solver(walls, source, 2);
      const listener = new Listener([60, 60]);

      const detailedPaths = solver.getDetailedPaths(listener);

      // Find the direct path
      const directPath = detailedPaths.find(p => p.reflectionCount === 0);
      expect(directPath).toBeDefined();
      expect(directPath!.reflections.length).toBe(0);
    });

    it('reflection details have correct structure', () => {
      const walls: Wall[] = [
        new Wall([0, 0], [100, 0]),
        new Wall([100, 0], [100, 100]),
        new Wall([100, 100], [0, 100]),
        new Wall([0, 100], [0, 0]),
      ];
      const source = new Source([25, 50]);
      const solver = new Solver(walls, source, 2);
      const listener = new Listener([75, 50]);

      const detailedPaths = solver.getDetailedPaths(listener);

      // Find a path with at least one reflection
      const pathWithReflection = detailedPaths.find(p => p.reflectionCount > 0);
      expect(pathWithReflection).toBeDefined();

      for (const reflection of pathWithReflection!.reflections) {
        // Check all required fields
        expect(reflection.wall).toBeDefined();
        expect(typeof reflection.wallId).toBe('number');
        expect(Array.isArray(reflection.hitPoint)).toBe(true);
        expect(reflection.hitPoint.length).toBe(2);
        expect(typeof reflection.incidenceAngle).toBe('number');
        expect(typeof reflection.reflectionAngle).toBe('number');
        expect(Array.isArray(reflection.incomingDirection)).toBe(true);
        expect(reflection.incomingDirection.length).toBe(2);
        expect(Array.isArray(reflection.outgoingDirection)).toBe(true);
        expect(reflection.outgoingDirection.length).toBe(2);
        expect(Array.isArray(reflection.wallNormal)).toBe(true);
        expect(reflection.wallNormal.length).toBe(2);

        // Wall reference should match wallId
        expect(reflection.wall).toBe(walls[reflection.wallId]);
      }
    });

    it('incidence angle equals reflection angle for specular reflection', () => {
      const walls: Wall[] = [
        new Wall([0, 0], [100, 0]),
        new Wall([100, 0], [100, 100]),
        new Wall([100, 100], [0, 100]),
        new Wall([0, 100], [0, 0]),
      ];
      const source = new Source([25, 50]);
      const solver = new Solver(walls, source, 2);
      const listener = new Listener([75, 50]);

      const detailedPaths = solver.getDetailedPaths(listener);

      for (const path of detailedPaths) {
        for (const reflection of path.reflections) {
          expect(reflection.incidenceAngle).toBeCloseTo(reflection.reflectionAngle, 10);
        }
      }
    });

    it('angles are between 0 and PI/2 for valid reflections', () => {
      const walls: Wall[] = [
        new Wall([0, 0], [100, 0]),
        new Wall([100, 0], [100, 100]),
        new Wall([100, 100], [0, 100]),
        new Wall([0, 100], [0, 0]),
      ];
      const source = new Source([25, 50]);
      const solver = new Solver(walls, source, 3);
      const listener = new Listener([75, 50]);

      const detailedPaths = solver.getDetailedPaths(listener);

      for (const path of detailedPaths) {
        for (const reflection of path.reflections) {
          expect(reflection.incidenceAngle).toBeGreaterThanOrEqual(0);
          expect(reflection.incidenceAngle).toBeLessThanOrEqual(Math.PI / 2 + 0.01); // Small tolerance
        }
      }
    });

    it('direction vectors are normalized', () => {
      const walls: Wall[] = [
        new Wall([0, 0], [100, 0]),
        new Wall([100, 0], [100, 100]),
        new Wall([100, 100], [0, 100]),
        new Wall([0, 100], [0, 0]),
      ];
      const source = new Source([25, 50]);
      const solver = new Solver(walls, source, 2);
      const listener = new Listener([75, 50]);

      const detailedPaths = solver.getDetailedPaths(listener);

      for (const path of detailedPaths) {
        for (const reflection of path.reflections) {
          // Check incoming direction is normalized
          const inLen = Math.sqrt(
            reflection.incomingDirection[0] ** 2 + reflection.incomingDirection[1] ** 2
          );
          expect(inLen).toBeCloseTo(1, 10);

          // Check outgoing direction is normalized
          const outLen = Math.sqrt(
            reflection.outgoingDirection[0] ** 2 + reflection.outgoingDirection[1] ** 2
          );
          expect(outLen).toBeCloseTo(1, 10);

          // Check wall normal is normalized
          const normLen = Math.sqrt(
            reflection.wallNormal[0] ** 2 + reflection.wallNormal[1] ** 2
          );
          expect(normLen).toBeCloseTo(1, 10);
        }
      }
    });

    it('total path length is positive and consistent', () => {
      const walls: Wall[] = [
        new Wall([0, 0], [100, 0]),
        new Wall([100, 0], [100, 100]),
        new Wall([100, 100], [0, 100]),
        new Wall([0, 100], [0, 0]),
      ];
      const source = new Source([50, 50]);
      const solver = new Solver(walls, source, 3);
      const listener = new Listener([60, 60]);

      const detailedPaths = solver.getDetailedPaths(listener);

      for (const path of detailedPaths) {
        expect(path.totalPathLength).toBeGreaterThan(0);

        // Calculate expected length from simple path
        let expectedLength = 0;
        for (let i = 0; i < path.simplePath.length - 1; i++) {
          const p1 = path.simplePath[i];
          const p2 = path.simplePath[i + 1];
          const dx = p2[0] - p1[0];
          const dy = p2[1] - p1[1];
          expectedLength += Math.sqrt(dx * dx + dy * dy);
        }

        expect(path.totalPathLength).toBeCloseTo(expectedLength, 10);
      }
    });

    it('reflection count matches number of reflections array length', () => {
      const walls: Wall[] = [
        new Wall([0, 0], [100, 0]),
        new Wall([100, 0], [100, 100]),
        new Wall([100, 100], [0, 100]),
        new Wall([0, 100], [0, 0]),
      ];
      const source = new Source([25, 50]);
      const solver = new Solver(walls, source, 3);
      const listener = new Listener([75, 50]);

      const detailedPaths = solver.getDetailedPaths(listener);

      for (const path of detailedPaths) {
        expect(path.reflectionCount).toBe(path.reflections.length);
      }
    });

    it('throws error when listener is not provided', () => {
      const walls: Wall[] = [
        new Wall([0, 0], [100, 0]),
        new Wall([100, 0], [100, 100]),
      ];
      const source = new Source([50, 50]);
      const solver = new Solver(walls, source, 2);

      // @ts-expect-error - testing runtime behavior with invalid input
      expect(() => solver.getDetailedPaths(undefined)).toThrow('BeamTrace2D: listener is required');
    });

    it('simplePath in detailed result matches original path', () => {
      const walls: Wall[] = [
        new Wall([0, 0], [100, 0]),
        new Wall([100, 0], [100, 100]),
        new Wall([100, 100], [0, 100]),
        new Wall([0, 100], [0, 0]),
      ];
      const source = new Source([25, 50]);
      const solver = new Solver(walls, source, 2);
      const listener = new Listener([75, 50]);

      const simplePaths = solver.getPaths(listener);
      const detailedPaths = solver.getDetailedPaths(listener);

      // Each detailed path's simplePath should match one of the simple paths
      for (const detailedPath of detailedPaths) {
        const matchingSimplePath = simplePaths.find(sp =>
          JSON.stringify(sp) === JSON.stringify(detailedPath.simplePath)
        );
        expect(matchingSimplePath).toBeDefined();
      }
    });

    it('reflection order increments correctly', () => {
      const walls: Wall[] = [
        new Wall([0, 0], [100, 0]),
        new Wall([100, 0], [100, 100]),
        new Wall([100, 100], [0, 100]),
        new Wall([0, 100], [0, 0]),
      ];
      const source = new Source([25, 50]);
      const solver = new Solver(walls, source, 3);
      const listener = new Listener([75, 50]);

      const detailedPaths = solver.getDetailedPaths(listener);

      for (const path of detailedPaths) {
        for (let i = 0; i < path.reflections.length; i++) {
          expect(path.reflections[i].reflectionOrder).toBe(i + 1);
        }
      }
    });

    it('wall position is between 0 and 1', () => {
      const walls: Wall[] = [
        new Wall([0, 0], [100, 0]),
        new Wall([100, 0], [100, 100]),
        new Wall([100, 100], [0, 100]),
        new Wall([0, 100], [0, 0]),
      ];
      const source = new Source([25, 50]);
      const solver = new Solver(walls, source, 3);
      const listener = new Listener([75, 50]);

      const detailedPaths = solver.getDetailedPaths(listener);

      for (const path of detailedPaths) {
        for (const reflection of path.reflections) {
          expect(reflection.wallPosition).toBeGreaterThanOrEqual(0);
          expect(reflection.wallPosition).toBeLessThanOrEqual(1);
        }
      }
    });

    it('cumulative distance increases with each reflection', () => {
      const walls: Wall[] = [
        new Wall([0, 0], [100, 0]),
        new Wall([100, 0], [100, 100]),
        new Wall([100, 100], [0, 100]),
        new Wall([0, 100], [0, 0]),
      ];
      const source = new Source([25, 50]);
      const solver = new Solver(walls, source, 3);
      const listener = new Listener([75, 50]);

      const detailedPaths = solver.getDetailedPaths(listener);

      for (const path of detailedPaths) {
        let prevCumulative = 0;
        for (const reflection of path.reflections) {
          expect(reflection.cumulativeDistance).toBeGreaterThan(prevCumulative);
          prevCumulative = reflection.cumulativeDistance;
        }
      }
    });

    it('incoming segment length is positive', () => {
      const walls: Wall[] = [
        new Wall([0, 0], [100, 0]),
        new Wall([100, 0], [100, 100]),
        new Wall([100, 100], [0, 100]),
        new Wall([0, 100], [0, 0]),
      ];
      const source = new Source([25, 50]);
      const solver = new Solver(walls, source, 3);
      const listener = new Listener([75, 50]);

      const detailedPaths = solver.getDetailedPaths(listener);

      for (const path of detailedPaths) {
        for (const reflection of path.reflections) {
          expect(reflection.incomingSegmentLength).toBeGreaterThan(0);
        }
      }
    });

    it('isGrazing is a boolean', () => {
      const walls: Wall[] = [
        new Wall([0, 0], [100, 0]),
        new Wall([100, 0], [100, 100]),
        new Wall([100, 100], [0, 100]),
        new Wall([0, 100], [0, 0]),
      ];
      const source = new Source([25, 50]);
      const solver = new Solver(walls, source, 3);
      const listener = new Listener([75, 50]);

      const detailedPaths = solver.getDetailedPaths(listener);

      for (const path of detailedPaths) {
        for (const reflection of path.reflections) {
          expect(typeof reflection.isGrazing).toBe('boolean');
        }
      }
    });

    it('segments array has correct length', () => {
      const walls: Wall[] = [
        new Wall([0, 0], [100, 0]),
        new Wall([100, 0], [100, 100]),
        new Wall([100, 100], [0, 100]),
        new Wall([0, 100], [0, 0]),
      ];
      const source = new Source([25, 50]);
      const solver = new Solver(walls, source, 3);
      const listener = new Listener([75, 50]);

      const detailedPaths = solver.getDetailedPaths(listener);

      for (const path of detailedPaths) {
        // Number of segments = number of points - 1
        expect(path.segments.length).toBe(path.simplePath.length - 1);
      }
    });

    it('segment details have correct structure', () => {
      const walls: Wall[] = [
        new Wall([0, 0], [100, 0]),
        new Wall([100, 0], [100, 100]),
        new Wall([100, 100], [0, 100]),
        new Wall([0, 100], [0, 0]),
      ];
      const source = new Source([25, 50]);
      const solver = new Solver(walls, source, 2);
      const listener = new Listener([75, 50]);

      const detailedPaths = solver.getDetailedPaths(listener);

      for (const path of detailedPaths) {
        for (let i = 0; i < path.segments.length; i++) {
          const segment = path.segments[i];
          expect(Array.isArray(segment.startPoint)).toBe(true);
          expect(segment.startPoint.length).toBe(2);
          expect(Array.isArray(segment.endPoint)).toBe(true);
          expect(segment.endPoint.length).toBe(2);
          expect(typeof segment.length).toBe('number');
          expect(segment.length).toBeGreaterThan(0);
          expect(segment.segmentIndex).toBe(i);
        }
      }
    });

    it('segment lengths sum to total path length', () => {
      const walls: Wall[] = [
        new Wall([0, 0], [100, 0]),
        new Wall([100, 0], [100, 100]),
        new Wall([100, 100], [0, 100]),
        new Wall([0, 100], [0, 0]),
      ];
      const source = new Source([25, 50]);
      const solver = new Solver(walls, source, 3);
      const listener = new Listener([75, 50]);

      const detailedPaths = solver.getDetailedPaths(listener);

      for (const path of detailedPaths) {
        const sumOfSegments = path.segments.reduce((sum, seg) => sum + seg.length, 0);
        expect(sumOfSegments).toBeCloseTo(path.totalPathLength, 10);
      }
    });

    it('segments connect start to end points correctly', () => {
      const walls: Wall[] = [
        new Wall([0, 0], [100, 0]),
        new Wall([100, 0], [100, 100]),
        new Wall([100, 100], [0, 100]),
        new Wall([0, 100], [0, 0]),
      ];
      const source = new Source([25, 50]);
      const solver = new Solver(walls, source, 2);
      const listener = new Listener([75, 50]);

      const detailedPaths = solver.getDetailedPaths(listener);

      for (const path of detailedPaths) {
        // First segment starts at listener
        expect(path.segments[0].startPoint[0]).toBeCloseTo(path.listenerPosition[0], 10);
        expect(path.segments[0].startPoint[1]).toBeCloseTo(path.listenerPosition[1], 10);

        // Last segment ends at source
        const lastSegment = path.segments[path.segments.length - 1];
        expect(lastSegment.endPoint[0]).toBeCloseTo(path.sourcePosition[0], 10);
        expect(lastSegment.endPoint[1]).toBeCloseTo(path.sourcePosition[1], 10);

        // Each segment's end point is the next segment's start point
        for (let i = 0; i < path.segments.length - 1; i++) {
          expect(path.segments[i].endPoint[0]).toBeCloseTo(path.segments[i + 1].startPoint[0], 10);
          expect(path.segments[i].endPoint[1]).toBeCloseTo(path.segments[i + 1].startPoint[1], 10);
        }
      }
    });

    it('wall position correctly identifies hit location on wall', () => {
      // Create a simple room where we can predict the reflection point
      const walls: Wall[] = [
        new Wall([0, 0], [100, 0]),   // bottom wall
        new Wall([100, 0], [100, 100]), // right wall
        new Wall([100, 100], [0, 100]), // top wall
        new Wall([0, 100], [0, 0]),   // left wall
      ];
      const source = new Source([50, 25]);  // Near bottom
      const solver = new Solver(walls, source, 1);
      const listener = new Listener([50, 75]);  // Near top

      const detailedPaths = solver.getDetailedPaths(listener);

      // Find path that reflects off bottom wall (wall 0)
      const bottomReflection = detailedPaths.find(p =>
        p.reflections.length === 1 && p.reflections[0].wallId === 0
      );

      if (bottomReflection) {
        const reflection = bottomReflection.reflections[0];
        // For symmetric source/listener, hit point should be at x=50, which is t=0.5 on bottom wall
        expect(reflection.wallPosition).toBeCloseTo(0.5, 1);
      }
    });

    it('cumulative distance equals sum of previous segment lengths', () => {
      const walls: Wall[] = [
        new Wall([0, 0], [100, 0]),
        new Wall([100, 0], [100, 100]),
        new Wall([100, 100], [0, 100]),
        new Wall([0, 100], [0, 0]),
      ];
      const source = new Source([25, 50]);
      const solver = new Solver(walls, source, 3);
      const listener = new Listener([75, 50]);

      const detailedPaths = solver.getDetailedPaths(listener);

      for (const path of detailedPaths) {
        for (const reflection of path.reflections) {
          // Cumulative distance should equal sum of segments up to this reflection
          const segmentsUpToReflection = path.segments.slice(0, reflection.reflectionOrder);
          const expectedCumulative = segmentsUpToReflection.reduce((sum, seg) => sum + seg.length, 0);
          expect(reflection.cumulativeDistance).toBeCloseTo(expectedCumulative, 10);
        }
      }
    });
  });
});
