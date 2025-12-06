/**
 * 3D Binary Space Partitioning (BSP) Tree
 *
 * Used for accelerated ray-polygon intersection queries.
 * Provides O(log n) ray tracing instead of O(n) brute force.
 */
import { Vector3 } from '../core/vector3';
import { Plane3D } from '../core/plane3d';
import { Polygon3D } from '../geometry/polygon3d';
/**
 * BSP tree node
 */
export interface BSPNode3D {
    plane: Plane3D;
    polygon: Polygon3D;
    polygonId: number;
    front: BSPNode3D | null;
    back: BSPNode3D | null;
}
/**
 * Result of a ray intersection query
 */
export interface RayHit3D {
    t: number;
    point: Vector3;
    polygonId: number;
    polygon: Polygon3D;
}
/**
 * Build a BSP tree from an array of polygons
 *
 * @param polygons - Array of polygons to partition
 * @returns Root node of the BSP tree, or null if empty
 */
export declare function buildBSP(polygons: Polygon3D[]): BSPNode3D | null;
/**
 * Trace a ray through the BSP tree and find the first intersection
 *
 * @param origin - Ray origin point
 * @param direction - Ray direction (should be normalized for t to be distance)
 * @param node - BSP tree root node
 * @param tMin - Minimum t value to consider
 * @param tMax - Maximum t value to consider
 * @param ignoreId - Polygon ID to ignore (for avoiding self-intersection)
 * @returns First hit along the ray, or null if no hit
 */
export declare function rayTraceBSP(origin: Vector3, direction: Vector3, node: BSPNode3D | null, tMin?: number, tMax?: number, ignoreId?: number): RayHit3D | null;
/**
 * Check if a ray hits any polygon (occlusion test)
 *
 * Faster than rayTraceBSP when you only need to know if there's a hit,
 * not which polygon was hit.
 *
 * @param origin - Ray origin
 * @param direction - Ray direction
 * @param node - BSP tree root
 * @param tMin - Minimum t value
 * @param tMax - Maximum t value
 * @param ignoreId - Polygon ID to ignore
 * @returns true if ray hits something
 */
export declare function rayOccluded(origin: Vector3, direction: Vector3, node: BSPNode3D | null, tMin?: number, tMax?: number, ignoreId?: number): boolean;
/**
 * Find all polygons intersected by a ray (not just the first)
 *
 * Useful for debugging or special effects.
 */
export declare function rayTraceAll(origin: Vector3, direction: Vector3, node: BSPNode3D | null, tMin?: number, tMax?: number, ignoreId?: number): RayHit3D[];
/**
 * Count the total number of nodes in the BSP tree
 */
export declare function countNodes(node: BSPNode3D | null): number;
/**
 * Calculate the maximum depth of the BSP tree
 */
export declare function treeDepth(node: BSPNode3D | null): number;
//# sourceMappingURL=bsp3d.d.ts.map