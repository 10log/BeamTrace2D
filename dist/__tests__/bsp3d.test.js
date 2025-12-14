/**
 * Unit tests for BSP3D ray tracing
 *
 * These tests specifically verify that the BSP traversal correctly finds
 * ray-polygon intersections, including the fix for polygons in "far" subtrees
 * that were previously being incorrectly pruned.
 */
import { describe, it, expect } from 'vitest';
import { Vector3 } from '../core/vector3';
import { Polygon3D } from '../geometry/polygon3d';
import { buildBSP, rayTraceBSP, rayTraceBSPMultiIgnore, countNodes, treeDepth } from '../structures/bsp3d';
describe('BSP3D', () => {
    describe('buildBSP', () => {
        it('returns null for empty polygon list', () => {
            const bsp = buildBSP([]);
            expect(bsp).toBeNull();
        });
        it('builds tree from single polygon', () => {
            const polygon = Polygon3D.create([
                [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]
            ]);
            const bsp = buildBSP([polygon]);
            expect(bsp).not.toBeNull();
            expect(countNodes(bsp)).toBe(1);
            expect(treeDepth(bsp)).toBe(1);
        });
        it('builds tree from multiple polygons', () => {
            const polygons = [
                Polygon3D.create([[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]]),
                Polygon3D.create([[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]]),
                Polygon3D.create([[0, 0, 2], [1, 0, 2], [1, 1, 2], [0, 1, 2]])
            ];
            const bsp = buildBSP(polygons);
            expect(bsp).not.toBeNull();
            expect(countNodes(bsp)).toBeGreaterThanOrEqual(3);
        });
    });
    describe('rayTraceBSP - basic functionality', () => {
        it('finds intersection with single polygon', () => {
            const polygon = Polygon3D.create([
                [0, 0, 0], [2, 0, 0], [2, 2, 0], [0, 2, 0]
            ]);
            const bsp = buildBSP([polygon]);
            // Ray from above, pointing down
            const origin = [1, 1, 5];
            const direction = [0, 0, -1];
            const hit = rayTraceBSP(origin, direction, bsp);
            expect(hit).not.toBeNull();
            expect(hit.t).toBeCloseTo(5);
            expect(hit.point[0]).toBeCloseTo(1);
            expect(hit.point[1]).toBeCloseTo(1);
            expect(hit.point[2]).toBeCloseTo(0);
        });
        it('returns null when ray misses polygon', () => {
            const polygon = Polygon3D.create([
                [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]
            ]);
            const bsp = buildBSP([polygon]);
            // Ray that misses the polygon
            const origin = [5, 5, 5];
            const direction = [0, 0, -1];
            const hit = rayTraceBSP(origin, direction, bsp);
            expect(hit).toBeNull();
        });
        it('respects tMin and tMax bounds', () => {
            const polygon = Polygon3D.create([
                [0, 0, 0], [2, 0, 0], [2, 2, 0], [0, 2, 0]
            ]);
            const bsp = buildBSP([polygon]);
            const origin = [1, 1, 5];
            const direction = [0, 0, -1];
            // tMax before intersection
            const hit1 = rayTraceBSP(origin, direction, bsp, 0, 3);
            expect(hit1).toBeNull();
            // tMin after intersection
            const hit2 = rayTraceBSP(origin, direction, bsp, 6, 10);
            expect(hit2).toBeNull();
            // Correct range
            const hit3 = rayTraceBSP(origin, direction, bsp, 0, 10);
            expect(hit3).not.toBeNull();
        });
        it('ignores specified polygon ID', () => {
            const polygon = Polygon3D.create([
                [0, 0, 0], [2, 0, 0], [2, 2, 0], [0, 2, 0]
            ]);
            const bsp = buildBSP([polygon]);
            const origin = [1, 1, 5];
            const direction = [0, 0, -1];
            // Ignore polygon 0
            const hit = rayTraceBSP(origin, direction, bsp, 0, Infinity, 0);
            expect(hit).toBeNull();
        });
    });
    describe('rayTraceBSP - multiple polygons', () => {
        it('finds closest intersection', () => {
            // Two parallel polygons at different heights
            const polygons = [
                Polygon3D.create([[0, 0, 0], [2, 0, 0], [2, 2, 0], [0, 2, 0]]), // z=0
                Polygon3D.create([[0, 0, 2], [2, 0, 2], [2, 2, 2], [0, 2, 2]]) // z=2
            ];
            const bsp = buildBSP(polygons);
            // Ray from above
            const origin = [1, 1, 5];
            const direction = [0, 0, -1];
            const hit = rayTraceBSP(origin, direction, bsp);
            expect(hit).not.toBeNull();
            // Should hit the higher polygon first (z=2)
            expect(hit.point[2]).toBeCloseTo(2);
        });
    });
    describe('rayTraceBSP - far subtree traversal fix', () => {
        /**
         * This test verifies the fix for the BSP pruning bug.
         *
         * The bug: When tSplit > tMax (or tSplit < tMin), the old code only
         * checked the "near" subtree and skipped the "far" subtree entirely.
         * However, polygons in the far subtree can still intersect the ray
         * if they're not coplanar with the splitting plane.
         *
         * This test creates a geometry where a blocking polygon would be
         * placed in the "far" subtree by the BSP construction, and verifies
         * that ray tracing still finds it.
         */
        it('finds intersections in far subtree when tSplit is out of range', () => {
            // Create polygons that will be partitioned into different subtrees
            // Polygon 0: Large floor at z=0 (likely splitting plane)
            // Polygon 1: Small wall at y=5, well above the ray's tMax
            // The wall should still be found even if BSP would prune it
            const floor = Polygon3D.create([
                [0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0]
            ]);
            // Wall perpendicular to Y axis at y=5
            const wall = Polygon3D.create([
                [3, 5, 0], [3, 5, 3], [7, 5, 3], [7, 5, 0]
            ]);
            const bsp = buildBSP([floor, wall]);
            // Ray from y=2 toward y=8, should hit the wall at y=5
            const origin = [5, 2, 1.5];
            const direction = [0, 1, 0];
            const hit = rayTraceBSP(origin, direction, bsp, 0, 10);
            expect(hit).not.toBeNull();
            expect(hit.point[1]).toBeCloseTo(5); // Should hit at y=5
        });
        it('finds wall intersection when ray origin is far from splitting plane', () => {
            // This tests the specific case from the Concord Hall bug:
            // Ray starting far from a polygon's plane should still find it
            // Create an L-shaped configuration
            const floor = Polygon3D.create([
                [0, 0, 0], [12, 0, 0], [12, 12, 0], [0, 12, 0]
            ]);
            // Inner wall at y=6, x from 6 to 12
            const innerWall = Polygon3D.create([
                [6, 6, 0], [6, 6, 3], [12, 6, 3], [12, 6, 0]
            ]);
            const bsp = buildBSP([floor, innerWall]);
            // Ray that crosses y=6 boundary
            const origin = [8, 4, 0.5];
            const target = [4, 10, 1.0];
            const dir = Vector3.normalize(Vector3.subtract(target, origin));
            const maxDist = Vector3.distance(target, origin);
            const hit = rayTraceBSP(origin, dir, bsp, 0.001, maxDist - 0.001);
            // Should hit the inner wall
            expect(hit).not.toBeNull();
            expect(hit.point[1]).toBeCloseTo(6, 1);
        });
    });
    describe('rayTraceBSPMultiIgnore', () => {
        it('ignores multiple polygon IDs', () => {
            const polygons = [
                Polygon3D.create([[0, 0, 0], [2, 0, 0], [2, 2, 0], [0, 2, 0]]), // id 0
                Polygon3D.create([[0, 0, 1], [2, 0, 1], [2, 2, 1], [0, 2, 1]]), // id 1
                Polygon3D.create([[0, 0, 2], [2, 0, 2], [2, 2, 2], [0, 2, 2]]) // id 2
            ];
            const bsp = buildBSP(polygons);
            const origin = [1, 1, 5];
            const direction = [0, 0, -1];
            // Ignore polygons 1 and 2
            const ignoreIds = new Set([1, 2]);
            const hit = rayTraceBSPMultiIgnore(origin, direction, bsp, 0, Infinity, ignoreIds);
            expect(hit).not.toBeNull();
            // Should hit polygon 0 (at z=0), skipping 1 and 2
            expect(hit.polygonId).toBe(0);
            expect(hit.point[2]).toBeCloseTo(0);
        });
        it('returns null when all intersected polygons are ignored', () => {
            const polygon = Polygon3D.create([
                [0, 0, 0], [2, 0, 0], [2, 2, 0], [0, 2, 0]
            ]);
            const bsp = buildBSP([polygon]);
            const origin = [1, 1, 5];
            const direction = [0, 0, -1];
            const ignoreIds = new Set([0]);
            const hit = rayTraceBSPMultiIgnore(origin, direction, bsp, 0, Infinity, ignoreIds);
            expect(hit).toBeNull();
        });
        it('finds far subtree intersections with multi-ignore', () => {
            // Same test as single-ignore but with multi-ignore API
            const floor = Polygon3D.create([
                [0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0]
            ]);
            const wall = Polygon3D.create([
                [3, 5, 0], [3, 5, 3], [7, 5, 3], [7, 5, 0]
            ]);
            const bsp = buildBSP([floor, wall]);
            const origin = [5, 2, 1.5];
            const direction = [0, 1, 0];
            // Ignore the floor (polygon 0)
            const ignoreIds = new Set([0]);
            const hit = rayTraceBSPMultiIgnore(origin, direction, bsp, 0, 10, ignoreIds);
            expect(hit).not.toBeNull();
            expect(hit.point[1]).toBeCloseTo(5);
        });
    });
    describe('rayTraceBSP - Concord Hall regression test', () => {
        /**
         * Regression test for the specific bug found in Concord Hall L-shaped room.
         *
         * The bug occurred when:
         * 1. A ray from the floor (z≈0) toward the source crossed an inner wall
         * 2. The inner wall polygon was in a "far" BSP subtree
         * 3. The BSP traversal pruned the far subtree because tSplit > tMax
         * 4. The ray incorrectly passed through the wall
         *
         * This test recreates that geometry and verifies the fix.
         */
        it('detects inner wall occlusion in L-shaped room configuration', () => {
            // Recreate the Concord Hall-like geometry
            // Room with inner wall at y=5.575, spanning x=[6.215, 12.43], z=[0, 4.877]
            // Floor polygon (will likely be a splitting plane)
            const floor = Polygon3D.create([
                [0, 0, 0], [12.43, 0, 0], [12.43, 11.15, 0], [0, 11.15, 0]
            ]);
            // Inner wall (the polygon that was being missed)
            // This is the "back1" wall from Concord Hall
            const innerWall = Polygon3D.create([
                [6.215, 5.575, 0],
                [6.215, 5.575, 4.877],
                [12.43, 5.575, 4.877],
                [12.43, 5.575, 0]
            ]);
            const bsp = buildBSP([floor, innerWall]);
            // Ray similar to the failing case:
            // From point at y < 5.575 toward source at y > 5.575
            // Crossing point should be within the wall's x bounds
            const origin = [8.409, 3.673, 0.001]; // Below the wall
            const target = [3.700, 9.900, 1.000]; // Above the wall
            const dir = Vector3.normalize(Vector3.subtract(target, origin));
            const dist = Vector3.distance(target, origin);
            // The ray crosses y=5.575 at approximately x=6.97, z=0.31
            // This is within the wall bounds, so it should be detected
            const hit = rayTraceBSP(origin, dir, bsp, 0.000001, dist - 0.000001);
            // Should hit the inner wall
            expect(hit).not.toBeNull();
            expect(hit.point[1]).toBeCloseTo(5.575, 2);
        });
        it('allows paths that do not cross inner walls', () => {
            const floor = Polygon3D.create([
                [0, 0, 0], [12.43, 0, 0], [12.43, 11.15, 0], [0, 11.15, 0]
            ]);
            const innerWall = Polygon3D.create([
                [6.215, 5.575, 0],
                [6.215, 5.575, 4.877],
                [12.43, 5.575, 4.877],
                [12.43, 5.575, 0]
            ]);
            const bsp = buildBSP([floor, innerWall]);
            // Ray that stays below the inner wall (same side)
            const origin = [8, 2, 1];
            const target = [10, 4, 1.5];
            const dir = Vector3.normalize(Vector3.subtract(target, origin));
            const dist = Vector3.distance(target, origin);
            // Ignore the floor
            const ignoreIds = new Set([0]);
            const hit = rayTraceBSPMultiIgnore(origin, dir, bsp, 0.000001, dist - 0.000001, ignoreIds);
            // Should NOT hit anything (path stays below y=5.575)
            expect(hit).toBeNull();
        });
        it('correctly handles ray parallel to splitting plane', () => {
            // Test case where ray is parallel to a splitting plane
            // This tests the tSplit === null case
            const polygons = [
                // Horizontal floor
                Polygon3D.create([[0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0]]),
                // Vertical wall perpendicular to X
                Polygon3D.create([[5, 0, 0], [5, 0, 3], [5, 10, 3], [5, 10, 0]])
            ];
            const bsp = buildBSP(polygons);
            // Ray parallel to X axis at z=1.5, should hit the wall
            const origin = [2, 5, 1.5];
            const direction = [1, 0, 0];
            // Ignore floor
            const ignoreIds = new Set([0]);
            const hit = rayTraceBSPMultiIgnore(origin, direction, bsp, 0, 10, ignoreIds);
            expect(hit).not.toBeNull();
            expect(hit.point[0]).toBeCloseTo(5);
        });
    });
});
//# sourceMappingURL=bsp3d.test.js.map