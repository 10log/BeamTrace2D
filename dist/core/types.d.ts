/**
 * Core type definitions for BeamTrace 2D and 3D
 */
export type Point = [number, number];
export type Point2D = Point;
export type Point3D = [number, number, number];
export type Vector3 = [number, number, number];
export type PathPoint = [number, number, number | null];
export type ReflectionPath = PathPoint[];
export interface PathPoint3D {
    position: Vector3;
    polygonId: number | null;
}
export type ReflectionPath3D = PathPoint3D[];
export type PointClassification = 'front' | 'back' | 'on';
export type PolygonClassification = 'front' | 'back' | 'coplanar' | 'spanning';
export type FailPlaneType = 'polygon' | 'edge' | 'aperture';
//# sourceMappingURL=types.d.ts.map