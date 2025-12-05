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

/** Line intersection result array: [x, y, onLine1, onLine2, onRay1, onRay2, wallId?] */
type IntersectionResult = [number, number, boolean, boolean, boolean, boolean, number?] | null;

/** Wall segment defined by two endpoints */
export class Wall {
  constructor(
    public p1: Point,
    public p2: Point
  ) {}

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.moveTo(this.p1[0], this.p1[1]);
    ctx.lineTo(this.p2[0], this.p2[1]);
    ctx.stroke();
  }
}

/** Listener position */
export class Listener {
  constructor(public p0: Point) {}

  draw(ctx: CanvasRenderingContext2D): void {
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
  constructor(public p0: Point) {}

  draw(ctx: CanvasRenderingContext2D): void {
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
  front: BSPNode | null = null;
  back: BSPNode | null = null;

  constructor(
    public id: number,
    public p1: Point,
    public p2: Point
  ) {}
}

/** Beam in 2D space with virtual source and window points */
class Beam {
  constructor(
    public vs: Point,  // Virtual source point
    public p1: Point,  // Window point 1
    public p2: Point   // Window point 2
  ) {}
}

/** Node in the beam tree */
class BeamNode {
  children: BeamNode[] = [];

  // Optimization fields for fail line caching
  failLine?: import('./geometry').Line2D;
  failLineType?: import('./geometry').FailLineType;

  constructor(
    public id: number,
    public parent: BeamNode | null,
    public vs: Point
  ) {}

  /** Clear cached fail line (called when listener escapes the fail region) */
  clearFailLine(): void {
    this.failLine = undefined;
    this.failLineType = undefined;
  }
}

/** BSP tree for accelerated ray-wall intersection tests */
class BSPTree {
  mainNode: BSPNode | null;

  constructor(walls: Wall[]) {
    const recursiveArray: BSPNode[] = [];
    for (let i = 0; i < walls.length; i++) {
      recursiveArray.push(new BSPNode(i, walls[i].p1, walls[i].p2));
    }
    this.mainNode = this.build(recursiveArray);
  }

  private build(recursiveArray: BSPNode[]): BSPNode | null {
    if (recursiveArray.length === 0) {
      return null;
    }

    while (recursiveArray.length > 1) {
      const node = recursiveArray.pop()!;
      const retval = this.divide(recursiveArray[0], node);

      if (retval === 1) {
        // In front
        recursiveArray[0].front = this.insertNode(
          recursiveArray[0].front,
          new BSPNode(node.id, node.p1, node.p2)
        );
      } else if (retval === -1) {
        // Behind
        recursiveArray[0].back = this.insertNode(
          recursiveArray[0].back,
          new BSPNode(node.id, node.p1, node.p2)
        );
      } else {
        // Split into two - retval is a tuple
        const splitResult = retval as [{ p1: Point; p2: Point }, { p1: Point; p2: Point }];
        recursiveArray[0].front = this.insertNode(
          recursiveArray[0].front,
          new BSPNode(node.id, splitResult[0].p1, splitResult[0].p2)
        );
        recursiveArray[0].back = this.insertNode(
          recursiveArray[0].back,
          new BSPNode(node.id, splitResult[1].p1, splitResult[1].p2)
        );
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

  private insertNode(existing: BSPNode | null, newNode: BSPNode): BSPNode {
    if (!existing) {
      return newNode;
    }
    // Chain nodes temporarily - they'll be rebuilt
    newNode.front = existing;
    return newNode;
  }

  private collectNodes(node: BSPNode | null): BSPNode[] {
    if (!node) return [];
    const nodes: BSPNode[] = [new BSPNode(node.id, node.p1, node.p2)];
    if (node.front) nodes.push(...this.collectNodes(node.front));
    if (node.back) nodes.push(...this.collectNodes(node.back));
    return nodes;
  }

  private divide(w1: BSPNode, w2: BSPNode): number | [{ p1: Point; p2: Point }, { p1: Point; p2: Point }] {
    const w2_n: [boolean, boolean] = [
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
    const p3 = lineIntersection(
      w1.p1[0], w1.p1[1], w1.p2[0], w1.p2[1],
      w2.p1[0], w2.p1[1], w2.p2[0], w2.p2[1]
    );

    if (!p3) {
      return w2_n[0] ? 1 : -1;
    }

    const intersectionPoint: Point = [p3[0], p3[1]];

    if (w2_n[0]) {
      // First line point is in front and second behind
      return [
        { p1: w2.p1, p2: intersectionPoint },
        { p1: intersectionPoint, p2: w2.p2 }
      ];
    } else {
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
  mainNode: BeamNode;

  constructor(source: Source, walls: Wall[], maxOrder: number) {
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

  private buildBeam(beam: Beam, node: BeamNode, walls: Wall[], order: number, maxOrder: number): void {
    if (order > maxOrder) return;

    // Make sure the source is mathematically behind the wall
    if (inFrontOf(beam.vs, beam.p1, beam.p2)) {
      const temp = beam.p2;
      beam.p2 = beam.p1;
      beam.p1 = temp;
    }

    for (let i = 0; i < walls.length; i++) {
      if (node.id === i) continue;

      let newLine: { p1: Point; p2: Point } | undefined;

      // Three segments A, B (inside) and C
      const p1_b = !inFrontOf(walls[i].p1, beam.p1, beam.p2);
      const p2_b = !inFrontOf(walls[i].p2, beam.p1, beam.p2);
      if (p1_b && p2_b) continue;

      const p1_a = !inFrontOf(walls[i].p1, beam.vs, beam.p2);
      const p2_a = !inFrontOf(walls[i].p2, beam.vs, beam.p2);
      if (p1_a && p2_a) continue;

      const p1_c = inFrontOf(walls[i].p1, beam.vs, beam.p1);
      const p2_c = inFrontOf(walls[i].p2, beam.vs, beam.p1);
      if (p1_c && p2_c) continue;

      const p1_in = !p1_a && !p1_b && !p1_c;
      const p2_in = !p2_a && !p2_b && !p2_c;

      let A = false;
      let B = false;
      let C = false;
      let int: IntersectionResult = null;

      if (p1_in && p2_in) {
        newLine = { p1: walls[i].p1, p2: walls[i].p2 };
      } else if (p1_in) {
        newLine = { p1: walls[i].p1, p2: [0, 0] };
        if (p2_a && !p2_b) {
          A = true;
        } else if (p2_a && p2_b && p2_c) {
          A = true; B = true; C = true;
        } else if (p2_a && p2_b) {
          A = true; B = true;
        } else if (!p2_a && p2_b && !p2_c) {
          B = true;
        } else if (p2_c && p2_b) {
          B = true; C = true;
        } else if (p2_c && !p2_b) {
          C = true;
        }
      } else if (p2_in) {
        newLine = { p1: walls[i].p2, p2: [0, 0] };
        if (p1_a && !p1_b) {
          A = true;
        } else if (p1_a && p1_b && p1_c) {
          A = true; B = true; C = true;
        } else if (p1_a && p1_b) {
          A = true; B = true;
        } else if (!p1_a && p1_b && !p1_c) {
          B = true;
        } else if (p1_c && p1_b) {
          B = true; C = true;
        } else if (p1_c && !p1_b) {
          C = true;
        }
      } else {
        // All points are outside boundaries
        if ((p1_a && p2_b) || (p2_a && p1_b)) {
          const int_a = lineIntersection(
            beam.p2[0], beam.p2[1],
            beam.p2[0] + (beam.p2[0] - beam.vs[0]) * 2,
            beam.p2[1] + (beam.p2[1] - beam.vs[1]) * 2,
            walls[i].p1[0], walls[i].p1[1],
            walls[i].p2[0], walls[i].p2[1]
          );
          if (int_a && int_a[4]) {
            const int_b = lineIntersection(
              beam.p1[0], beam.p1[1], beam.p2[0], beam.p2[1],
              walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]
            );
            if (int_b) {
              newLine = { p1: [int_a[0], int_a[1]], p2: [int_b[0], int_b[1]] };
            }
          }
        } else if ((p1_b && p2_c) || (p2_b && p1_c)) {
          const int_b = lineIntersection(
            beam.p1[0], beam.p1[1], beam.p2[0], beam.p2[1],
            walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]
          );
          if (int_b && int_b[4]) {
            const int_c = lineIntersection(
              beam.p1[0], beam.p1[1],
              beam.p1[0] + (beam.p1[0] - beam.vs[0]) * 2,
              beam.p1[1] + (beam.p1[1] - beam.vs[1]) * 2,
              walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]
            );
            if (int_c) {
              newLine = { p1: [int_b[0], int_b[1]], p2: [int_c[0], int_c[1]] };
            }
          }
        } else if (((p1_a && p2_c) || (p2_a && p1_c)) && (!p1_b && !p2_b)) {
          const int_a = lineIntersection(
            beam.p2[0], beam.p2[1],
            beam.p2[0] + (beam.p2[0] - beam.vs[0]) * 2,
            beam.p2[1] + (beam.p2[1] - beam.vs[1]) * 2,
            walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]
          );
          const int_c = lineIntersection(
            beam.p1[0], beam.p1[1],
            beam.p1[0] + (beam.p1[0] - beam.vs[0]) * 2,
            beam.p1[1] + (beam.p1[1] - beam.vs[1]) * 2,
            walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]
          );
          if (int_a && int_c) {
            newLine = { p1: [int_a[0], int_a[1]], p2: [int_c[0], int_c[1]] };
          }
        }
      }

      // Calculate intersection based on flags
      if (A && !B && !C) {
        int = lineIntersection(
          beam.vs[0], beam.vs[1], beam.p2[0], beam.p2[1],
          walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]
        );
      } else if (A && B && C) {
        int = lineIntersection(
          beam.p2[0], beam.p2[1],
          beam.p2[0] + (beam.p2[0] - beam.vs[0]),
          beam.p2[1] + (beam.p2[1] - beam.vs[1]),
          walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]
        );
        if (!int || !int[4]) {
          int = lineIntersection(
            beam.p1[0], beam.p1[1], beam.p2[0], beam.p2[1],
            walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]
          );
        }
        if (!int || !int[4]) {
          int = lineIntersection(
            beam.p1[0], beam.p1[1],
            beam.p1[0] + (beam.p1[0] - beam.vs[0]) * 2,
            beam.p1[1] + (beam.p1[1] - beam.vs[1]) * 2,
            walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]
          );
        }
      } else if (A && B) {
        int = lineIntersection(
          beam.p2[0], beam.p2[1],
          beam.p2[0] + (beam.p2[0] - beam.vs[0]),
          beam.p2[1] + (beam.p2[1] - beam.vs[1]),
          walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]
        );
        if (!int || !int[4]) {
          int = lineIntersection(
            beam.p1[0], beam.p1[1], beam.p2[0], beam.p2[1],
            walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]
          );
        }
      } else if (!A && B && !C) {
        int = lineIntersection(
          beam.p1[0], beam.p1[1], beam.p2[0], beam.p2[1],
          walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]
        );
      } else if (B && C) {
        int = lineIntersection(
          beam.p1[0], beam.p1[1], beam.p2[0], beam.p2[1],
          walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]
        );
        if (!int || !int[4]) {
          int = lineIntersection(
            beam.p1[0], beam.p1[1],
            beam.p1[0] + (beam.p1[0] - beam.vs[0]),
            beam.p1[1] + (beam.p1[1] - beam.vs[1]),
            walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]
          );
        }
      } else if (!A && !B && C) {
        int = lineIntersection(
          beam.vs[0], beam.vs[1], beam.p1[0], beam.p1[1],
          walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]
        );
      }

      if (int && newLine) {
        newLine.p2 = [int[0], int[1]];
      }

      if (newLine) {
        const newBeam = new Beam(
          pointMirror(beam.vs, walls[i].p1, walls[i].p2),
          newLine.p1,
          newLine.p2
        );
        const childNode = new BeamNode(i, node, newBeam.vs);
        node.children.push(childNode);
        this.buildBeam(newBeam, childNode, walls, order + 1, maxOrder);
      }
    }
  }
}

