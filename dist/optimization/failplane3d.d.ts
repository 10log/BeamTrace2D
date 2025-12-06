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
    plane: Plane3D;
    type: FailPlaneType;
    nodeDepth: number;
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
export declare function detectFailPlane(listenerPos: Vector3, node: BeamNode3D, polygons: Polygon3D[]): FailPlaneInfo | null;
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
export declare function propagateFailPlane(failPlane: Plane3D, fromNode: BeamNode3D, toNode: BeamNode3D, polygons: Polygon3D[]): Plane3D;
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
export declare function isListenerBehindFailPlane(listenerPos: Vector3, failPlane: Plane3D): boolean;
/**
 * Get the distance from listener to the fail plane
 *
 * Positive distance means listener is in front (valid side)
 * Negative distance means listener is behind (invalid side)
 *
 * This can be used to determine how far the listener needs to move
 * to potentially validate the path.
 */
export declare function distanceToFailPlane(listenerPos: Vector3, failPlane: Plane3D): number;
/**
 * Find the minimum distance to any fail plane in a set of nodes
 *
 * Used by skip sphere optimization to determine sphere radius.
 */
export declare function minDistanceToFailPlanes(listenerPos: Vector3, nodes: BeamNode3D[]): number;
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
export declare function updateNodeFailPlane(node: BeamNode3D, listenerPos: Vector3, polygons: Polygon3D[]): boolean;
/**
 * Clear fail plane cache from a node
 */
export declare function clearNodeFailPlane(node: BeamNode3D): void;
/**
 * Check if a node has a cached fail plane
 */
export declare function hasFailPlane(node: BeamNode3D): boolean;
//# sourceMappingURL=failplane3d.d.ts.map