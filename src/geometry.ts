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
  a: number;  // Normal x component
  b: number;  // Normal y component
  c: number;  // Distance term
}

/**
 * Type of failure that caused a path to be invalid
 */
export type FailLineType = 'polygon' | 'beam-left' | 'beam-right' | 'beam-window';

/**
 * Dot product of two 2D vectors
 */
export function dot(a: Point, b: Point): number {
  return a[0] * b[0] + a[1] * b[1];
}

/**
 * Subtract two 2D vectors: a - b
 */
export function subtract(a: Point, b: Point): Point {
  return [a[0] - b[0], a[1] - b[1]];
}

/**
 * Add two 2D vectors: a + b
 */
export function add(a: Point, b: Point): Point {
  return [a[0] + b[0], a[1] + b[1]];
}

/**
 * Scale a 2D vector by a scalar
 */
export function scale(v: Point, s: number): Point {
  return [v[0] * s, v[1] * s];
}

/**
 * Length of a 2D vector
 */
export function length(v: Point): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
}

/**
 * Normalize a 2D vector to unit length
 */
export function normalize(v: Point): Point {
  const len = length(v);
  if (len === 0) return [0, 0];
  return [v[0] / len, v[1] / len];
}

/**
 * Get perpendicular vector (90 degree counter-clockwise rotation)
 */
export function perpendicular(v: Point): Point {
  return [-v[1], v[0]];
}

/**
 * Distance between two points
 */
export function distance(a: Point, b: Point): number {
  return length(subtract(a, b));
}

/**
 * Create a Line2D from two points
 * The normal points to the left of the direction from p1 to p2
 */
export function lineFromPoints(p1: Point, p2: Point): Line2D {
  const dir = subtract(p2, p1);
  const normal = normalize(perpendicular(dir));
  const c = -dot(normal, p1);
  return { a: normal[0], b: normal[1], c };
}

/**
 * Signed distance from a point to a line
 * Positive = in front (on normal side), Negative = behind
 */
export function signedDistanceToLine(point: Point, line: Line2D): number {
  return line.a * point[0] + line.b * point[1] + line.c;
}

/**
 * Check if a point is behind a line (on the opposite side of the normal)
 */
export function isPointBehindLine(point: Point, line: Line2D): boolean {
  return signedDistanceToLine(point, line) < 0;
}

/**
 * Check if a point is in front of or on a line
 */
export function isPointInFrontOfLine(point: Point, line: Line2D): boolean {
  return signedDistanceToLine(point, line) >= 0;
}

/**
 * Get absolute distance from a point to a line
 */
export function distanceToLine(point: Point, line: Line2D): number {
  return Math.abs(signedDistanceToLine(point, line));
}

/**
 * Mirror a point across a wall (line segment)
 */
export function mirrorPointAcrossWall(point: Point, wallP1: Point, wallP2: Point): Point {
  // Wall direction and normal
  const wallDir = subtract(wallP2, wallP1);
  const normal = normalize(perpendicular(wallDir));

  // Distance from point to wall line
  const d = dot(normal, subtract(point, wallP1));

  // Mirror by moving 2*d in opposite normal direction
  return [point[0] - 2 * d * normal[0], point[1] - 2 * d * normal[1]];
}

/**
 * Mirror a Line2D across a wall (line segment)
 * This is done by mirroring two points on the line and reconstructing
 */
export function mirrorLineAcrossWall(line: Line2D, wallP1: Point, wallP2: Point): Line2D {
  // Find two points on the original line
  let p1: Point, p2: Point;

  if (Math.abs(line.b) > 1e-10) {
    // Line is not vertical, use x = 0 and x = 1
    p1 = [0, -line.c / line.b];
    p2 = [1, -(line.c + line.a) / line.b];
  } else if (Math.abs(line.a) > 1e-10) {
    // Line is vertical, use y = 0 and y = 1
    p1 = [-line.c / line.a, 0];
    p2 = [-line.c / line.a, 1];
  } else {
    // Degenerate line (both a and b near zero) - return unchanged
    return { a: line.a, b: line.b, c: line.c };
  }

  // Mirror both points
  const p1m = mirrorPointAcrossWall(p1, wallP1, wallP2);
  const p2m = mirrorPointAcrossWall(p2, wallP1, wallP2);

  // Reconstruct line from mirrored points
  return lineFromPoints(p1m, p2m);
}

/**
 * Flip a line's orientation (negate normal and c)
 */
export function flipLine(line: Line2D): Line2D {
  return { a: -line.a, b: -line.b, c: -line.c };
}

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
export function constructBeamBoundaryLines(
  virtualSource: Point,
  windowP1: Point,
  windowP2: Point
): BeamBoundaryLines {
  // First, determine window orientation
  // The source should be "behind" the window line
  const windowDir = subtract(windowP2, windowP1);
  const windowNormal = perpendicular(windowDir);
  const toSource = subtract(virtualSource, windowP1);

  let p1 = windowP1;
  let p2 = windowP2;

  // If source is in front of window, flip window endpoints
  if (dot(windowNormal, toSource) > 0) {
    p1 = windowP2;
    p2 = windowP1;
  }

  // Left edge: from virtualSource through p2
  // Normal should point toward p1 (into beam)
  let leftLine = lineFromPoints(virtualSource, p2);
  if (signedDistanceToLine(p1, leftLine) < 0) {
    leftLine = flipLine(leftLine);
  }

  // Right edge: from p1 through virtualSource
  // Normal should point toward p2 (into beam)
  let rightLine = lineFromPoints(p1, virtualSource);
  if (signedDistanceToLine(p2, rightLine) < 0) {
    rightLine = flipLine(rightLine);
  }

  // Window line: from p1 to p2
  // Normal should point toward source (into beam)
  let windowLine = lineFromPoints(p1, p2);
  if (signedDistanceToLine(virtualSource, windowLine) < 0) {
    windowLine = flipLine(windowLine);
  }

  return { left: leftLine, right: rightLine, window: windowLine };
}

/**
 * Check if a point is inside a beam volume
 * A point is inside if it's in front of all three boundary lines
 */
export function isPointInBeam(
  point: Point,
  boundaries: BeamBoundaryLines
): boolean {
  return isPointInFrontOfLine(point, boundaries.left) &&
         isPointInFrontOfLine(point, boundaries.right) &&
         isPointInFrontOfLine(point, boundaries.window);
}

/**
 * Find which beam boundary line a point violates (is behind)
 * Returns null if point is inside beam, otherwise returns the violated line and type
 */
export function findBeamViolation(
  point: Point,
  boundaries: BeamBoundaryLines
): { line: Line2D; type: FailLineType } | null {
  if (isPointBehindLine(point, boundaries.left)) {
    return { line: boundaries.left, type: 'beam-left' };
  }
  if (isPointBehindLine(point, boundaries.right)) {
    return { line: boundaries.right, type: 'beam-right' };
  }
  if (isPointBehindLine(point, boundaries.window)) {
    return { line: boundaries.window, type: 'beam-window' };
  }
  return null;
}
