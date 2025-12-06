/**
 * 3D Binary Space Partitioning (BSP) Tree
 *
 * Used for accelerated ray-polygon intersection queries.
 * Provides O(log n) ray tracing instead of O(n) brute force.
 */
import { Vector3 } from '../core/vector3';
import { Plane3D } from '../core/plane3d';
import { Polygon3D } from '../geometry/polygon3d';
import { splitPolygon } from '../geometry/polygon-split';
/**
 * Build a BSP tree from an array of polygons
 *
 * @param polygons - Array of polygons to partition
 * @returns Root node of the BSP tree, or null if empty
 */
export function buildBSP(polygons) {
    if (polygons.length === 0)
        return null;
    // Create indexed polygons to track original IDs through splits
    const indexed = polygons.map((polygon, i) => ({
        polygon,
        originalId: i
    }));
    return buildBSPRecursive(indexed);
}
/**
 * Recursive BSP construction
 */
function buildBSPRecursive(polygons) {
    if (polygons.length === 0)
        return null;
    // Choose splitting polygon using heuristic
    const splitterIndex = chooseSplitter(polygons);
    const splitter = polygons[splitterIndex];
    const plane = splitter.polygon.plane;
    const frontPolys = [];
    const backPolys = [];
    // Partition remaining polygons
    for (let i = 0; i < polygons.length; i++) {
        if (i === splitterIndex)
            continue;
        const indexed = polygons[i];
        const { front, back } = splitPolygon(indexed.polygon, plane);
        // Preserve original ID through splits
        if (front) {
            frontPolys.push({ polygon: front, originalId: indexed.originalId });
        }
        if (back) {
            backPolys.push({ polygon: back, originalId: indexed.originalId });
        }
    }
    return {
        plane,
        polygon: splitter.polygon,
        polygonId: splitter.originalId,
        front: buildBSPRecursive(frontPolys),
        back: buildBSPRecursive(backPolys)
    };
}
/**
 * Choose the best splitting polygon using balance + split minimization heuristic
 *
 * The goal is to minimize:
 * 1. Number of polygon splits (expensive)
 * 2. Tree imbalance (affects query performance)
 */
function chooseSplitter(polygons) {
    if (polygons.length <= 3)
        return 0;
    let bestIndex = 0;
    let bestScore = Infinity;
    // Sample a subset for large polygon counts
    const sampleSize = Math.min(polygons.length, 10);
    const step = Math.max(1, Math.floor(polygons.length / sampleSize));
    for (let i = 0; i < polygons.length; i += step) {
        const plane = polygons[i].polygon.plane;
        let front = 0;
        let back = 0;
        let splits = 0;
        for (let j = 0; j < polygons.length; j++) {
            if (i === j)
                continue;
            const classification = Polygon3D.classify(polygons[j].polygon, plane);
            if (classification === 'front') {
                front++;
            }
            else if (classification === 'back') {
                back++;
            }
            else if (classification === 'spanning') {
                front++;
                back++;
                splits++;
            }
            // coplanar polygons don't affect the score
        }
        // Score: heavily penalize splits, then minimize imbalance
        const score = splits * 8 + Math.abs(front - back);
        if (score < bestScore) {
            bestScore = score;
            bestIndex = i;
        }
    }
    return bestIndex;
}
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
export function rayTraceBSP(origin, direction, node, tMin = 0, tMax = Infinity, ignoreId = -1) {
    if (!node)
        return null;
    // Classify ray origin relative to splitting plane
    const dOrigin = Plane3D.signedDistance(origin, node.plane);
    const normal = Plane3D.normal(node.plane);
    const dDir = Vector3.dot(normal, direction);
    // Determine near and far subtrees based on ray origin position
    let near;
    let far;
    if (dOrigin >= 0) {
        near = node.front;
        far = node.back;
    }
    else {
        near = node.back;
        far = node.front;
    }
    // Calculate intersection with splitting plane
    let tSplit = null;
    if (Math.abs(dDir) > 1e-10) {
        tSplit = -dOrigin / dDir;
    }
    let hit = null;
    if (tSplit === null || tSplit < tMin) {
        // Ray parallel to plane or split point before ray start
        // Ray stays entirely on near side
        hit = rayTraceBSP(origin, direction, near, tMin, tMax, ignoreId);
    }
    else if (tSplit > tMax) {
        // Split point beyond ray end - ray stays on near side
        hit = rayTraceBSP(origin, direction, near, tMin, tMax, ignoreId);
    }
    else {
        // Ray crosses the plane - check near side first
        hit = rayTraceBSP(origin, direction, near, tMin, tSplit, ignoreId);
        // If no hit in near subtree, check this node's polygon
        if (!hit && node.polygonId !== ignoreId) {
            const polyHit = Polygon3D.rayIntersection(origin, direction, node.polygon);
            if (polyHit && polyHit.t >= tMin && polyHit.t <= tMax) {
                hit = {
                    t: polyHit.t,
                    point: polyHit.point,
                    polygonId: node.polygonId,
                    polygon: node.polygon
                };
            }
        }
        // If still no hit, check far subtree
        if (!hit) {
            hit = rayTraceBSP(origin, direction, far, tSplit, tMax, ignoreId);
        }
    }
    return hit;
}
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
export function rayOccluded(origin, direction, node, tMin = 0, tMax = Infinity, ignoreId = -1) {
    return rayTraceBSP(origin, direction, node, tMin, tMax, ignoreId) !== null;
}
/**
 * Find all polygons intersected by a ray (not just the first)
 *
 * Useful for debugging or special effects.
 */
