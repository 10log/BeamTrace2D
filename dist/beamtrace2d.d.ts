/****
 * BeamTrace2D v 2.0
 *
 * =======
 *
 * Copyright (C) 2014 Kai Saksela. Based on the very basic principles of beam tracing as presented in "Accelerated beam tracing algorithm" by S. Laine, S. Siltanen, T. Lokki, and L. Savioja.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * TLDR; Feel free to play with the code, as long as you mention this copyright notice if you publish it somewhere.
 *
 * =======
 *
 * This code is for testing different beam tracing techniques in a simplified 2D environment.
 * - BSP trees (in this case the splitting planes are not aligned) for accelerated ray tracing
 * - Beam trees with polygon ID's
 * - The optimization techniques are absent in this version, so it's not nearly as fast as it would be with them
 *
 */
/** 2D point as [x, y] tuple */
export type Point = [number, number];
/** Path point with reflection info [x, y, wallId] where wallId is null for source/listener */
export type PathPoint = [number, number, number | null];
/** Complete reflection path from listener to source */
export type ReflectionPath = PathPoint[];
/** Wall segment defined by two endpoints */
export declare class Wall {
    p1: Point;
    p2: Point;
    constructor(p1: Point, p2: Point);
    draw(ctx: CanvasRenderingContext2D): void;
}
/** Listener position */
export declare class Listener {
    p0: Point;
    constructor(p0: Point);
    draw(ctx: CanvasRenderingContext2D): void;
}
/** Sound source position */
export declare class Source {
    p0: Point;
    constructor(p0: Point);
    draw(ctx: CanvasRenderingContext2D): void;
}
/** Main solver for beam tracing */
export declare class Solver {
    private readonly maxOrder;
    private readonly walls;
    private readonly source;
    private readonly bsp;
    private readonly beams;
    /**
     * @param walls Array of Wall objects defining the environment
     * @param source The sound source position
     * @param reflectionOrder Maximum number of reflections to compute (default: 5)
     *
     * Note: In v1.x, this parameter was incorrectly offset by -2 internally,
     * so reflectionOrder=4 actually computed 3 reflections. As of v2.0,
     * reflectionOrder now correctly represents the number of reflections.
     * If migrating from v1.x, subtract 1 from your previous value.
     */
    constructor(walls: Wall[], source: Source, reflectionOrder?: number);
    /** Get all valid reflection paths from source to listener */
    getPaths(listener: Listener): ReflectionPath[];
    /** Recursive function for going through all beams */
    private findPaths;
    /** Traverse the beam at the given node recursively while testing for intersections */
    private traverseBeam;
    /** Check intersection with current BSP node */
    private checkNodeIntersection;
    /** Ray tracing using BSP tree */
    private rayTrace;
}
export { OptimizedSolver, type Line2D, type FailLineType, type SkipCircle, type Bucket, type PerformanceMetrics } from './optimization';
export * as geometry from './geometry';
declare const BeamTrace2D: {
    Wall: typeof Wall;
    Source: typeof Source;
    Listener: typeof Listener;
    Solver: typeof Solver;
};
export default BeamTrace2D;
//# sourceMappingURL=beamtrace2d.d.ts.map