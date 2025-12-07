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
/** Wall segment defined by two endpoints */
export class Wall {
    constructor(p1, p2) {
        this.p1 = p1;
        this.p2 = p2;
    }
    draw(ctx) {
        ctx.beginPath();
        ctx.moveTo(this.p1[0], this.p1[1]);
        ctx.lineTo(this.p2[0], this.p2[1]);
        ctx.stroke();
    }
}
/** Listener position */
export class Listener {
    constructor(p0) {
        this.p0 = p0;
    }
    draw(ctx) {
        const oldFill = ctx.fillStyle;
        ctx.beginPath();
        ctx.arc(this.p0[0], this.p0[1], 10, 0, 2 * Math.PI);
        ctx.fillStyle = 'yellow';
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = oldFill;
    }
}
/** Sound source position */
export class Source {
    constructor(p0) {
        this.p0 = p0;
    }
    draw(ctx) {
        const oldFill = ctx.fillStyle;
        ctx.beginPath();
        ctx.arc(this.p0[0], this.p0[1], 10, 0, 2 * Math.PI);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = oldFill;
    }
}
/** BSP tree node for spatial partitioning */
class BSPNode {
    constructor(id, p1, p2) {
        this.id = id;
        this.p1 = p1;
        this.p2 = p2;
        this.front = null;
        this.back = null;
    }
}
/** Beam in 2D space with virtual source and window points */
class Beam {
    constructor(vs, // Virtual source point
    p1, // Window point 1
    p2 // Window point 2
    ) {
        this.vs = vs;
        this.p1 = p1;
        this.p2 = p2;
    }
}
/** Node in the beam tree */
class BeamNode {
    constructor(id, parent, vs) {
        this.id = id;
        this.parent = parent;
        this.vs = vs;
        this.children = [];
    }
    /** Clear cached fail line (called when listener escapes the fail region) */
    clearFailLine() {
        this.failLine = undefined;
        this.failLineType = undefined;
    }
}
/** BSP tree for accelerated ray-wall intersection tests */
class BSPTree {
    constructor(walls) {
        const recursiveArray = [];
        for (let i = 0; i < walls.length; i++) {
            recursiveArray.push(new BSPNode(i, walls[i].p1, walls[i].p2));
        }
        this.mainNode = this.build(recursiveArray);
    }
    build(recursiveArray) {
        if (recursiveArray.length === 0) {
            return null;
        }
        while (recursiveArray.length > 1) {
            const node = recursiveArray.pop();
            const retval = this.divide(recursiveArray[0], node);
            if (retval === 1) {
                // In front
                recursiveArray[0].front = this.insertNode(recursiveArray[0].front, new BSPNode(node.id, node.p1, node.p2));
            }
            else if (retval === -1) {
                // Behind
                recursiveArray[0].back = this.insertNode(recursiveArray[0].back, new BSPNode(node.id, node.p1, node.p2));
            }
            else {
                // Split into two - retval is a tuple
                const splitResult = retval;
                recursiveArray[0].front = this.insertNode(recursiveArray[0].front, new BSPNode(node.id, splitResult[0].p1, splitResult[0].p2));
                recursiveArray[0].back = this.insertNode(recursiveArray[0].back, new BSPNode(node.id, splitResult[1].p1, splitResult[1].p2));
            }
        }
        // Convert front/back from single nodes to built trees
        if (recursiveArray[0].front) {
            recursiveArray[0].front = this.build(this.collectNodes(recursiveArray[0].front));
        }
        if (recursiveArray[0].back) {
            recursiveArray[0].back = this.build(this.collectNodes(recursiveArray[0].back));
        }
        return recursiveArray[0];
    }
    insertNode(existing, newNode) {
        if (!existing) {
            return newNode;
        }
        // Chain nodes temporarily - they'll be rebuilt
        newNode.front = existing;
        return newNode;
    }
    collectNodes(node) {
        if (!node)
            return [];
        const nodes = [new BSPNode(node.id, node.p1, node.p2)];
        if (node.front)
            nodes.push(...this.collectNodes(node.front));
        if (node.back)
            nodes.push(...this.collectNodes(node.back));
        return nodes;
    }
    divide(w1, w2) {
        const w2_n = [
            inFrontOf(w2.p1, w1.p1, w1.p2),
            inFrontOf(w2.p2, w1.p1, w1.p2)
        ];
        if (w2_n[0] && w2_n[1]) {
            return 1; // Both line points are in front
        }
        if (!w2_n[0] && !w2_n[1]) {
            return -1; // Both line points are behind
        }
        // We need to divide the lines
        const p3 = lineIntersection(w1.p1[0], w1.p1[1], w1.p2[0], w1.p2[1], w2.p1[0], w2.p1[1], w2.p2[0], w2.p2[1]);
        if (!p3) {
            return w2_n[0] ? 1 : -1;
        }
        const intersectionPoint = [p3[0], p3[1]];
        if (w2_n[0]) {
            // First line point is in front and second behind
            return [
                { p1: w2.p1, p2: intersectionPoint },
                { p1: intersectionPoint, p2: w2.p2 }
            ];
        }
        else {
            // First line point is behind and second in front
            return [
                { p1: intersectionPoint, p2: w2.p2 },
                { p1: w2.p1, p2: intersectionPoint }
            ];
        }
    }
}
/** Beam tree for tracking virtual sources and reflection paths */
class BeamTree {
    constructor(source, walls, maxOrder) {
        this.mainNode = new BeamNode(-1, null, source.p0);
        for (let i = 0; i < walls.length; i++) {
            const vs = pointMirror(source.p0, walls[i].p1, walls[i].p2);
            const beam = new Beam(vs, walls[i].p1, walls[i].p2);
            const childNode = new BeamNode(i, this.mainNode, vs);
            this.mainNode.children.push(childNode);
            // Recursively build children
            this.buildBeam(beam, childNode, walls, 0, maxOrder);
        }
    }
    buildBeam(beam, node, walls, order, maxOrder) {
        if (order > maxOrder)
            return;
        // Make sure the source is mathematically behind the wall
        if (inFrontOf(beam.vs, beam.p1, beam.p2)) {
            const temp = beam.p2;
            beam.p2 = beam.p1;
            beam.p1 = temp;
        }
        for (let i = 0; i < walls.length; i++) {
            if (node.id === i)
                continue;
            let newLine;
            // Three segments A, B (inside) and C
            const p1_b = !inFrontOf(walls[i].p1, beam.p1, beam.p2);
            const p2_b = !inFrontOf(walls[i].p2, beam.p1, beam.p2);
            if (p1_b && p2_b)
                continue;
            const p1_a = !inFrontOf(walls[i].p1, beam.vs, beam.p2);
            const p2_a = !inFrontOf(walls[i].p2, beam.vs, beam.p2);
            if (p1_a && p2_a)
                continue;
            const p1_c = inFrontOf(walls[i].p1, beam.vs, beam.p1);
            const p2_c = inFrontOf(walls[i].p2, beam.vs, beam.p1);
            if (p1_c && p2_c)
                continue;
            const p1_in = !p1_a && !p1_b && !p1_c;
            const p2_in = !p2_a && !p2_b && !p2_c;
            let A = false;
            let B = false;
            let C = false;
            let int = null;
            if (p1_in && p2_in) {
                newLine = { p1: walls[i].p1, p2: walls[i].p2 };
            }
            else if (p1_in) {
                newLine = { p1: walls[i].p1, p2: [0, 0] };
                if (p2_a && !p2_b) {
                    A = true;
                }
                else if (p2_a && p2_b && p2_c) {
                    A = true;
                    B = true;
                    C = true;
                }
                else if (p2_a && p2_b) {
                    A = true;
                    B = true;
                }
                else if (!p2_a && p2_b && !p2_c) {
                    B = true;
                }
                else if (p2_c && p2_b) {
                    B = true;
                    C = true;
                }
                else if (p2_c && !p2_b) {
                    C = true;
                }
            }
            else if (p2_in) {
                newLine = { p1: walls[i].p2, p2: [0, 0] };
                if (p1_a && !p1_b) {
                    A = true;
                }
                else if (p1_a && p1_b && p1_c) {
                    A = true;
                    B = true;
                    C = true;
                }
                else if (p1_a && p1_b) {
                    A = true;
                    B = true;
                }
                else if (!p1_a && p1_b && !p1_c) {
                    B = true;
                }
                else if (p1_c && p1_b) {
                    B = true;
                    C = true;
                }
                else if (p1_c && !p1_b) {
                    C = true;
                }
            }
            else {
                // All points are outside boundaries
                if ((p1_a && p2_b) || (p2_a && p1_b)) {
                    const int_a = lineIntersection(beam.p2[0], beam.p2[1], beam.p2[0] + (beam.p2[0] - beam.vs[0]) * 2, beam.p2[1] + (beam.p2[1] - beam.vs[1]) * 2, walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
                    if (int_a && int_a[4]) {
                        const int_b = lineIntersection(beam.p1[0], beam.p1[1], beam.p2[0], beam.p2[1], walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
                        if (int_b) {
                            newLine = { p1: [int_a[0], int_a[1]], p2: [int_b[0], int_b[1]] };
                        }
                    }
                }
                else if ((p1_b && p2_c) || (p2_b && p1_c)) {
                    const int_b = lineIntersection(beam.p1[0], beam.p1[1], beam.p2[0], beam.p2[1], walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
                    if (int_b && int_b[4]) {
                        const int_c = lineIntersection(beam.p1[0], beam.p1[1], beam.p1[0] + (beam.p1[0] - beam.vs[0]) * 2, beam.p1[1] + (beam.p1[1] - beam.vs[1]) * 2, walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
                        if (int_c) {
                            newLine = { p1: [int_b[0], int_b[1]], p2: [int_c[0], int_c[1]] };
                        }
                    }
                }
                else if (((p1_a && p2_c) || (p2_a && p1_c)) && (!p1_b && !p2_b)) {
                    const int_a = lineIntersection(beam.p2[0], beam.p2[1], beam.p2[0] + (beam.p2[0] - beam.vs[0]) * 2, beam.p2[1] + (beam.p2[1] - beam.vs[1]) * 2, walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
                    const int_c = lineIntersection(beam.p1[0], beam.p1[1], beam.p1[0] + (beam.p1[0] - beam.vs[0]) * 2, beam.p1[1] + (beam.p1[1] - beam.vs[1]) * 2, walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
                    if (int_a && int_c) {
                        newLine = { p1: [int_a[0], int_a[1]], p2: [int_c[0], int_c[1]] };
                    }
                }
            }
            // Calculate intersection based on flags
            if (A && !B && !C) {
                int = lineIntersection(beam.vs[0], beam.vs[1], beam.p2[0], beam.p2[1], walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
            }
            else if (A && B && C) {
                int = lineIntersection(beam.p2[0], beam.p2[1], beam.p2[0] + (beam.p2[0] - beam.vs[0]), beam.p2[1] + (beam.p2[1] - beam.vs[1]), walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
                if (!int || !int[4]) {
                    int = lineIntersection(beam.p1[0], beam.p1[1], beam.p2[0], beam.p2[1], walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
                }
                if (!int || !int[4]) {
                    int = lineIntersection(beam.p1[0], beam.p1[1], beam.p1[0] + (beam.p1[0] - beam.vs[0]) * 2, beam.p1[1] + (beam.p1[1] - beam.vs[1]) * 2, walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
                }
            }
            else if (A && B) {
                int = lineIntersection(beam.p2[0], beam.p2[1], beam.p2[0] + (beam.p2[0] - beam.vs[0]), beam.p2[1] + (beam.p2[1] - beam.vs[1]), walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
                if (!int || !int[4]) {
                    int = lineIntersection(beam.p1[0], beam.p1[1], beam.p2[0], beam.p2[1], walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
                }
            }
            else if (!A && B && !C) {
                int = lineIntersection(beam.p1[0], beam.p1[1], beam.p2[0], beam.p2[1], walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
            }
            else if (B && C) {
                int = lineIntersection(beam.p1[0], beam.p1[1], beam.p2[0], beam.p2[1], walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
                if (!int || !int[4]) {
                    int = lineIntersection(beam.p1[0], beam.p1[1], beam.p1[0] + (beam.p1[0] - beam.vs[0]), beam.p1[1] + (beam.p1[1] - beam.vs[1]), walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
                }
            }
            else if (!A && !B && C) {
                int = lineIntersection(beam.vs[0], beam.vs[1], beam.p1[0], beam.p1[1], walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
            }
            if (int && newLine) {
                newLine.p2 = [int[0], int[1]];
            }
            if (newLine) {
                const newBeam = new Beam(pointMirror(beam.vs, walls[i].p1, walls[i].p2), newLine.p1, newLine.p2);
                const childNode = new BeamNode(i, node, newBeam.vs);
                node.children.push(childNode);
                this.buildBeam(newBeam, childNode, walls, order + 1, maxOrder);
            }
        }
    }
}
/* Helper functions */
/** Returns the intersection point of two lines along with additional information */
function lineIntersection(x11, y11, x12, y12, x21, y21, x22, y22) {
    const denominator = ((y22 - y21) * (x12 - x11)) - ((x22 - x21) * (y12 - y11));
    if (denominator === 0) {
        return null;
    }
    const a_temp = y11 - y21;
    const b_temp = x11 - x21;
    const numerator1 = ((x22 - x21) * a_temp) - ((y22 - y21) * b_temp);
    const numerator2 = ((x12 - x11) * a_temp) - ((y12 - y11) * b_temp);
    const a = numerator1 / denominator;
    const b = numerator2 / denominator;
    const x = x11 + (a * (x12 - x11));
    const y = y11 + (a * (y12 - y11));
    const onRay1 = a > 0;
    const onLine1 = a > 0 && a < 1;
    const onRay2 = b > 0;
    const onLine2 = b > 0 && b < 1;
    return [x, y, onLine1, onLine2, onRay1, onRay2];
}
/** Returns true if p0 is in front of line defined by p1, p2 */
function inFrontOf(p0, p1, p2) {
    // Line normal
    const n1 = [-(p2[1] - p1[1]), (p2[0] - p1[0])];
    // Dot product for distance after translating so dist is relative to origin
    return n1[0] * (p0[0] - p1[0]) + n1[1] * (p0[1] - p1[1]) > 0;
}
/** Calculates the normalized direction vector from p1 to p2 */
function normalizeDirection(p1, p2) {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0)
        return [0, 0];
    return [dx / len, dy / len];
}
/** Calculates the distance between two points */
function distance(p1, p2) {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    return Math.sqrt(dx * dx + dy * dy);
}
/** Gets the wall normal vector (normalized), optionally oriented toward a reference point */
function getWallNormal(wall, referencePoint) {
    const dx = wall.p2[0] - wall.p1[0];
    const dy = wall.p2[1] - wall.p1[1];
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0)
        return [0, 0];
    // Normal is perpendicular to wall direction
    let normal = [-dy / len, dx / len];
    // If reference point provided, orient normal toward it
    if (referencePoint) {
        const toRef = [referencePoint[0] - wall.p1[0], referencePoint[1] - wall.p1[1]];
        const dot = normal[0] * toRef[0] + normal[1] * toRef[1];
        if (dot < 0) {
            normal = [-normal[0], -normal[1]];
        }
    }
    return normal;
}
/** Calculates the angle between a direction vector and a wall normal (in radians) */
function calculateIncidenceAngle(direction, wallNormal) {
    // Dot product gives cos(angle) between the vectors
    // We want the angle with respect to the normal, so we use the incoming direction (negated)
    const incomingDir = [-direction[0], -direction[1]];
    const dot = incomingDir[0] * wallNormal[0] + incomingDir[1] * wallNormal[1];
    // Clamp to avoid floating point errors with acos
    const clampedDot = Math.max(-1, Math.min(1, dot));
    return Math.acos(clampedDot);
}
/** Calculates the parametric position (t) of a point along a wall (0 = p1, 1 = p2) */
function calculateWallPosition(hitPoint, wall) {
    const wallDx = wall.p2[0] - wall.p1[0];
    const wallDy = wall.p2[1] - wall.p1[1];
    const wallLengthSq = wallDx * wallDx + wallDy * wallDy;
    if (wallLengthSq === 0)
        return 0;
    const pointDx = hitPoint[0] - wall.p1[0];
    const pointDy = hitPoint[1] - wall.p1[1];
    const t = (pointDx * wallDx + pointDy * wallDy) / wallLengthSq;
    return Math.max(0, Math.min(1, t));
}
/** Threshold angle (in radians) for grazing incidence detection - angle from normal > 85° (i.e., within 5° of parallel to surface) */
const GRAZING_THRESHOLD = Math.PI / 2 - (5 * Math.PI / 180);
/** Mirrors point p0 along line defined by p1 and p2 */
function pointMirror(p0, p1, p2) {
    // Line normal
    let n1 = [-(p2[1] - p1[1]), (p2[0] - p1[0])];
    const n1_len = Math.sqrt(n1[0] * n1[0] + n1[1] * n1[1]);
    if (n1_len === 0) {
        return p0; // Degenerate wall (p1 === p2), return original point
    }
    n1 = [n1[0] / n1_len, n1[1] / n1_len];
    // Dot product for distance after translating so dist is relative to origin
    const dist = 2 * (n1[0] * (p0[0] - p1[0]) + n1[1] * (p0[1] - p1[1]));
    // New point is negative normal x distance added to original position
    return [p0[0] - n1[0] * dist, p0[1] - n1[1] * dist];
}
/** Main solver for beam tracing */
export class Solver {
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
    constructor(walls, source, reflectionOrder) {
        if (!walls || walls.length === 0) {
            throw new Error('BeamTrace2D: at least one wall is required');
        }
        if (!source) {
            throw new Error('BeamTrace2D: source is required');
        }
        // maxOrder is the 0-based tree depth limit; reflectionOrder N means N reflections (0 to N-1)
        this.maxOrder = reflectionOrder !== undefined ? reflectionOrder - 1 : 4;
        this.walls = walls;
        this.source = source;
        this.bsp = new BSPTree(walls);
        this.beams = new BeamTree(source, walls, this.maxOrder);
    }
    /** Get all valid reflection paths from source to listener */
    getPaths(listener) {
        if (!listener) {
            throw new Error("BeamTrace2D: listener is required");
        }
        return this.findPaths(listener, this.beams.mainNode);
    }
    /**
     * Get detailed information about all valid reflection paths from source to listener.
     * Returns comprehensive data including wall references, hit points, and angles.
     */
    getDetailedPaths(listener) {
        if (!listener) {
            throw new Error("BeamTrace2D: listener is required");
        }
        const simplePaths = this.getPaths(listener);
        return simplePaths.map(path => this.convertToDetailedPath(path));
    }
    /** Convert a simple ReflectionPath to a DetailedReflectionPath */
    convertToDetailedPath(path) {
        const listenerPosition = [path[0][0], path[0][1]];
        const sourcePosition = [path[path.length - 1][0], path[path.length - 1][1]];
        const reflections = [];
        const segments = [];
        let totalPathLength = 0;
        let cumulativeDistance = 0;
        let reflectionOrder = 0;
        // Path goes from listener -> reflection points -> source
        // So reflections are at indices 1 to path.length - 2
        for (let i = 0; i < path.length - 1; i++) {
            const currentPoint = [path[i][0], path[i][1]];
            const nextPoint = [path[i + 1][0], path[i + 1][1]];
            // Calculate segment length
            const segmentLength = distance(currentPoint, nextPoint);
            totalPathLength += segmentLength;
            // Store segment details
            segments.push({
                startPoint: currentPoint,
                endPoint: nextPoint,
                length: segmentLength,
                segmentIndex: i
            });
            // If next point is a reflection (has a wall ID), compute details
            const wallId = path[i + 1][2];
            if (wallId !== null && i + 2 < path.length) {
                reflectionOrder++;
                cumulativeDistance += segmentLength;
                const hitPoint = [path[i + 1][0], path[i + 1][1]];
                const prevPoint = currentPoint;
                const nextNextPoint = [path[i + 2][0], path[i + 2][1]];
                const wall = this.walls[wallId];
                // Calculate directions
                const incomingDirection = normalizeDirection(prevPoint, hitPoint);
                const outgoingDirection = normalizeDirection(hitPoint, nextNextPoint);
                // Get wall normal oriented toward the incoming ray
                const wallNormal = getWallNormal(wall, prevPoint);
                // Calculate incidence angle (angle between incoming ray and normal)
                const incidenceAngle = calculateIncidenceAngle(incomingDirection, wallNormal);
                // For specular reflection, reflection angle equals incidence angle
                const reflectionAngle = incidenceAngle;
                // Calculate wall position (parametric t value)
                const wallPosition = calculateWallPosition(hitPoint, wall);
                // Check for grazing incidence
                const isGrazing = incidenceAngle > GRAZING_THRESHOLD;
                reflections.push({
                    wall,
                    wallId,
                    hitPoint,
                    incidenceAngle,
                    reflectionAngle,
                    incomingDirection,
                    outgoingDirection,
                    wallNormal,
                    reflectionOrder,
                    wallPosition,
                    cumulativeDistance,
                    incomingSegmentLength: segmentLength,
                    isGrazing
                });
            }
        }
        return {
            listenerPosition,
            sourcePosition,
            totalPathLength,
            reflectionCount: reflections.length,
            reflections,
            segments,
            simplePath: path
        };
    }
    /** Recursive function for going through all beams */
    findPaths(listener, node) {
        let pathArray = [];
        for (let i = 0; i < node.children.length; i++) {
            pathArray = pathArray.concat(this.findPaths(listener, node.children[i]));
        }
        const pTree = this.traverseBeam(listener.p0, node, null, [[listener.p0[0], listener.p0[1], null]]);
        if (pTree) {
            pathArray.push(pTree);
        }
        return pathArray;
    }
    /** Traverse the beam at the given node recursively while testing for intersections */
    traverseBeam(p0, node, prevNode, pTree) {
        const ignoreId = prevNode ? prevNode.id : -1;
        // Find intersection from location to next image source
        let int = this.rayTrace(p0, node.vs, this.bsp.mainNode, ignoreId, node.id, 0);
        if (!int || (node.id !== -1 && int[6] !== node.id) || !int[2] || !int[3]) {
            int = null;
        }
        if (node.id === -1) {
            // The path to the source
            if (!int) {
                pTree.push([node.vs[0], node.vs[1], null]);
                return pTree;
            }
            else {
                return null; // The path to the source is blocked
            }
        }
        else {
            if (!int)
                return null;
            pTree.push([int[0], int[1], node.id]);
            return this.traverseBeam([int[0], int[1]], node.parent, node, pTree);
        }
    }
    /** Check intersection with current BSP node */
    checkNodeIntersection(p1, p2, bspNode, ignoreId) {
        const lineInt = lineIntersection(p1[0], p1[1], p2[0], p2[1], bspNode.p1[0], bspNode.p1[1], bspNode.p2[0], bspNode.p2[1]);
        if (bspNode.id === ignoreId) {
            return null;
        }
        else if (lineInt) {
            return [lineInt[0], lineInt[1], lineInt[2], lineInt[3], lineInt[4], lineInt[5], bspNode.id];
        }
        return null;
    }
    /** Ray tracing using BSP tree */
    rayTrace(p1, p2, bspNode, ignoreId, validId, order) {
        if (!bspNode)
            return null;
        let int = null;
        const isFront = inFrontOf(p1, bspNode.p1, bspNode.p2);
        const nearChild = isFront ? bspNode.front : bspNode.back;
        const farChild = isFront ? bspNode.back : bspNode.front;
        int = this.rayTrace(p1, p2, nearChild, ignoreId, validId, order);
        if (!int || !int[2] || !int[3]) {
            int = this.checkNodeIntersection(p1, p2, bspNode, ignoreId);
        }
        if (!int || !int[2] || !int[3]) {
            int = this.rayTrace(p1, p2, farChild, ignoreId, validId, order);
        }
        return int;
    }
}
// Re-export optimization module
export { OptimizedSolver } from './optimization';
// Re-export geometry utilities for advanced usage
export * as geometry from './geometry';
// Default export for convenience
const BeamTrace2D = {
    Wall,
    Source,
    Listener,
    Solver
};
export default BeamTrace2D;
//# sourceMappingURL=beamtrace2d.js.map