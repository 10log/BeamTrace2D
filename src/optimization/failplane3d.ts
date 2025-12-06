/**
 * Fail Plane Optimization for BeamTrace3D
 *
 * The fail plane optimization caches the geometric reason why a path validation
 * failed, allowing O(1) rejection on subsequent frames when the listener moves.
 *
 * From the Laine et al. (2009) paper:
 * - Type 1 (polygon): Listener is behind the reflecting wall's plane
 * - Type 2 (beam): Listener is outside the beam volume (behind an edge plane)
 *
 * The fail plane is propagated (mirrored) through each reflection from the
 * detection node back to the leaf node for use in subsequent frames.
 */

import { Vector3 } from '../core/vector3';
import { Plane3D } from '../core/plane3d';
import { Polygon3D } from '../geometry/polygon3d';
import { BeamNode3D } from '../structures/beamtree3d';
import { FailPlaneType } from '../core/types';

/**
 * Information about a detected fail plane
 */
export interface FailPlaneInfo {
  plane: Plane3D;             // The fail plane
  type: FailPlaneType;        // Type of failure
  nodeDepth: number;          // Depth at which failure was detected
}

/**
 * Detect fail plane for a listener position at a beam node
 *
 * This function determines which geometric constraint the listener violates,
 * and returns the corresponding fail plane.
 *
 * @param listenerPos - Current listener position
 * @param node - The beam node to check
 * @param polygons - Room polygons (for accessing the reflecting polygon)
 * @returns FailPlaneInfo if listener is outside, null if listener is valid
 */
export function detectFailPlane(
  listenerPos: Vector3,
  node: BeamNode3D,
  polygons: Polygon3D[]
): FailPlaneInfo | null {
  if (!node.aperture || !node.boundaryPlanes) {
    return null;
  }

  // Type 1: Check if listener is behind the reflecting polygon's plane
  // The listener must be on the same side of the polygon as the virtual source
  const reflectingPoly = polygons[node.id];
  let polyPlane = reflectingPoly.plane;

  // Orient plane so virtual source is in front
  if (Plane3D.signedDistance(node.virtualSource, polyPlane) < 0) {
    polyPlane = Plane3D.flip(polyPlane);
  }

  // If listener is behind the polygon plane, it can't receive reflections from this surface
  if (Plane3D.signedDistance(listenerPos, polyPlane) < 0) {
    return {
      plane: polyPlane,
      type: 'polygon',
      nodeDepth: getNodeDepth(node)
    };
  }

  // Type 2: Check beam boundaries
  // Listener must be inside the beam volume (on front side of all boundary planes)
  const edgeCount = node.boundaryPlanes.length - 1; // Last plane is aperture

  for (let i = 0; i < node.boundaryPlanes.length; i++) {
    const plane = node.boundaryPlanes[i];
    if (Plane3D.signedDistance(listenerPos, plane) < 0) {
      const type: FailPlaneType = i < edgeCount ? 'edge' : 'aperture';
      return {
        plane,
        type,
        nodeDepth: getNodeDepth(node)
      };
    }
  }

  return null;
}

/**
 * Get the depth of a node in the beam tree
 */
function getNodeDepth(node: BeamNode3D): number {
  let depth = 0;
  let current: BeamNode3D | null = node;
  while (current && current.id !== -1) {
    depth++;
    current = current.parent;
  }
  return depth;
}

/**
 * Propagate a fail plane through the reflection chain
 *
 * When a fail plane is detected at some node, it needs to be mirrored
 * through each reflection surface to be valid for the leaf node.
 * This transforms the fail plane from the coordinate system at detection
 * to the coordinate system at the leaf.
 *
 * @param failPlane - The detected fail plane
 * @param fromNode - Node where failure was detected
 * @param toNode - Target node (usually leaf)
 * @param polygons - Room polygons for mirroring
 * @returns The propagated fail plane
 */
export function propagateFailPlane(
  failPlane: Plane3D,
  fromNode: BeamNode3D,
  toNode: BeamNode3D,
  polygons: Polygon3D[]
): Plane3D {
  let currentPlane = failPlane;
  let current: BeamNode3D | null = fromNode;

  // Walk from detection node toward root, mirroring at each reflection
  while (current && current !== toNode && current.parent) {
    if (current.id >= 0 && current.id < polygons.length) {
      const reflectingPoly = polygons[current.id];
      currentPlane = Plane3D.mirrorPlane(currentPlane, reflectingPoly.plane);
    }
    current = current.parent;
  }

  return currentPlane;
}

/**
 * Check if listener is still in the fail region (behind fail plane)
 *
 * This is the O(1) cache check that provides the speedup.
 * If the listener is behind the cached fail plane, we can skip
 * the expensive path validation.
 *
 * @param listenerPos - Current listener position
 * @param failPlane - Cached fail plane
 * @returns true if listener is behind the fail plane (path still invalid)
 */
export function isListenerBehindFailPlane(
  listenerPos: Vector3,
  failPlane: Plane3D
): boolean {
  return Plane3D.signedDistance(listenerPos, failPlane) < 0;
}

/**
 * Get the distance from listener to the fail plane
 *
 * Positive distance means listener is in front (valid side)
 * Negative distance means listener is behind (invalid side)
 *
 * This can be used to determine how far the listener needs to move
 * to potentially validate the path.
 */
export function distanceToFailPlane(
  listenerPos: Vector3,
  failPlane: Plane3D
): number {
  return Plane3D.signedDistance(listenerPos, failPlane);
}

/**
 * Find the minimum distance to any fail plane in a set of nodes
 *
 * Used by skip sphere optimization to determine sphere radius.
 */
export function minDistanceToFailPlanes(
  listenerPos: Vector3,
  nodes: BeamNode3D[]
): number {
  let minDist = Infinity;

  for (const node of nodes) {
    if (node.failPlane) {
      const dist = Math.abs(Plane3D.signedDistance(listenerPos, node.failPlane));
      minDist = Math.min(minDist, dist);
    }
  }

  return minDist;
}

/**
 * Update fail plane for a node after path validation fails
 *
 * Detects the fail plane and caches it on the node for future checks.
 *
 * @param node - The node that failed validation
 * @param listenerPos - Current listener position
 * @param polygons - Room polygons
 * @returns true if a fail plane was detected and cached
 */
export function updateNodeFailPlane(
  node: BeamNode3D,
  listenerPos: Vector3,
  polygons: Polygon3D[]
): boolean {
  const failInfo = detectFailPlane(listenerPos, node, polygons);

  if (failInfo) {
    node.failPlane = failInfo.plane;
    node.failPlaneType = failInfo.type;
    return true;
  }

  return false;
}

/**
 * Clear fail plane cache from a node
 */
export function clearNodeFailPlane(node: BeamNode3D): void {
  node.failPlane = undefined;
  node.failPlaneType = undefined;
}

/**
 * Check if a node has a cached fail plane
 */
export function hasFailPlane(node: BeamNode3D): boolean {
  return node.failPlane !== undefined;
}
