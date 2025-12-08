/****
 * Geometry utilities for 2D beam tracing optimizations
 *
 * This module provides Line2D representation and operations needed for:
 * - Fail line optimization (caching geometric failure reasons)
 * - Skip circle optimization (spatial grouping for early rejection)
 */
import type { Point } from './beamtrace2d';
/**
 * 2D Line in implicit form: ax + by + c = 0
 * The normal vector is [a, b] (normalized)
 * A point p is "behind" the line if: a*p[0] + b*p[1] + c < 0
 */
export interface Line2D {
    a: number;
    b: number;
    c: number;
}
/**
 * Type of failure that caused a path to be invalid
 */
export type FailLineType = 'polygon' | 'beam-left' | 'beam-right' | 'beam-window';
/**
 * Dot product of two 2D vectors
 */
export declare function dot(a: Point, b: Point): number;
/**
 * Subtract two 2D vectors: a - b
 */
export declare function subtract(a: Point, b: Point): Point;
/**
 * Add two 2D vectors: a + b
 */
export declare function add(a: Point, b: Point): Point;
/**
 * Scale a 2D vector by a scalar
 */
export declare function scale(v: Point, s: number): Point;
/**
 * Length of a 2D vector
 */
export declare function length(v: Point): number;
/**
 * Normalize a 2D vector to unit length
 */
export declare function normalize(v: Point): Point;
/**
 * Get perpendicular vector (90 degree counter-clockwise rotation)
 */
export declare function perpendicular(v: Point): Point;
/**
 * Distance between two points
 */
export declare function distance(a: Point, b: Point): number;
/**
 * Create a Line2D from two points
 * The normal points to the left of the direction from p1 to p2
 */
export declare function lineFromPoints(p1: Point, p2: Point): Line2D;
/**
 * Signed distance from a point to a line
 * Positive = in front (on normal side), Negative = behind
 */
export declare function signedDistanceToLine(point: Point, line: Line2D): number;
/**
 * Check if a point is behind a line (on the opposite side of the normal)
 */
export declare function isPointBehindLine(point: Point, line: Line2D): boolean;
/**
 * Check if a point is in front of or on a line
 */
export declare function isPointInFrontOfLine(point: Point, line: Line2D): boolean;
/**
 * Get absolute distance from a point to a line
 */
export declare function distanceToLine(point: Point, line: Line2D): number;
/**
 * Mirror a point across a wall (line segment)
 */
export declare function mirrorPointAcrossWall(point: Point, wallP1: Point, wallP2: Point): Point;
/**
 * Mirror a Line2D across a wall (line segment)
 * This is done by mirroring two points on the line and reconstructing
 */
export declare function mirrorLineAcrossWall(line: Line2D, wallP1: Point, wallP2: Point): Line2D;
/**
 * Flip a line's orientation (negate normal and c)
 */
export declare function flipLine(line: Line2D): Line2D;
/**
 * Beam boundary lines in 2D
 * A beam is bounded by three half-planes:
 * - left: from virtual source through one window endpoint
 * - right: from virtual source through other window endpoint
 * - window: the wall segment itself
 * All normals point INTO the beam volume
 */
export interface BeamBoundaryLines {
    left: Line2D;
    right: Line2D;
    window: Line2D;
}
/**
 * Construct the three boundary lines of a 2D beam
 * The beam is defined by a virtual source and a wall (window)
 * All line normals are oriented to point INTO the beam volume
 *
 * @param virtualSource The virtual (image) source position
 * @param windowP1 First endpoint of the window (wall segment)
 * @param windowP2 Second endpoint of the window (wall segment)
 */
export declare function constructBeamBoundaryLines(virtualSource: Point, windowP1: Point, windowP2: Point): BeamBoundaryLines;
/**
 * Check if a point is inside a beam volume
 * A point is inside if it's in front of all three boundary lines
 */
export declare function isPointInBeam(point: Point, boundaries: BeamBoundaryLines): boolean;
/**
 * Find which beam boundary line a point violates (is behind)
 * Returns null if point is inside beam, otherwise returns the violated line and type
 */
export declare function findBeamViolation(point: Point, boundaries: BeamBoundaryLines): {
    line: Line2D;
    type: FailLineType;
} | null;
//# sourceMappingURL=geometry.d.ts.map