/**
 * 3D Beam Tree for BeamTrace3D
 *
 * Hierarchical structure of beams representing all possible reflection paths
 * up to a maximum reflection order. Each node in the tree represents a
 * virtual source and aperture for a particular reflection sequence.
 */

import { Vector3 } from '../core/vector3';
import { Plane3D } from '../core/plane3d';
import { Polygon3D } from '../geometry/polygon3d';
import { clipPolygonByPlanes, quickRejectPolygon } from '../geometry/clipping3d';
import { constructBeamBoundaryPlanes, isPolygonFacingSource, mirrorPointAcrossPolygon } from './beam3d';
import { FailPlaneType } from '../core/types';

/**
 * Beam tree node representing a reflection from a polygon
 */
export interface BeamNode3D {
  id: number;                      // Polygon ID (-1 for root/source)
  parent: BeamNode3D | null;       // Parent node (null for root)
  virtualSource: Vector3;          // Virtual source position for this reflection
  aperture?: Polygon3D;            // Window polygon for this reflection
  boundaryPlanes?: Plane3D[];      // Beam boundary planes
  children: BeamNode3D[];          // Child beams (higher-order reflections)

  // Optimization fields (populated during path finding)
  failPlane?: Plane3D;             // Cached fail plane for this node
  failPlaneType?: FailPlaneType;   // Type of failure
}

/**
 * Complete beam tree structure
 */
export interface BeamTree3D {
  root: BeamNode3D;                // Root node (source position)
  leafNodes: BeamNode3D[];         // All leaf nodes (for bucket optimization)
  polygons: Polygon3D[];           // Reference to room polygons
  maxReflectionOrder: number;      // Maximum reflections tracked
}

/**
 * Minimum aperture area to consider (skip tiny apertures)
 */
const MIN_APERTURE_AREA = 1e-6;

/**
 * Build a complete beam tree from source and room geometry
 *
 * @param sourcePosition - Position of the sound source
 * @param polygons - Room polygons (walls, floor, ceiling)
 * @param maxReflectionOrder - Maximum number of reflections to track
 * @returns Complete beam tree structure
 */
export function buildBeamTree3D(
  sourcePosition: Vector3,
  polygons: Polygon3D[],
  maxReflectionOrder: number
): BeamTree3D {
  // Create root node (source position, no reflection)
  const root: BeamNode3D = {
    id: -1,
    parent: null,
    virtualSource: Vector3.clone(sourcePosition),
    children: []
  };

  // First order: source reflects off each visible polygon
  // Only create first-order nodes if maxReflectionOrder >= 1
  if (maxReflectionOrder >= 1) {
    for (let i = 0; i < polygons.length; i++) {
      const poly = polygons[i];

      // Check if source can see this polygon (not backfacing)
      if (!isPolygonFacingSource(poly, sourcePosition)) {
        continue;
      }

      // Create virtual source by mirroring across polygon
      const childVS = mirrorPointAcrossPolygon(sourcePosition, poly);

      // First-order beam uses the full polygon as aperture
      const childBoundaries = constructBeamBoundaryPlanes(childVS, poly);

      const childNode: BeamNode3D = {
        id: i,
        parent: root,
        virtualSource: childVS,
        aperture: Polygon3D.clone(poly),
        boundaryPlanes: childBoundaries,
        children: []
      };

      root.children.push(childNode);

      // Build higher-order reflections recursively
      if (maxReflectionOrder > 1) {
        buildBeamChildren(childNode, polygons, 2, maxReflectionOrder);
      }
    }
  }

  // Collect all leaf nodes for bucket optimization
  const leafNodes: BeamNode3D[] = [];
  collectLeafNodes(root, leafNodes);

  return {
    root,
    leafNodes,
    polygons,
    maxReflectionOrder
  };
}

/**
 * Recursively build child beams for higher-order reflections
 */
