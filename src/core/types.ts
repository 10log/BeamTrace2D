/**
 * Core type definitions for BeamTrace 2D and 3D
 */

// 2D Types (from existing implementation)
export type Point = [number, number];
export type Point2D = Point;

// 3D Types
export type Point3D = [number, number, number];
export type Vector3 = [number, number, number];

// Path types for 2D
export type PathPoint = [number, number, number | null];  // [x, y, wallId]
export type ReflectionPath = PathPoint[];

// Path types for 3D
export interface PathPoint3D {
  position: Vector3;
  polygonId: number | null;  // null for source/listener
}
export type ReflectionPath3D = PathPoint3D[];

// Classification types
export type PointClassification = 'front' | 'back' | 'on';
export type PolygonClassification = 'front' | 'back' | 'coplanar' | 'spanning';

// Fail types
export type FailPlaneType = 'polygon' | 'edge' | 'aperture';