export function rayTraceAll(origin, direction, node, tMin = 0, tMax = Infinity, ignoreId = -1) {
    const hits = [];
    rayTraceAllRecursive(origin, direction, node, tMin, tMax, ignoreId, hits);
    // Sort by distance
    hits.sort((a, b) => a.t - b.t);
    return hits;
}
function rayTraceAllRecursive(origin, direction, node, tMin, tMax, ignoreId, hits) {
    if (!node)
        return;
    const dOrigin = Plane3D.signedDistance(origin, node.plane);
    const normal = Plane3D.normal(node.plane);
    const dDir = Vector3.dot(normal, direction);
    let near;
    let far;
    if (dOrigin >= 0) {
        near = node.front;
        far = node.back;
    }
    else {
        near = node.back;
        far = node.front;
    }
    let tSplit = null;
    if (Math.abs(dDir) > 1e-10) {
        tSplit = -dOrigin / dDir;
    }
    // Check this node's polygon
    if (node.polygonId !== ignoreId) {
        const polyHit = Polygon3D.rayIntersection(origin, direction, node.polygon);
        if (polyHit && polyHit.t >= tMin && polyHit.t <= tMax) {
            hits.push({
                t: polyHit.t,
                point: polyHit.point,
                polygonId: node.polygonId,
                polygon: node.polygon
            });
        }
    }
    // Recurse into both subtrees
    if (tSplit === null || tSplit < tMin) {
        rayTraceAllRecursive(origin, direction, near, tMin, tMax, ignoreId, hits);
    }
    else if (tSplit > tMax) {
        rayTraceAllRecursive(origin, direction, near, tMin, tMax, ignoreId, hits);
    }
    else {
        rayTraceAllRecursive(origin, direction, near, tMin, tSplit, ignoreId, hits);
        rayTraceAllRecursive(origin, direction, far, tSplit, tMax, ignoreId, hits);
    }
}
/**
 * Count the total number of nodes in the BSP tree
 */
export function countNodes(node) {
    if (!node)
        return 0;
    return 1 + countNodes(node.front) + countNodes(node.back);
}
/**
 * Calculate the maximum depth of the BSP tree
 */
export function treeDepth(node) {
    if (!node)
        return 0;
    return 1 + Math.max(treeDepth(node.front), treeDepth(node.back));
}
//# sourceMappingURL=bsp3d.js.map