function buildBeamChildren(
  node: BeamNode3D,
  polygons: Polygon3D[],
  currentOrder: number,
  maxOrder: number
): void {
  if (currentOrder > maxOrder) return;
  if (!node.boundaryPlanes || !node.aperture) return;

  for (let i = 0; i < polygons.length; i++) {
    // Skip the polygon we just reflected off (can't reflect off same surface twice in a row)
    if (i === node.id) continue;

    const poly = polygons[i];

    // Quick rejection: is polygon entirely outside beam?
    if (quickRejectPolygon(poly, node.boundaryPlanes)) {
      continue;
    }

    // Check if polygon is facing the virtual source (backface culling)
    if (!isPolygonFacingSource(poly, node.virtualSource)) {
      continue;
    }

    // Clip polygon to beam volume
    const clipped = clipPolygonByPlanes(poly, node.boundaryPlanes);
    if (!clipped) continue;

    // Skip tiny apertures
    const area = Polygon3D.area(clipped);
    if (area < MIN_APERTURE_AREA) continue;

    // Create child beam
    const childVS = mirrorPointAcrossPolygon(node.virtualSource, poly);
    const childBoundaries = constructBeamBoundaryPlanes(childVS, clipped);

    const childNode: BeamNode3D = {
      id: i,
      parent: node,
      virtualSource: childVS,
      aperture: clipped,
      boundaryPlanes: childBoundaries,
      children: []
    };

    node.children.push(childNode);

    // Continue recursion
    if (currentOrder < maxOrder) {
      buildBeamChildren(childNode, polygons, currentOrder + 1, maxOrder);
    }
  }
}

/**
 * Collect all leaf nodes (nodes with no children that have a valid aperture)
 */
function collectLeafNodes(node: BeamNode3D, result: BeamNode3D[]): void {
  if (node.children.length === 0 && node.id !== -1) {
    result.push(node);
  }
  for (const child of node.children) {
    collectLeafNodes(child, result);
  }
}

/**
 * Collect all nodes at a specific reflection order
 */
export function collectNodesAtOrder(
  tree: BeamTree3D,
  order: number
): BeamNode3D[] {
  const result: BeamNode3D[] = [];
  collectAtOrderRecursive(tree.root, 0, order, result);
  return result;
}

function collectAtOrderRecursive(
  node: BeamNode3D,
  currentOrder: number,
  targetOrder: number,
  result: BeamNode3D[]
): void {
  if (currentOrder === targetOrder && node.id !== -1) {
    result.push(node);
    return;
  }
  if (currentOrder >= targetOrder) return;

  for (const child of node.children) {
    collectAtOrderRecursive(child, currentOrder + 1, targetOrder, result);
  }
}

/**
 * Get the reflection order (depth) of a node
 */
export function getNodeOrder(node: BeamNode3D): number {
  let order = 0;
  let current: BeamNode3D | null = node;
  while (current && current.id !== -1) {
    order++;
    current = current.parent;
  }
  return order;
}

/**
 * Get the reflection path (polygon IDs) from root to a node
 */
export function getReflectionPath(node: BeamNode3D): number[] {
  const path: number[] = [];
  let current: BeamNode3D | null = node;

  while (current && current.id !== -1) {
    path.unshift(current.id);
    current = current.parent;
  }

  return path;
}

/**
 * Count total nodes in the beam tree
 */
export function countBeamNodes(tree: BeamTree3D): number {
  return countNodesRecursive(tree.root);
}

function countNodesRecursive(node: BeamNode3D): number {
  let count = 1;
  for (const child of node.children) {
    count += countNodesRecursive(child);
  }
  return count;
}

/**
 * Get statistics about the beam tree
 */
export interface BeamTreeStats {
  totalNodes: number;
  leafNodes: number;
  maxDepth: number;
  nodesPerOrder: number[];
}

export function getBeamTreeStats(tree: BeamTree3D): BeamTreeStats {
  const nodesPerOrder: number[] = [];
  let maxDepth = 0;

  function traverse(node: BeamNode3D, depth: number): void {
    if (node.id !== -1) {
      while (nodesPerOrder.length <= depth) {
        nodesPerOrder.push(0);
      }
      nodesPerOrder[depth]++;
      maxDepth = Math.max(maxDepth, depth);
    }

    for (const child of node.children) {
      traverse(child, depth + 1);
    }
  }

  traverse(tree.root, 0);

  return {
    totalNodes: countBeamNodes(tree),
    leafNodes: tree.leafNodes.length,
    maxDepth,
    nodesPerOrder
  };
}

/**
 * Clear all fail planes in the tree (reset optimization cache)
 */
export function clearFailPlanes(tree: BeamTree3D): void {
  clearFailPlanesRecursive(tree.root);
}

function clearFailPlanesRecursive(node: BeamNode3D): void {
  node.failPlane = undefined;
  node.failPlaneType = undefined;
  for (const child of node.children) {
    clearFailPlanesRecursive(child);
  }
}

/**
 * Iterate over all nodes in the tree (for batch operations)
 */
export function* iterateNodes(tree: BeamTree3D): Generator<BeamNode3D> {
  yield* iterateNodesRecursive(tree.root);
}

function* iterateNodesRecursive(node: BeamNode3D): Generator<BeamNode3D> {
  yield node;
  for (const child of node.children) {
    yield* iterateNodesRecursive(child);
  }
}
