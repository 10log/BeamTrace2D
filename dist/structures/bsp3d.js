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
    // IMPORTANT: BSP pruning optimization assumes polygons are coplanar with splitting planes.
    // Since our polygons are finite and may not align with their node's splitting plane,
    // we must check BOTH subtrees in all cases to ensure correctness.
    if (tSplit === null || tSplit < tMin) {
        // Check near side first
        hit = rayTraceBSP(origin, direction, near, tMin, tMax, ignoreId);
        // Check this node's polygon
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
        // Also check far side
        if (!hit) {
            hit = rayTraceBSP(origin, direction, far, tMin, tMax, ignoreId);
        }
    }
    else if (tSplit > tMax) {
        // Check near side first
        hit = rayTraceBSP(origin, direction, near, tMin, tMax, ignoreId);
        // Check this node's polygon
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
        // Also check far side
        if (!hit) {
            hit = rayTraceBSP(origin, direction, far, tMin, tMax, ignoreId);
        }
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
// Debug flag - set to true to trace BSP traversal
let bspDebug = false;
let bspDebugDepth = 0;
export function setBSPDebug(enabled) {
    bspDebug = enabled;
    bspDebugDepth = 0;
}
/**
 * Trace a ray through the BSP tree, ignoring multiple polygon IDs
 *
 * @param origin - Ray origin point
 * @param direction - Ray direction (should be normalized for t to be distance)
 * @param node - BSP tree root node
 * @param tMin - Minimum t value to consider
 * @param tMax - Maximum t value to consider
 * @param ignoreIds - Set of polygon IDs to ignore
 * @returns First hit along the ray, or null if no hit
 */
export function rayTraceBSPMultiIgnore(origin, direction, node, tMin, tMax, ignoreIds) {
    if (!node)
        return null;
    const indent = '  '.repeat(bspDebugDepth);
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
    if (bspDebug) {
        console.log(`${indent}[BSP] Node ${node.polygonId}: dOrigin=${dOrigin.toFixed(3)}, dDir=${dDir.toFixed(3)}, tSplit=${tSplit?.toFixed(3) ?? 'null'}, tMin=${tMin.toFixed(3)}, tMax=${tMax.toFixed(3)}`);
    }
    let hit = null;
    // IMPORTANT: BSP pruning optimization assumes polygons are coplanar with splitting planes.
    // Since our polygons are finite and may not align with their node's splitting plane,
    // we must check BOTH subtrees in all cases to ensure correctness.
    // The tSplit value still helps us order the traversal (near first for early termination).
    if (tSplit === null || tSplit < tMin) {
        if (bspDebug) {
            console.log(`${indent}  Case: tSplit null or < tMin, checking near then far`);
        }
        // Check near side first
        bspDebugDepth++;
        hit = rayTraceBSPMultiIgnore(origin, direction, near, tMin, tMax, ignoreIds);
        bspDebugDepth--;
        // Check this node's polygon
        if (!hit && !ignoreIds.has(node.polygonId)) {
            const polyHit = Polygon3D.rayIntersection(origin, direction, node.polygon);
            if (bspDebug) {
                console.log(`${indent}  Checking node polygon ${node.polygonId}: ${polyHit ? `HIT t=${polyHit.t.toFixed(3)}` : 'NO HIT'}`);
                if (polyHit) {
                    console.log(`${indent}    In range [${tMin.toFixed(3)}, ${tMax.toFixed(3)}]? ${polyHit.t >= tMin && polyHit.t <= tMax}`);
                }
            }
            if (polyHit && polyHit.t >= tMin && polyHit.t <= tMax) {
                hit = {
                    t: polyHit.t,
                    point: polyHit.point,
                    polygonId: node.polygonId,
                    polygon: node.polygon
                };
            }
        }
        else if (bspDebug && ignoreIds.has(node.polygonId)) {
            console.log(`${indent}  Skipping node polygon ${node.polygonId} (in ignoreIds)`);
        }
        // Also check far side - polygons there might still intersect the ray
        if (!hit) {
            bspDebugDepth++;
            hit = rayTraceBSPMultiIgnore(origin, direction, far, tMin, tMax, ignoreIds);
            bspDebugDepth--;
        }
    }
    else if (tSplit > tMax) {
        if (bspDebug) {
            console.log(`${indent}  Case: tSplit > tMax, checking near then far`);
        }
        // Check near side first
        bspDebugDepth++;
        hit = rayTraceBSPMultiIgnore(origin, direction, near, tMin, tMax, ignoreIds);
        bspDebugDepth--;
        // Check this node's polygon
        if (!hit && !ignoreIds.has(node.polygonId)) {
            const polyHit = Polygon3D.rayIntersection(origin, direction, node.polygon);
            if (bspDebug) {
                console.log(`${indent}  Checking node polygon ${node.polygonId}: ${polyHit ? `HIT t=${polyHit.t.toFixed(3)}` : 'NO HIT'}`);
                if (polyHit) {
                    console.log(`${indent}    In range [${tMin.toFixed(3)}, ${tMax.toFixed(3)}]? ${polyHit.t >= tMin && polyHit.t <= tMax}`);
                }
            }
            if (polyHit && polyHit.t >= tMin && polyHit.t <= tMax) {
                hit = {
                    t: polyHit.t,
                    point: polyHit.point,
                    polygonId: node.polygonId,
                    polygon: node.polygon
                };
            }
        }
        else if (bspDebug && ignoreIds.has(node.polygonId)) {
            console.log(`${indent}  Skipping node polygon ${node.polygonId} (in ignoreIds)`);
        }
        // Also check far side - polygons there might still intersect the ray
        if (!hit) {
            bspDebugDepth++;
            hit = rayTraceBSPMultiIgnore(origin, direction, far, tMin, tMax, ignoreIds);
            bspDebugDepth--;
        }
    }
    else {
        if (bspDebug) {
            console.log(`${indent}  Case: ray crosses plane at tSplit=${tSplit.toFixed(3)}`);
        }
        // Ray crosses the plane - check near side first, then node, then far side
        bspDebugDepth++;
        hit = rayTraceBSPMultiIgnore(origin, direction, near, tMin, tSplit, ignoreIds);
        bspDebugDepth--;
        if (!hit && !ignoreIds.has(node.polygonId)) {
            const polyHit = Polygon3D.rayIntersection(origin, direction, node.polygon);
            if (bspDebug) {
                console.log(`${indent}  Checking node polygon ${node.polygonId}: ${polyHit ? `HIT t=${polyHit.t.toFixed(3)}` : 'NO HIT'}`);
                if (polyHit) {
                    console.log(`${indent}    In range [${tMin.toFixed(3)}, ${tMax.toFixed(3)}]? ${polyHit.t >= tMin && polyHit.t <= tMax}`);
                }
            }
            if (polyHit && polyHit.t >= tMin && polyHit.t <= tMax) {
                hit = {
                    t: polyHit.t,
                    point: polyHit.point,
                    polygonId: node.polygonId,
                    polygon: node.polygon
                };
            }
        }
        else if (bspDebug && ignoreIds.has(node.polygonId)) {
            console.log(`${indent}  Skipping node polygon ${node.polygonId} (in ignoreIds)`);
        }
        if (!hit) {
            bspDebugDepth++;
            hit = rayTraceBSPMultiIgnore(origin, direction, far, tSplit, tMax, ignoreIds);
            bspDebugDepth--;
        }
    }
    if (bspDebug && hit) {
        console.log(`${indent}  RETURNING HIT: polygon ${hit.polygonId} at t=${hit.t.toFixed(3)}`);
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