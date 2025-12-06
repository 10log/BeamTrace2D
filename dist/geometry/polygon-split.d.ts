/**
 * Polygon splitting for BSP tree construction
 *
 * Splits a polygon by a plane into front and back pieces.
 */
import { Plane3D } from '../core/plane3d';
import { Polygon3D } from './polygon3d';
export interface SplitResult {
    front: Polygon3D | null;
    back: Polygon3D | null;
}
/**
 * Split a polygon by a plane
 *
 * Returns front and back pieces. Either may be null if the polygon
 * is entirely on one side of the plane.
 *
 * @param poly - The polygon to split
 * @param plane - The splitting plane
 * @param epsilon - Tolerance for point-on-plane classification
 */
export declare function splitPolygon(poly: Polygon3D, plane: Plane3D, epsilon?: number): SplitResult;
/**
 * Split multiple polygons by a plane
 *
 * Useful for BSP tree construction where multiple polygons need to be
 * partitioned by the same splitting plane.
 */
export declare function splitPolygons(polygons: Polygon3D[], plane: Plane3D, epsilon?: number): {
    front: Polygon3D[];
    back: Polygon3D[];
    coplanar: Polygon3D[];
};
//# sourceMappingURL=polygon-split.d.ts.map