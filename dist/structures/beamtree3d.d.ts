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
import { FailPlaneType } from '../core/types';
/**
 * Beam tree node representing a reflection from a polygon
 */
export interface BeamNode3D {
    id: number;
    parent: BeamNode3D | null;
    virtualSource: Vector3;
    aperture?: Polygon3D;
    boundaryPlanes?: Plane3D[];
    children: BeamNode3D[];
    failPlane?: Plane3D;
    failPlaneType?: FailPlaneType;
}
/**
 * Complete beam tree structure
 */
export interface BeamTree3D {
    root: BeamNode3D;
    leafNodes: BeamNode3D[];
    polygons: Polygon3D[];
    maxReflectionOrder: number;
}
/**
 * Build a complete beam tree from source and room geometry
 *
 * @param sourcePosition - Position of the sound source
 * @param polygons - Room polygons (walls, floor, ceiling)
 * @param maxReflectionOrder - Maximum number of reflections to track
 * @returns Complete beam tree structure
 */
export declare function buildBeamTree3D(sourcePosition: Vector3, polygons: Polygon3D[], maxReflectionOrder: number): BeamTree3D;
/**
 * Collect all nodes at a specific reflection order
 */
export declare function collectNodesAtOrder(tree: BeamTree3D, order: number): BeamNode3D[];
/**
 * Get the reflection order (depth) of a node
 */
export declare function getNodeOrder(node: BeamNode3D): number;
/**
 * Get the reflection path (polygon IDs) from root to a node
 */
export declare function getReflectionPath(node: BeamNode3D): number[];
/**
 * Count total nodes in the beam tree
 */
export declare function countBeamNodes(tree: BeamTree3D): number;
/**
 * Get statistics about the beam tree
 */
export interface BeamTreeStats {
    totalNodes: number;
    leafNodes: number;
    maxDepth: number;
    nodesPerOrder: number[];
}
export declare function getBeamTreeStats(tree: BeamTree3D): BeamTreeStats;
/**
 * Clear all fail planes in the tree (reset optimization cache)
 */
export declare function clearFailPlanes(tree: BeamTree3D): void;
/**
 * Iterate over all nodes in the tree (for batch operations)
 */
export declare function iterateNodes(tree: BeamTree3D): Generator<BeamNode3D>;
//# sourceMappingURL=beamtree3d.d.ts.map