/* Helper functions */

/** Returns the intersection point of two lines along with additional information */
function lineIntersection(
  x11: number, y11: number, x12: number, y12: number,
  x21: number, y21: number, x22: number, y22: number
): IntersectionResult {
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
function inFrontOf(p0: Point, p1: Point, p2: Point): boolean {
  // Line normal
  const n1: Point = [-(p2[1] - p1[1]), (p2[0] - p1[0])];
  // Dot product for distance after translating so dist is relative to origin
  return n1[0] * (p0[0] - p1[0]) + n1[1] * (p0[1] - p1[1]) > 0;
}

/** Mirrors point p0 along line defined by p1 and p2 */
function pointMirror(p0: Point, p1: Point, p2: Point): Point {
  // Line normal
  let n1: Point = [-(p2[1] - p1[1]), (p2[0] - p1[0])];
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
  private readonly maxOrder: number;
  private readonly walls: Wall[];
  private readonly source: Source;
  private readonly bsp: BSPTree;
  private readonly beams: BeamTree;

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
  constructor(walls: Wall[], source: Source, reflectionOrder?: number) {
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
  getPaths(listener: Listener): ReflectionPath[] {
    if (!listener) {
      throw new Error("BeamTrace2D: listener is required");
    }
    return this.findPaths(listener, this.beams.mainNode);
  }

  /** Recursive function for going through all beams */
  private findPaths(listener: Listener, node: BeamNode): ReflectionPath[] {
    let pathArray: ReflectionPath[] = [];

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
  private traverseBeam(
    p0: Point,
    node: BeamNode,
    prevNode: BeamNode | null,
    pTree: ReflectionPath
  ): ReflectionPath | null {
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
      } else {
        return null; // The path to the source is blocked
      }
    } else {
      if (!int) return null;

      pTree.push([int[0], int[1], node.id]);
      return this.traverseBeam([int[0], int[1]], node.parent!, node, pTree);
    }
  }

  /** Check intersection with current BSP node */
  private checkNodeIntersection(
    p1: Point,
    p2: Point,
    bspNode: BSPNode,
    ignoreId: number
  ): IntersectionResult {
    const lineInt = lineIntersection(
      p1[0], p1[1], p2[0], p2[1],
      bspNode.p1[0], bspNode.p1[1], bspNode.p2[0], bspNode.p2[1]
    );
    if (bspNode.id === ignoreId) {
      return null;
    } else if (lineInt) {
      return [lineInt[0], lineInt[1], lineInt[2], lineInt[3], lineInt[4], lineInt[5], bspNode.id];
    }
    return null;
  }

  /** Ray tracing using BSP tree */
  private rayTrace(
    p1: Point,
    p2: Point,
    bspNode: BSPNode | null,
    ignoreId: number,
    validId: number,
    order: number
  ): IntersectionResult {
    if (!bspNode) return null;

    let int: IntersectionResult = null;
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
export {
  OptimizedSolver,
  type Line2D,
  type FailLineType,
  type SkipCircle,
  type Bucket,
  type PerformanceMetrics
} from './optimization';

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
