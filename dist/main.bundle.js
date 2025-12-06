"use strict";
(() => {
  // dist/beamtrace2d.js
  var Wall = class {
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
  };
  var Listener = class {
    constructor(p0) {
      this.p0 = p0;
    }
    draw(ctx) {
      const oldFill = ctx.fillStyle;
      ctx.beginPath();
      ctx.arc(this.p0[0], this.p0[1], 10, 0, 2 * Math.PI);
      ctx.fillStyle = "yellow";
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = oldFill;
    }
  };
  var Source = class {
    constructor(p0) {
      this.p0 = p0;
    }
    draw(ctx) {
      const oldFill = ctx.fillStyle;
      ctx.beginPath();
      ctx.arc(this.p0[0], this.p0[1], 10, 0, 2 * Math.PI);
      ctx.fillStyle = "red";
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = oldFill;
    }
  };
  var BSPNode = class {
    constructor(id, p1, p2) {
      this.id = id;
      this.p1 = p1;
      this.p2 = p2;
      this.front = null;
      this.back = null;
    }
  };
  var Beam = class {
    constructor(vs, p1, p2) {
      this.vs = vs;
      this.p1 = p1;
      this.p2 = p2;
    }
  };
  var BeamNode = class {
    constructor(id, parent, vs) {
      this.id = id;
      this.parent = parent;
      this.vs = vs;
      this.children = [];
    }
    /** Clear cached fail line (called when listener escapes the fail region) */
    clearFailLine() {
      this.failLine = void 0;
      this.failLineType = void 0;
    }
  };
  var BSPTree = class {
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
          recursiveArray[0].front = this.insertNode(recursiveArray[0].front, new BSPNode(node.id, node.p1, node.p2));
        } else if (retval === -1) {
          recursiveArray[0].back = this.insertNode(recursiveArray[0].back, new BSPNode(node.id, node.p1, node.p2));
        } else {
          const splitResult = retval;
          recursiveArray[0].front = this.insertNode(recursiveArray[0].front, new BSPNode(node.id, splitResult[0].p1, splitResult[0].p2));
          recursiveArray[0].back = this.insertNode(recursiveArray[0].back, new BSPNode(node.id, splitResult[1].p1, splitResult[1].p2));
        }
      }
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
        return 1;
      }
      if (!w2_n[0] && !w2_n[1]) {
        return -1;
      }
      const p3 = lineIntersection(w1.p1[0], w1.p1[1], w1.p2[0], w1.p2[1], w2.p1[0], w2.p1[1], w2.p2[0], w2.p2[1]);
      if (!p3) {
        return w2_n[0] ? 1 : -1;
      }
      const intersectionPoint = [p3[0], p3[1]];
      if (w2_n[0]) {
        return [
          { p1: w2.p1, p2: intersectionPoint },
          { p1: intersectionPoint, p2: w2.p2 }
        ];
      } else {
        return [
          { p1: intersectionPoint, p2: w2.p2 },
          { p1: w2.p1, p2: intersectionPoint }
        ];
      }
    }
  };
  var BeamTree = class {
    constructor(source, walls, maxOrder) {
      this.mainNode = new BeamNode(-1, null, source.p0);
      for (let i = 0; i < walls.length; i++) {
        const vs = pointMirror(source.p0, walls[i].p1, walls[i].p2);
        const beam = new Beam(vs, walls[i].p1, walls[i].p2);
        const childNode = new BeamNode(i, this.mainNode, vs);
        this.mainNode.children.push(childNode);
        this.buildBeam(beam, childNode, walls, 0, maxOrder);
      }
    }
    buildBeam(beam, node, walls, order, maxOrder) {
      if (order > maxOrder)
        return;
      if (inFrontOf(beam.vs, beam.p1, beam.p2)) {
        const temp = beam.p2;
        beam.p2 = beam.p1;
        beam.p1 = temp;
      }
      for (let i = 0; i < walls.length; i++) {
        if (node.id === i)
          continue;
        let newLine;
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
        } else if (p1_in) {
          newLine = { p1: walls[i].p1, p2: [0, 0] };
          if (p2_a && !p2_b) {
            A = true;
          } else if (p2_a && p2_b && p2_c) {
            A = true;
            B = true;
            C = true;
          } else if (p2_a && p2_b) {
            A = true;
            B = true;
          } else if (!p2_a && p2_b && !p2_c) {
            B = true;
          } else if (p2_c && p2_b) {
            B = true;
            C = true;
          } else if (p2_c && !p2_b) {
            C = true;
          }
        } else if (p2_in) {
          newLine = { p1: walls[i].p2, p2: [0, 0] };
          if (p1_a && !p1_b) {
            A = true;
          } else if (p1_a && p1_b && p1_c) {
            A = true;
            B = true;
            C = true;
          } else if (p1_a && p1_b) {
            A = true;
            B = true;
          } else if (!p1_a && p1_b && !p1_c) {
            B = true;
          } else if (p1_c && p1_b) {
            B = true;
            C = true;
          } else if (p1_c && !p1_b) {
            C = true;
          }
        } else {
          if (p1_a && p2_b || p2_a && p1_b) {
            const int_a = lineIntersection(beam.p2[0], beam.p2[1], beam.p2[0] + (beam.p2[0] - beam.vs[0]) * 2, beam.p2[1] + (beam.p2[1] - beam.vs[1]) * 2, walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
            if (int_a && int_a[4]) {
              const int_b = lineIntersection(beam.p1[0], beam.p1[1], beam.p2[0], beam.p2[1], walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
              if (int_b) {
                newLine = { p1: [int_a[0], int_a[1]], p2: [int_b[0], int_b[1]] };
              }
            }
          } else if (p1_b && p2_c || p2_b && p1_c) {
            const int_b = lineIntersection(beam.p1[0], beam.p1[1], beam.p2[0], beam.p2[1], walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
            if (int_b && int_b[4]) {
              const int_c = lineIntersection(beam.p1[0], beam.p1[1], beam.p1[0] + (beam.p1[0] - beam.vs[0]) * 2, beam.p1[1] + (beam.p1[1] - beam.vs[1]) * 2, walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
              if (int_c) {
                newLine = { p1: [int_b[0], int_b[1]], p2: [int_c[0], int_c[1]] };
              }
            }
          } else if ((p1_a && p2_c || p2_a && p1_c) && (!p1_b && !p2_b)) {
            const int_a = lineIntersection(beam.p2[0], beam.p2[1], beam.p2[0] + (beam.p2[0] - beam.vs[0]) * 2, beam.p2[1] + (beam.p2[1] - beam.vs[1]) * 2, walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
            const int_c = lineIntersection(beam.p1[0], beam.p1[1], beam.p1[0] + (beam.p1[0] - beam.vs[0]) * 2, beam.p1[1] + (beam.p1[1] - beam.vs[1]) * 2, walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
            if (int_a && int_c) {
              newLine = { p1: [int_a[0], int_a[1]], p2: [int_c[0], int_c[1]] };
            }
          }
        }
        if (A && !B && !C) {
          int = lineIntersection(beam.vs[0], beam.vs[1], beam.p2[0], beam.p2[1], walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
        } else if (A && B && C) {
          int = lineIntersection(beam.p2[0], beam.p2[1], beam.p2[0] + (beam.p2[0] - beam.vs[0]), beam.p2[1] + (beam.p2[1] - beam.vs[1]), walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
          if (!int || !int[4]) {
            int = lineIntersection(beam.p1[0], beam.p1[1], beam.p2[0], beam.p2[1], walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
          }
          if (!int || !int[4]) {
            int = lineIntersection(beam.p1[0], beam.p1[1], beam.p1[0] + (beam.p1[0] - beam.vs[0]) * 2, beam.p1[1] + (beam.p1[1] - beam.vs[1]) * 2, walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
          }
        } else if (A && B) {
          int = lineIntersection(beam.p2[0], beam.p2[1], beam.p2[0] + (beam.p2[0] - beam.vs[0]), beam.p2[1] + (beam.p2[1] - beam.vs[1]), walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
          if (!int || !int[4]) {
            int = lineIntersection(beam.p1[0], beam.p1[1], beam.p2[0], beam.p2[1], walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
          }
        } else if (!A && B && !C) {
          int = lineIntersection(beam.p1[0], beam.p1[1], beam.p2[0], beam.p2[1], walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
        } else if (B && C) {
          int = lineIntersection(beam.p1[0], beam.p1[1], beam.p2[0], beam.p2[1], walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
          if (!int || !int[4]) {
            int = lineIntersection(beam.p1[0], beam.p1[1], beam.p1[0] + (beam.p1[0] - beam.vs[0]), beam.p1[1] + (beam.p1[1] - beam.vs[1]), walls[i].p1[0], walls[i].p1[1], walls[i].p2[0], walls[i].p2[1]);
          }
        } else if (!A && !B && C) {
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
  };
  function lineIntersection(x11, y11, x12, y12, x21, y21, x22, y22) {
    const denominator = (y22 - y21) * (x12 - x11) - (x22 - x21) * (y12 - y11);
    if (denominator === 0) {
      return null;
    }
    const a_temp = y11 - y21;
    const b_temp = x11 - x21;
    const numerator1 = (x22 - x21) * a_temp - (y22 - y21) * b_temp;
    const numerator2 = (x12 - x11) * a_temp - (y12 - y11) * b_temp;
    const a = numerator1 / denominator;
    const b = numerator2 / denominator;
    const x = x11 + a * (x12 - x11);
    const y = y11 + a * (y12 - y11);
    const onRay1 = a > 0;
    const onLine1 = a > 0 && a < 1;
    const onRay2 = b > 0;
    const onLine2 = b > 0 && b < 1;
    return [x, y, onLine1, onLine2, onRay1, onRay2];
  }
  function inFrontOf(p0, p1, p2) {
    const n1 = [-(p2[1] - p1[1]), p2[0] - p1[0]];
    return n1[0] * (p0[0] - p1[0]) + n1[1] * (p0[1] - p1[1]) > 0;
  }
  function pointMirror(p0, p1, p2) {
    let n1 = [-(p2[1] - p1[1]), p2[0] - p1[0]];
    const n1_len = Math.sqrt(n1[0] * n1[0] + n1[1] * n1[1]);
    if (n1_len === 0) {
      return p0;
    }
    n1 = [n1[0] / n1_len, n1[1] / n1_len];
    const dist = 2 * (n1[0] * (p0[0] - p1[0]) + n1[1] * (p0[1] - p1[1]));
    return [p0[0] - n1[0] * dist, p0[1] - n1[1] * dist];
  }
  var Solver = class {
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
        throw new Error("BeamTrace2D: at least one wall is required");
      }
      if (!source) {
        throw new Error("BeamTrace2D: source is required");
      }
      this.maxOrder = reflectionOrder !== void 0 ? reflectionOrder - 1 : 4;
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
      let int = this.rayTrace(p0, node.vs, this.bsp.mainNode, ignoreId, node.id, 0);
      if (!int || node.id !== -1 && int[6] !== node.id || !int[2] || !int[3]) {
        int = null;
      }
      if (node.id === -1) {
        if (!int) {
          pTree.push([node.vs[0], node.vs[1], null]);
          return pTree;
        } else {
          return null;
        }
      } else {
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
      } else if (lineInt) {
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
  };

  // dist/main.js
  document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("beamCanvas");
    if (!canvas) {
      console.log("Error: canvas element not found");
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.log("Error: canvas not supported");
      return;
    }
    const walls = [
      new Wall([100, 130], [120, 220]),
      // Wall id 0
      new Wall([50, 55], [220, 60]),
      // Wall id 1
      new Wall([220, 60], [250, 220]),
      // Wall id 2...
      new Wall([50, 220], [200, 220]),
      // etc
      new Wall([50, 220], [50, 55]),
      new Wall([200, 220], [40, 230]),
      new Wall([40, 230], [30, 290]),
      new Wall([30, 290], [60, 270]),
      new Wall([60, 270], [290, 270]),
      new Wall([290, 270], [250, 220])
    ];
    const listener = new Listener([80, 100]);
    const source = new Source([200, 80]);
    const reflectionOrder = 4;
    let solver = new Solver(walls, source, reflectionOrder);
    let pathArray = solver.getPaths(listener);
    function redraw() {
      ctx.clearRect(0, 0, 300, 300);
      ctx.lineWidth = 2;
      walls.forEach((wall) => {
        wall.draw(ctx);
      });
      ctx.lineWidth = 1;
      listener.draw(ctx);
      source.draw(ctx);
      if (pathArray) {
        for (let i = 0; i < pathArray.length; i++) {
          let first = true;
          ctx.strokeStyle = "rgba(0,0,255,0.2)";
          ctx.beginPath();
          ctx.lineWidth = 2;
          pathArray[i].forEach((p) => {
            if (first) {
              ctx.moveTo(p[0], p[1]);
              first = false;
            } else {
              ctx.lineTo(p[0], p[1]);
            }
          });
          ctx.stroke();
          ctx.strokeStyle = "black";
          ctx.lineWidth = 1;
        }
      }
    }
    function getMousePos(e) {
      const rect = canvas.getBoundingClientRect();
      return [e.clientX - rect.left, e.clientY - rect.top];
    }
    canvas.addEventListener("click", (e) => {
      source.p0 = getMousePos(e);
      solver = new Solver(walls, source, reflectionOrder);
      pathArray = solver.getPaths(listener);
      redraw();
    });
    canvas.addEventListener("mousemove", (e) => {
      listener.p0 = getMousePos(e);
      pathArray = solver.getPaths(listener);
      redraw();
    });
    redraw();
  });
})();
//# sourceMappingURL=main.bundle.js.map
