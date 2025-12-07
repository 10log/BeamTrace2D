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
import type { Polygon3D } from '../geometry/polygon3d';
/** Detailed information about a single reflection point in 3D */
export interface ReflectionDetail3D {
    /** The polygon that was hit */
    polygon: Polygon3D;
    /** Index of the polygon in the polygons array */
    polygonId: number;
    /** Point where the reflection occurred [x, y, z] */
    hitPoint: Vector3;
    /** Angle of incidence in radians (relative to surface normal) */
    incidenceAngle: number;
    /** Angle of reflection in radians (equals incidence angle for specular reflection) */
    reflectionAngle: number;
    /** Incoming ray direction vector (normalized) [x, y, z] */
    incomingDirection: Vector3;
    /** Outgoing ray direction vector (normalized) [x, y, z] */
    outgoingDirection: Vector3;
    /** Surface normal vector (normalized) [x, y, z] - pointing toward the side the ray came from */
    surfaceNormal: Vector3;
    /** Which reflection this is in the path (1 = first reflection, 2 = second, etc.) */
    reflectionOrder: number;
    /** Distance traveled before this reflection (cumulative path length up to this point) */
    cumulativeDistance: number;
    /** Distance of the incoming segment (from previous point to this hit point) */
    incomingSegmentLength: number;
    /** True if angle is very close to 90° (grazing incidence, may be numerically unstable) */
    isGrazing: boolean;
}
/** Information about a single segment in a 3D path */
export interface SegmentDetail3D {
    /** Start point of this segment */
    startPoint: Vector3;
    /** End point of this segment */
    endPoint: Vector3;
    /** Length of this segment */
    length: number;
    /** Segment index (0 = first segment from listener) */
    segmentIndex: number;
}
/** Detailed reflection path with complete information about each reflection in 3D */
export interface DetailedReflectionPath3D {
    /** Start point (listener position) */
    listenerPosition: Vector3;
    /** End point (source position) */
    sourcePosition: Vector3;
    /** Total path length */
    totalPathLength: number;
    /** Number of reflections */
    reflectionCount: number;
    /** Detailed information about each reflection, in order from listener to source */
    reflections: ReflectionDetail3D[];
    /** Information about each segment in the path */
    segments: SegmentDetail3D[];
    /** The original simple path representation */
    simplePath: ReflectionPath3D;
}
export type PointClassification = 'front' | 'back' | 'on';
export type PolygonClassification = 'front' | 'back' | 'coplanar' | 'spanning';
export type FailPlaneType = 'polygon' | 'edge' | 'aperture';
//# sourceMappingURL=types.d.ts.map