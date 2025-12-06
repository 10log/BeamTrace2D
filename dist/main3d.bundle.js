// dist/main3d.js
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// dist/core/vector3.js
var Vector3 = {
  /**
   * Create a new Vector3
   */
  create(x, y, z) {
    return [x, y, z];
  },
  /**
   * Create a zero vector
   */
  zero() {
    return [0, 0, 0];
  },
  /**
   * Clone a vector
   */
  clone(v) {
    return [v[0], v[1], v[2]];
  },
  /**
   * Add two vectors
   */
  add(a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  },
  /**
   * Subtract vector b from vector a
   */
  subtract(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  },
  /**
   * Scale a vector by a scalar
   */
  scale(v, s) {
    return [v[0] * s, v[1] * s, v[2] * s];
  },
  /**
   * Negate a vector
   */
  negate(v) {
    return [-v[0], -v[1], -v[2]];
  },
  /**
   * Dot product of two vectors
   */
  dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  },
  /**
   * Cross product of two vectors (a × b)
   */
  cross(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
  },
  /**
   * Squared length of a vector
   */
  lengthSquared(v) {
    return v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
  },
  /**
   * Length (magnitude) of a vector
   */
  length(v) {
    return Math.sqrt(Vector3.lengthSquared(v));
  },
  /**
   * Normalize a vector to unit length
   * Returns zero vector if input has zero length
   */
  normalize(v) {
    const len = Vector3.length(v);
    if (len < 1e-10)
      return [0, 0, 0];
    return [v[0] / len, v[1] / len, v[2] / len];
  },
  /**
   * Linear interpolation between two vectors
   */
  lerp(a, b, t) {
    return [
      a[0] + t * (b[0] - a[0]),
      a[1] + t * (b[1] - a[1]),
      a[2] + t * (b[2] - a[2])
    ];
  },
  /**
   * Distance between two points
   */
  distance(a, b) {
    return Vector3.length(Vector3.subtract(a, b));
  },
  /**
   * Squared distance between two points (faster than distance)
   */
  distanceSquared(a, b) {
    return Vector3.lengthSquared(Vector3.subtract(a, b));
  },
  /**
   * Check if two vectors are approximately equal
   */
  equals(a, b, epsilon = 1e-10) {
    return Math.abs(a[0] - b[0]) < epsilon && Math.abs(a[1] - b[1]) < epsilon && Math.abs(a[2] - b[2]) < epsilon;
  },
  /**
   * Component-wise minimum
   */
  min(a, b) {
    return [
      Math.min(a[0], b[0]),
      Math.min(a[1], b[1]),
      Math.min(a[2], b[2])
    ];
  },
  /**
   * Component-wise maximum
   */
  max(a, b) {
    return [
      Math.max(a[0], b[0]),
      Math.max(a[1], b[1]),
      Math.max(a[2], b[2])
    ];
  },
  /**
   * Reflect vector v across a plane with given normal
   * v' = v - 2(v·n)n
   */
  reflect(v, normal) {
    const d = 2 * Vector3.dot(v, normal);
    return Vector3.subtract(v, Vector3.scale(normal, d));
  },
  /**
   * Project vector a onto vector b
   */
  project(a, b) {
    const bLenSq = Vector3.lengthSquared(b);
    if (bLenSq < 1e-10)
      return [0, 0, 0];
    const scale = Vector3.dot(a, b) / bLenSq;
    return Vector3.scale(b, scale);
  },
  /**
   * Get the component of a perpendicular to b
   */
  reject(a, b) {
    return Vector3.subtract(a, Vector3.project(a, b));
  },
  /**
   * Convert to string for debugging
   */
  toString(v, precision = 4) {
    return `[${v[0].toFixed(precision)}, ${v[1].toFixed(precision)}, ${v[2].toFixed(precision)}]`;
  }
};

// dist/core/plane3d.js
var Plane3D = {
  /**
   * Create a plane from a normal vector and a point on the plane
   */
  fromNormalAndPoint(normal, point) {
    const n = Vector3.normalize(normal);
    const d = -Vector3.dot(n, point);
    return { a: n[0], b: n[1], c: n[2], d };
  },
  /**
   * Create a plane from three non-collinear points
   * Uses counter-clockwise winding order: normal points toward viewer when
   * p1 → p2 → p3 appears counter-clockwise
   */
  fromPoints(p1, p2, p3) {
    const v1 = Vector3.subtract(p2, p1);
    const v2 = Vector3.subtract(p3, p1);
    const normal = Vector3.normalize(Vector3.cross(v1, v2));
    return Plane3D.fromNormalAndPoint(normal, p1);
  },
  /**
   * Create a plane directly from coefficients
   */
  create(a, b, c, d) {
    return { a, b, c, d };
  },
  /**
   * Get the normal vector of the plane
   */
  normal(plane) {
    return [plane.a, plane.b, plane.c];
  },
  /**
   * Signed distance from a point to the plane
   * Positive = point is in front (on normal side)
   * Negative = point is behind
   * Zero = point is on the plane
   */
  signedDistance(point, plane) {
    return plane.a * point[0] + plane.b * point[1] + plane.c * point[2] + plane.d;
  },
  /**
   * Absolute distance from a point to the plane
   */
  distance(point, plane) {
    return Math.abs(Plane3D.signedDistance(point, plane));
  },
  /**
   * Classify a point relative to the plane
   */
  classifyPoint(point, plane, epsilon = 1e-6) {
    const dist = Plane3D.signedDistance(point, plane);
    if (dist > epsilon)
      return "front";
    if (dist < -epsilon)
      return "back";
    return "on";
  },
  /**
   * Check if a point is in front of the plane
   */
  isPointInFront(point, plane, epsilon = 1e-6) {
    return Plane3D.signedDistance(point, plane) > epsilon;
  },
  /**
   * Check if a point is behind the plane
   */
  isPointBehind(point, plane, epsilon = 1e-6) {
    return Plane3D.signedDistance(point, plane) < -epsilon;
  },
  /**
   * Check if a point is on the plane
   */
  isPointOn(point, plane, epsilon = 1e-6) {
    return Math.abs(Plane3D.signedDistance(point, plane)) <= epsilon;
  },
  /**
   * Mirror a point across the plane
   * p' = p - 2 * signedDistance(p) * normal
   */
  mirrorPoint(point, plane) {
    const dist = Plane3D.signedDistance(point, plane);
    const normal = Plane3D.normal(plane);
    return Vector3.subtract(point, Vector3.scale(normal, 2 * dist));
  },
  /**
   * Mirror a plane across another plane (for fail plane propagation)
   * This mirrors two points on the source plane and reconstructs.
   */
  mirrorPlane(planeToMirror, mirrorPlane) {
    const n = Plane3D.normal(planeToMirror);
    let p1;
    if (Math.abs(n[2]) > 0.5) {
      p1 = [0, 0, -planeToMirror.d / planeToMirror.c];
    } else if (Math.abs(n[1]) > 0.5) {
      p1 = [0, -planeToMirror.d / planeToMirror.b, 0];
    } else {
      p1 = [-planeToMirror.d / planeToMirror.a, 0, 0];
    }
    const offset = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const tangent = Vector3.normalize(Vector3.cross(n, offset));
    const p2 = Vector3.add(p1, tangent);
    const bitangent = Vector3.cross(n, tangent);
    const p3 = Vector3.add(p1, bitangent);
    const p1m = Plane3D.mirrorPoint(p1, mirrorPlane);
    const p2m = Plane3D.mirrorPoint(p2, mirrorPlane);
    const p3m = Plane3D.mirrorPoint(p3, mirrorPlane);
    return Plane3D.fromPoints(p1m, p2m, p3m);
  },
  /**
   * Flip the plane orientation (negate normal and d)
   */
  flip(plane) {
    return { a: -plane.a, b: -plane.b, c: -plane.c, d: -plane.d };
  },
  /**
   * Ray-plane intersection
   *
   * Returns the t parameter along the ray where intersection occurs,
   * or null if the ray is parallel to the plane.
   *
   * Point of intersection = rayOrigin + t * rayDirection
   *
   * @param rayOrigin - Starting point of the ray
   * @param rayDirection - Direction of the ray (should be normalized for t to represent distance)
   * @param plane - The plane to intersect with
   */
  rayIntersection(rayOrigin, rayDirection, plane) {
    const normal = Plane3D.normal(plane);
    const denom = Vector3.dot(normal, rayDirection);
    if (Math.abs(denom) < 1e-10) {
      return null;
    }
    const t = -(Vector3.dot(normal, rayOrigin) + plane.d) / denom;
    return t;
  },
  /**
   * Get the point of intersection between a ray and plane
   */
  rayIntersectionPoint(rayOrigin, rayDirection, plane) {
    const t = Plane3D.rayIntersection(rayOrigin, rayDirection, plane);
    if (t === null)
      return null;
    return Vector3.add(rayOrigin, Vector3.scale(rayDirection, t));
  },
  /**
   * Project a point onto the plane
   */
  projectPoint(point, plane) {
    const dist = Plane3D.signedDistance(point, plane);
    const normal = Plane3D.normal(plane);
    return Vector3.subtract(point, Vector3.scale(normal, dist));
  },
  /**
   * Check if two planes are approximately equal
   */
  equals(a, b, epsilon = 1e-6) {
    const dotNormals = a.a * b.a + a.b * b.b + a.c * b.c;
    if (Math.abs(dotNormals - 1) < epsilon) {
      return Math.abs(a.d - b.d) < epsilon;
    }
    if (Math.abs(dotNormals + 1) < epsilon) {
      return Math.abs(a.d + b.d) < epsilon;
    }
    return false;
  },
  /**
   * Convert to string for debugging
   */
  toString(plane, precision = 4) {
    return `Plane3D(${plane.a.toFixed(precision)}x + ${plane.b.toFixed(precision)}y + ${plane.c.toFixed(precision)}z + ${plane.d.toFixed(precision)} = 0)`;
  }
};

// dist/geometry/polygon3d.js
var Polygon3D = {
  /**
   * Create a polygon from vertices (computes plane automatically)
   * Vertices must be in counter-clockwise order when viewed from front
   */
  create(vertices, materialId) {
    if (vertices.length < 3) {
      throw new Error("Polygon requires at least 3 vertices");
    }
    const verts = vertices.map((v) => Vector3.clone(v));
    const plane = Plane3D.fromPoints(verts[0], verts[1], verts[2]);
    return { vertices: verts, plane, materialId };
  },
  /**
   * Create a polygon with an explicit plane (for split polygons that may be degenerate)
   */
  createWithPlane(vertices, plane, materialId) {
    if (vertices.length < 3) {
      throw new Error("Polygon requires at least 3 vertices");
    }
    const verts = vertices.map((v) => Vector3.clone(v));
    return { vertices: verts, plane, materialId };
  },
  /**
   * Get the number of vertices
   */
  vertexCount(poly) {
    return poly.vertices.length;
  },
  /**
   * Compute the centroid (geometric center) of the polygon
   */
  centroid(poly) {
    const sum = [0, 0, 0];
    for (const v of poly.vertices) {
      sum[0] += v[0];
      sum[1] += v[1];
      sum[2] += v[2];
    }
    const n = poly.vertices.length;
    return [sum[0] / n, sum[1] / n, sum[2] / n];
  },
  /**
   * Compute the area of the polygon using cross product method
   */
  area(poly) {
    if (poly.vertices.length < 3)
      return 0;
    let total = [0, 0, 0];
    const v0 = poly.vertices[0];
    for (let i = 1; i < poly.vertices.length - 1; i++) {
      const v1 = poly.vertices[i];
      const v2 = poly.vertices[i + 1];
      const cross = Vector3.cross(Vector3.subtract(v1, v0), Vector3.subtract(v2, v0));
      total = Vector3.add(total, cross);
    }
    return 0.5 * Vector3.length(total);
  },
  /**
   * Get the normal vector of the polygon (from the plane)
   */
  normal(poly) {
    return Plane3D.normal(poly.plane);
  },
  /**
   * Get edges as pairs of vertices [start, end]
   */
  edges(poly) {
    const result = [];
    for (let i = 0; i < poly.vertices.length; i++) {
      const next = (i + 1) % poly.vertices.length;
      result.push([poly.vertices[i], poly.vertices[next]]);
    }
    return result;
  },
  /**
   * Classify the polygon relative to a plane
   */
  classify(poly, plane, epsilon = 1e-6) {
    let front = 0;
    let back = 0;
    for (const v of poly.vertices) {
      const classification = Plane3D.classifyPoint(v, plane, epsilon);
      if (classification === "front")
        front++;
      else if (classification === "back")
        back++;
    }
    if (front > 0 && back > 0)
      return "spanning";
    if (front > 0)
      return "front";
    if (back > 0)
      return "back";
    return "coplanar";
  },
  /**
   * Check if a point is inside the polygon
   * Assumes the point is on (or very close to) the polygon's plane
   */
  containsPoint(poly, point, epsilon = 1e-6) {
    const normal = Plane3D.normal(poly.plane);
    const n = poly.vertices.length;
    for (let i = 0; i < n; i++) {
      const v1 = poly.vertices[i];
      const v2 = poly.vertices[(i + 1) % n];
      const edge = Vector3.subtract(v2, v1);
      const toPoint = Vector3.subtract(point, v1);
      const cross = Vector3.cross(edge, toPoint);
      if (Vector3.dot(cross, normal) < -epsilon) {
        return false;
      }
    }
    return true;
  },
  /**
   * Ray-polygon intersection
   * Returns t parameter and intersection point, or null if no hit
   */
  rayIntersection(rayOrigin, rayDirection, poly) {
    const t = Plane3D.rayIntersection(rayOrigin, rayDirection, poly.plane);
    if (t === null || t < 0) {
      return null;
    }
    const point = Vector3.add(rayOrigin, Vector3.scale(rayDirection, t));
    if (!Polygon3D.containsPoint(poly, point)) {
      return null;
    }
    return { t, point };
  },
  /**
   * Create a bounding box for the polygon
   */
  boundingBox(poly) {
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (const v of poly.vertices) {
      min[0] = Math.min(min[0], v[0]);
      min[1] = Math.min(min[1], v[1]);
      min[2] = Math.min(min[2], v[2]);
      max[0] = Math.max(max[0], v[0]);
      max[1] = Math.max(max[1], v[1]);
      max[2] = Math.max(max[2], v[2]);
    }
    return { min, max };
  },
  /**
   * Check if polygon is degenerate (zero or near-zero area)
   */
  isDegenerate(poly, areaThreshold = 1e-10) {
    return poly.vertices.length < 3 || Polygon3D.area(poly) < areaThreshold;
  },
  /**
   * Flip the polygon winding (reverse vertex order and flip plane)
   */
  flip(poly) {
    const reversedVerts = [...poly.vertices].reverse();
    const flippedPlane = Plane3D.flip(poly.plane);
    return {
      vertices: reversedVerts,
      plane: flippedPlane,
      materialId: poly.materialId
    };
  },
  /**
   * Clone a polygon
   */
  clone(poly) {
    return {
      vertices: poly.vertices.map((v) => Vector3.clone(v)),
      plane: { ...poly.plane },
      materialId: poly.materialId
    };
  },
  /**
   * Convert to string for debugging
   */
  toString(poly) {
    const verts = poly.vertices.map((v) => Vector3.toString(v, 2)).join(", ");
    return `Polygon3D(${poly.vertices.length} vertices: [${verts}])`;
  }
};
function createShoeboxRoom(width, depth, height, floorMaterial2, ceilingMaterial, wallMaterial) {
  const v000 = [0, 0, 0];
  const v100 = [width, 0, 0];
  const v010 = [0, depth, 0];
  const v110 = [width, depth, 0];
  const v001 = [0, 0, height];
  const v101 = [width, 0, height];
  const v011 = [0, depth, height];
  const v111 = [width, depth, height];
  return [
    // Floor (normal pointing up, CCW when viewed from above)
    Polygon3D.create([v000, v100, v110, v010], floorMaterial2),
    // Ceiling (normal pointing down, CCW when viewed from below)
    Polygon3D.create([v001, v011, v111, v101], ceilingMaterial),
    // Front wall (y = 0, normal pointing +y)
    Polygon3D.create([v000, v001, v101, v100], wallMaterial),
    // Back wall (y = depth, normal pointing -y)
    Polygon3D.create([v010, v110, v111, v011], wallMaterial),
    // Left wall (x = 0, normal pointing +x)
    Polygon3D.create([v000, v010, v011, v001], wallMaterial),
    // Right wall (x = width, normal pointing -x)
    Polygon3D.create([v100, v101, v111, v110], wallMaterial)
  ];
}

// dist/geometry/polygon-split.js
function splitPolygon(poly, plane, epsilon = 1e-6) {
  const classification = Polygon3D.classify(poly, plane, epsilon);
  if (classification === "front" || classification === "coplanar") {
    return { front: poly, back: null };
  }
  if (classification === "back") {
    return { front: null, back: poly };
  }
  const frontVerts = [];
  const backVerts = [];
  const n = poly.vertices.length;
  for (let i = 0; i < n; i++) {
    const v1 = poly.vertices[i];
    const v2 = poly.vertices[(i + 1) % n];
    const d1 = Plane3D.signedDistance(v1, plane);
    const d2 = Plane3D.signedDistance(v2, plane);
    const c1 = d1 > epsilon ? "front" : d1 < -epsilon ? "back" : "on";
    const c2 = d2 > epsilon ? "front" : d2 < -epsilon ? "back" : "on";
    if (c1 === "front") {
      frontVerts.push(v1);
    } else if (c1 === "back") {
      backVerts.push(v1);
    } else {
      frontVerts.push(v1);
      backVerts.push(v1);
    }
    if (c1 === "front" && c2 === "back" || c1 === "back" && c2 === "front") {
      const t = d1 / (d1 - d2);
      const intersection = Vector3.lerp(v1, v2, t);
      frontVerts.push(intersection);
      backVerts.push(intersection);
    }
  }
  const front = frontVerts.length >= 3 ? Polygon3D.createWithPlane(frontVerts, poly.plane, poly.materialId) : null;
  const back = backVerts.length >= 3 ? Polygon3D.createWithPlane(backVerts, poly.plane, poly.materialId) : null;
  return { front, back };
}

// dist/geometry/clipping3d.js
function clipPolygonByPlane(poly, plane, epsilon = 1e-6) {
  const input = poly.vertices;
  const output = [];
  if (input.length < 3)
    return null;
  for (let i = 0; i < input.length; i++) {
    const current = input[i];
    const next = input[(i + 1) % input.length];
    const dCurrent = Plane3D.signedDistance(current, plane);
    const dNext = Plane3D.signedDistance(next, plane);
    const currentInside = dCurrent >= -epsilon;
    const nextInside = dNext >= -epsilon;
    if (currentInside) {
      output.push(current);
    }
    if (currentInside && !nextInside || !currentInside && nextInside) {
      const t = dCurrent / (dCurrent - dNext);
      const intersection = Vector3.lerp(current, next, Math.max(0, Math.min(1, t)));
      output.push(intersection);
    }
  }
  if (output.length < 3)
    return null;
  return Polygon3D.createWithPlane(output, poly.plane, poly.materialId);
}
function clipPolygonByPlanes(poly, planes, epsilon = 1e-6) {
  let current = poly;
  for (const plane of planes) {
    if (!current)
      return null;
    current = clipPolygonByPlane(current, plane, epsilon);
  }
  return current;
}
function quickRejectPolygon(poly, planes, epsilon = 1e-6) {
  for (const plane of planes) {
    let allBehind = true;
    for (const v of poly.vertices) {
      if (Plane3D.signedDistance(v, plane) >= -epsilon) {
        allBehind = false;
        break;
      }
    }
    if (allBehind) {
      return true;
    }
  }
  return false;
}

// dist/structures/bsp3d.js
function buildBSP(polygons) {
  if (polygons.length === 0)
    return null;
  const indexed = polygons.map((polygon, i) => ({
    polygon,
    originalId: i
  }));
  return buildBSPRecursive(indexed);
}
function buildBSPRecursive(polygons) {
  if (polygons.length === 0)
    return null;
  const splitterIndex = chooseSplitter(polygons);
  const splitter = polygons[splitterIndex];
  const plane = splitter.polygon.plane;
  const frontPolys = [];
  const backPolys = [];
  for (let i = 0; i < polygons.length; i++) {
    if (i === splitterIndex)
      continue;
    const indexed = polygons[i];
    const { front, back } = splitPolygon(indexed.polygon, plane);
    if (front) {
      frontPolys.push({ polygon: front, originalId: indexed.originalId });
    }
    if (back) {
      backPolys.push({ polygon: back, originalId: indexed.originalId });
    }
  }
  return {
    plane,
    polygon: splitter.polygon,
    polygonId: splitter.originalId,
    front: buildBSPRecursive(frontPolys),
    back: buildBSPRecursive(backPolys)
  };
}
function chooseSplitter(polygons) {
  if (polygons.length <= 3)
    return 0;
  let bestIndex = 0;
  let bestScore = Infinity;
  const sampleSize = Math.min(polygons.length, 10);
  const step = Math.max(1, Math.floor(polygons.length / sampleSize));
  for (let i = 0; i < polygons.length; i += step) {
    const plane = polygons[i].polygon.plane;
    let front = 0;
    let back = 0;
    let splits = 0;
    for (let j = 0; j < polygons.length; j++) {
      if (i === j)
        continue;
      const classification = Polygon3D.classify(polygons[j].polygon, plane);
      if (classification === "front") {
        front++;
      } else if (classification === "back") {
        back++;
      } else if (classification === "spanning") {
        front++;
        back++;
        splits++;
      }
    }
    const score = splits * 8 + Math.abs(front - back);
    if (score < bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  return bestIndex;
}
function rayTraceBSP(origin, direction, node, tMin = 0, tMax = Infinity, ignoreId = -1) {
  if (!node)
    return null;
  const dOrigin = Plane3D.signedDistance(origin, node.plane);
  const normal = Plane3D.normal(node.plane);
  const dDir = Vector3.dot(normal, direction);
  let near;
  let far;
  if (dOrigin >= 0) {
    near = node.front;
    far = node.back;
  } else {
    near = node.back;
    far = node.front;
  }
  let tSplit = null;
  if (Math.abs(dDir) > 1e-10) {
    tSplit = -dOrigin / dDir;
  }
  let hit = null;
  if (tSplit === null || tSplit < tMin) {
    hit = rayTraceBSP(origin, direction, near, tMin, tMax, ignoreId);
  } else if (tSplit > tMax) {
    hit = rayTraceBSP(origin, direction, near, tMin, tMax, ignoreId);
  } else {
    hit = rayTraceBSP(origin, direction, near, tMin, tSplit, ignoreId);
    if (!hit && node.polygonId !== ignoreId) {
      const polyHit = Polygon3D.rayIntersection(origin, direction, node.polygon);
      if (polyHit && polyHit.t >= tMin && polyHit.t <= tMax) {
        hit = {
          t: polyHit.t,
          point: polyHit.point,
          polygonId: node.polygonId,
          polygon: node.polygon
        };
      }
    }
    if (!hit) {
      hit = rayTraceBSP(origin, direction, far, tSplit, tMax, ignoreId);
    }
  }
  return hit;
}

// dist/structures/beam3d.js
function constructBeamBoundaryPlanes(virtualSource, aperture) {
  const planes = [];
  const edges = Polygon3D.edges(aperture);
  const apertureCentroid = Polygon3D.centroid(aperture);
  for (const [v1, v2] of edges) {
    let edgePlane = Plane3D.fromPoints(virtualSource, v1, v2);
    if (Plane3D.signedDistance(apertureCentroid, edgePlane) < 0) {
      edgePlane = Plane3D.flip(edgePlane);
    }
    planes.push(edgePlane);
  }
  let aperturePlane = aperture.plane;
  if (Plane3D.signedDistance(virtualSource, aperturePlane) > 0) {
    aperturePlane = Plane3D.flip(aperturePlane);
  }
  planes.push(aperturePlane);
  return planes;
}
function mirrorPointAcrossPolygon(point, polygon) {
  return Plane3D.mirrorPoint(point, polygon.plane);
}
function isPolygonFacingSource(polygon, virtualSource) {
  const centroid = Polygon3D.centroid(polygon);
  const toSource = Vector3.subtract(virtualSource, centroid);
  const normal = Plane3D.normal(polygon.plane);
  return Vector3.dot(normal, toSource) > 0;
}

// dist/structures/beamtree3d.js
var MIN_APERTURE_AREA = 1e-6;
function buildBeamTree3D(sourcePosition, polygons, maxReflectionOrder) {
  const root = {
    id: -1,
    parent: null,
    virtualSource: Vector3.clone(sourcePosition),
    children: []
  };
  if (maxReflectionOrder >= 1) {
    for (let i = 0; i < polygons.length; i++) {
      const poly = polygons[i];
      if (!isPolygonFacingSource(poly, sourcePosition)) {
        continue;
      }
      const childVS = mirrorPointAcrossPolygon(sourcePosition, poly);
      const childBoundaries = constructBeamBoundaryPlanes(childVS, poly);
      const childNode = {
        id: i,
        parent: root,
        virtualSource: childVS,
        aperture: Polygon3D.clone(poly),
        boundaryPlanes: childBoundaries,
        children: []
      };
      root.children.push(childNode);
      if (maxReflectionOrder > 1) {
        buildBeamChildren(childNode, polygons, 2, maxReflectionOrder);
      }
    }
  }
  const leafNodes = [];
  collectLeafNodes(root, leafNodes);
  return {
    root,
    leafNodes,
    polygons,
    maxReflectionOrder
  };
}
function buildBeamChildren(node, polygons, currentOrder, maxOrder) {
  if (currentOrder > maxOrder)
    return;
  if (!node.boundaryPlanes || !node.aperture)
    return;
  for (let i = 0; i < polygons.length; i++) {
    if (i === node.id)
      continue;
    const poly = polygons[i];
    if (quickRejectPolygon(poly, node.boundaryPlanes)) {
      continue;
    }
    if (!isPolygonFacingSource(poly, node.virtualSource)) {
      continue;
    }
    const clipped = clipPolygonByPlanes(poly, node.boundaryPlanes);
    if (!clipped)
      continue;
    const area = Polygon3D.area(clipped);
    if (area < MIN_APERTURE_AREA)
      continue;
    const childVS = mirrorPointAcrossPolygon(node.virtualSource, poly);
    const childBoundaries = constructBeamBoundaryPlanes(childVS, clipped);
    const childNode = {
      id: i,
      parent: node,
      virtualSource: childVS,
      aperture: clipped,
      boundaryPlanes: childBoundaries,
      children: []
    };
    node.children.push(childNode);
    if (currentOrder < maxOrder) {
      buildBeamChildren(childNode, polygons, currentOrder + 1, maxOrder);
    }
  }
}
function collectLeafNodes(node, result) {
  if (node.children.length === 0 && node.id !== -1) {
    result.push(node);
  }
  for (const child of node.children) {
    collectLeafNodes(child, result);
  }
}
function clearFailPlanes(tree) {
  clearFailPlanesRecursive(tree.root);
}
function clearFailPlanesRecursive(node) {
  node.failPlane = void 0;
  node.failPlaneType = void 0;
  for (const child of node.children) {
    clearFailPlanesRecursive(child);
  }
}

// dist/optimization/failplane3d.js
function detectFailPlane(listenerPos2, node, polygons) {
  if (!node.aperture || !node.boundaryPlanes) {
    return null;
  }
  const reflectingPoly = polygons[node.id];
  let polyPlane = reflectingPoly.plane;
  if (Plane3D.signedDistance(node.virtualSource, polyPlane) < 0) {
    polyPlane = Plane3D.flip(polyPlane);
  }
  if (Plane3D.signedDistance(listenerPos2, polyPlane) < 0) {
    return {
      plane: polyPlane,
      type: "polygon",
      nodeDepth: getNodeDepth(node)
    };
  }
  const edgeCount = node.boundaryPlanes.length - 1;
  for (let i = 0; i < node.boundaryPlanes.length; i++) {
    const plane = node.boundaryPlanes[i];
    if (Plane3D.signedDistance(listenerPos2, plane) < 0) {
      const type = i < edgeCount ? "edge" : "aperture";
      return {
        plane,
        type,
        nodeDepth: getNodeDepth(node)
      };
    }
  }
  return null;
}
function getNodeDepth(node) {
  let depth = 0;
  let current = node;
  while (current && current.id !== -1) {
    depth++;
    current = current.parent;
  }
  return depth;
}
function isListenerBehindFailPlane(listenerPos2, failPlane) {
  return Plane3D.signedDistance(listenerPos2, failPlane) < 0;
}

// dist/optimization/skipsphere3d.js
var DEFAULT_BUCKET_SIZE_3D = 16;
function createBuckets3D(leafNodes, bucketSize = DEFAULT_BUCKET_SIZE_3D) {
  const buckets = [];
  for (let i = 0; i < leafNodes.length; i += bucketSize) {
    buckets.push({
      id: buckets.length,
      nodes: leafNodes.slice(i, Math.min(i + bucketSize, leafNodes.length)),
      skipSphere: null
    });
  }
  return buckets;
}
function isInsideSkipSphere(point, skipSphere) {
  const dist = Vector3.distance(point, skipSphere.center);
  return dist < skipSphere.radius;
}
function checkSkipSphere(listenerPos2, bucket) {
  if (!bucket.skipSphere) {
    return "none";
  }
  return isInsideSkipSphere(listenerPos2, bucket.skipSphere) ? "inside" : "outside";
}
function createSkipSphere(listenerPos2, nodes) {
  let minDist = Infinity;
  for (const node of nodes) {
    if (!node.failPlane) {
      return null;
    }
    const dist = Math.abs(Plane3D.signedDistance(listenerPos2, node.failPlane));
    minDist = Math.min(minDist, dist);
  }
  if (minDist === Infinity || minDist <= 1e-10) {
    return null;
  }
  return {
    center: Vector3.clone(listenerPos2),
    radius: minDist
  };
}
function invalidateSkipSphere(bucket) {
  bucket.skipSphere = null;
}
function clearBucketFailPlanes(bucket) {
  for (const node of bucket.nodes) {
    node.failPlane = void 0;
    node.failPlaneType = void 0;
  }
}

// dist/solver/solver3d.js
var OptimizedSolver3D = class {
  /**
   * Create a new 3D beam tracing solver
   *
   * @param polygons - Room geometry as an array of polygons
   * @param sourcePosition - Position of the sound source
   * @param config - Optional configuration
   */
  constructor(polygons, sourcePosition, config = {}) {
    const maxOrder = config.maxReflectionOrder ?? 5;
    const bucketSize = config.bucketSize ?? DEFAULT_BUCKET_SIZE_3D;
    this.polygons = polygons;
    this.sourcePosition = Vector3.clone(sourcePosition);
    this.bspRoot = buildBSP(polygons);
    this.beamTree = buildBeamTree3D(sourcePosition, polygons, maxOrder);
    this.buckets = createBuckets3D(this.beamTree.leafNodes, bucketSize);
    this.metrics = this.createEmptyMetrics();
    this.metrics.totalLeafNodes = this.beamTree.leafNodes.length;
    this.metrics.bucketsTotal = this.buckets.length;
  }
  /**
   * Get all valid reflection paths from source to listener
   *
   * @param listenerPos - Position of the listener
   * @returns Array of valid reflection paths
   */
  getPaths(listenerPos2) {
    this.resetMetrics();
    const validPaths = [];
    const directPath = this.validateDirectPath(listenerPos2);
    if (directPath) {
      validPaths.push(directPath);
    }
    const intermediatePaths = this.findIntermediatePaths(listenerPos2, this.beamTree.root);
    validPaths.push(...intermediatePaths);
    for (const bucket of this.buckets) {
      const skipStatus = checkSkipSphere(listenerPos2, bucket);
      if (skipStatus === "inside") {
        this.metrics.bucketsSkipped++;
        continue;
      }
      if (skipStatus === "outside") {
        invalidateSkipSphere(bucket);
        clearBucketFailPlanes(bucket);
      }
      this.metrics.bucketsChecked++;
      let allFailed = true;
      let allHaveFailPlanes = true;
      for (const node of bucket.nodes) {
        if (node.failPlane && isListenerBehindFailPlane(listenerPos2, node.failPlane)) {
          this.metrics.failPlaneCacheHits++;
          continue;
        }
        if (node.failPlane) {
          node.failPlane = void 0;
          node.failPlaneType = void 0;
          this.metrics.failPlaneCacheMisses++;
        }
        const result = this.validatePath(listenerPos2, node);
        if (result.valid && result.path) {
          validPaths.push(result.path);
          allFailed = false;
          allHaveFailPlanes = false;
        } else if (!node.failPlane) {
          allHaveFailPlanes = false;
        }
      }
      if (allFailed && allHaveFailPlanes && bucket.nodes.length > 0) {
        bucket.skipSphere = createSkipSphere(listenerPos2, bucket.nodes);
        if (bucket.skipSphere) {
          this.metrics.skipSphereCount++;
        }
      }
    }
    this.metrics.validPathCount = validPaths.length;
    return validPaths;
  }
  /**
   * Validate the direct path from listener to source
   */
  validateDirectPath(listenerPos2) {
    const direction = Vector3.subtract(this.sourcePosition, listenerPos2);
    const dist = Vector3.length(direction);
    const dir = Vector3.normalize(direction);
    this.metrics.raycastCount++;
    const hit = rayTraceBSP(listenerPos2, dir, this.bspRoot, 0, dist, -1);
    if (hit && hit.t < dist - 1e-6) {
      return null;
    }
    return [
      { position: Vector3.clone(listenerPos2), polygonId: null },
      { position: Vector3.clone(this.sourcePosition), polygonId: null }
    ];
  }
  /**
   * Find paths through intermediate (non-leaf) nodes
   *
   * These are lower-order reflections that didn't spawn further children.
   */
  findIntermediatePaths(listenerPos2, node) {
    const paths = [];
    for (const child of node.children) {
      if (child.children.length > 0) {
        paths.push(...this.findIntermediatePaths(listenerPos2, child));
      }
    }
    if (node.id !== -1 && node.aperture) {
      const path = this.traverseBeam(listenerPos2, node);
      if (path) {
        paths.push(path);
      }
    }
    return paths;
  }
  /**
   * Traverse a beam from listener to source, building the reflection path
   */
  traverseBeam(listenerPos2, node) {
    const pathPoints = [
      { position: Vector3.clone(listenerPos2), polygonId: null }
    ];
    let currentPoint = listenerPos2;
    let currentNode = node;
    let prevPolyId = -1;
    while (currentNode && currentNode.id !== -1) {
      const poly = this.polygons[currentNode.id];
      const imageSource = currentNode.virtualSource;
      const dir = Vector3.normalize(Vector3.subtract(imageSource, currentPoint));
      const hit = Polygon3D.rayIntersection(currentPoint, dir, poly);
      if (!hit) {
        return null;
      }
      this.metrics.raycastCount++;
      const occluder = rayTraceBSP(currentPoint, dir, this.bspRoot, 1e-6, hit.t - 1e-6, prevPolyId);
      if (occluder) {
        return null;
      }
      pathPoints.push({
        position: Vector3.clone(hit.point),
        polygonId: currentNode.id
      });
      currentPoint = hit.point;
      prevPolyId = currentNode.id;
      currentNode = currentNode.parent;
    }
    if (currentNode) {
      const dir = Vector3.normalize(Vector3.subtract(currentNode.virtualSource, currentPoint));
      const dist = Vector3.distance(currentNode.virtualSource, currentPoint);
      this.metrics.raycastCount++;
      const finalHit = rayTraceBSP(currentPoint, dir, this.bspRoot, 1e-6, dist - 1e-6, prevPolyId);
      if (finalHit) {
        return null;
      }
      pathPoints.push({
        position: Vector3.clone(currentNode.virtualSource),
        polygonId: null
      });
    }
    return pathPoints;
  }
  /**
   * Validate a path through a beam node
   */
  validatePath(listenerPos2, leafNode) {
    const path = this.traverseBeam(listenerPos2, leafNode);
    if (path) {
      return { valid: true, path };
    }
    const failInfo = detectFailPlane(listenerPos2, leafNode, this.polygons);
    if (failInfo) {
      leafNode.failPlane = failInfo.plane;
      leafNode.failPlaneType = failInfo.type;
    }
    return { valid: false, path: null };
  }
  /**
   * Get performance metrics from the last getPaths() call
   */
  getMetrics() {
    return { ...this.metrics };
  }
  /**
   * Clear all cached fail planes and skip spheres
   *
   * Call this if the room geometry changes.
   */
  clearCache() {
    clearFailPlanes(this.beamTree);
    for (const bucket of this.buckets) {
      invalidateSkipSphere(bucket);
    }
  }
  /**
   * Get the number of leaf nodes in the beam tree
   */
  getLeafNodeCount() {
    return this.beamTree.leafNodes.length;
  }
  /**
   * Get the maximum reflection order
   */
  getMaxReflectionOrder() {
    return this.beamTree.maxReflectionOrder;
  }
  /**
   * Get the source position
   */
  getSourcePosition() {
    return Vector3.clone(this.sourcePosition);
  }
  /**
   * Get beam data for visualization
   * Returns beams organized by reflection order
   */
  getBeamsForVisualization(maxOrder) {
    const beams = [];
    const effectiveMaxOrder = maxOrder ?? this.beamTree.maxReflectionOrder;
    const traverse = (node, order) => {
      if (order > effectiveMaxOrder)
        return;
      if (node.id !== -1 && node.aperture) {
        beams.push({
          virtualSource: Vector3.clone(node.virtualSource),
          apertureVertices: node.aperture.vertices.map((v) => Vector3.clone(v)),
          reflectionOrder: order,
          polygonId: node.id
        });
      }
      for (const child of node.children) {
        traverse(child, order + 1);
      }
    };
    traverse(this.beamTree.root, 0);
    return beams;
  }
  /**
   * Create empty metrics object
   */
  createEmptyMetrics() {
    return {
      totalLeafNodes: 0,
      bucketsTotal: 0,
      bucketsSkipped: 0,
      bucketsChecked: 0,
      failPlaneCacheHits: 0,
      failPlaneCacheMisses: 0,
      raycastCount: 0,
      skipSphereCount: 0,
      validPathCount: 0
    };
  }
  /**
   * Reset metrics for a new getPaths() call
   */
  resetMetrics() {
    const total = this.metrics.totalLeafNodes;
    const buckets = this.metrics.bucketsTotal;
    this.metrics = this.createEmptyMetrics();
    this.metrics.totalLeafNodes = total;
    this.metrics.bucketsTotal = buckets;
  }
};
function getPathReflectionOrder(path) {
  return path.filter((p) => p.polygonId !== null).length;
}

// dist/beamtrace3d.js
var Source3D = class {
  constructor(position) {
    this.position = Vector3.clone(position);
  }
};
var Listener3D = class {
  constructor(position) {
    this.position = Vector3.clone(position);
  }
  /**
   * Update listener position
   */
  moveTo(position) {
    this.position = Vector3.clone(position);
  }
};
var Solver3D = class {
  constructor(polygons, source2, config) {
    this.source = source2;
    this.solver = new OptimizedSolver3D(polygons, source2.position, config);
  }
  /**
   * Get all valid reflection paths to a listener
   */
  getPaths(listener2) {
    const pos = Array.isArray(listener2) ? listener2 : listener2.position;
    return this.solver.getPaths(pos);
  }
  /**
   * Get performance metrics from last getPaths() call
   */
  getMetrics() {
    return this.solver.getMetrics();
  }
  /**
   * Clear optimization caches
   */
  clearCache() {
    this.solver.clearCache();
  }
  /**
   * Get number of leaf nodes in beam tree
   */
  getLeafNodeCount() {
    return this.solver.getLeafNodeCount();
  }
  /**
   * Get maximum reflection order
   */
  getMaxReflectionOrder() {
    return this.solver.getMaxReflectionOrder();
  }
  /**
   * Get beam data for visualization
   */
  getBeamsForVisualization(maxOrder) {
    return this.solver.getBeamsForVisualization(maxOrder);
  }
};

// dist/main3d.js
var ROOM_WIDTH = 10;
var ROOM_DEPTH = 8;
var ROOM_HEIGHT = 3;
var MIN_REFLECTION_ORDER = 0;
var MAX_REFLECTION_ORDER = 6;
var currentReflectionOrder = 3;
var visualizationMode = "paths";
var PATH_COLORS = [
  65280,
  // Direct (green)
  16776960,
  // 1st order (yellow)
  16746496,
  // 2nd order (orange)
  16711816,
  // 3rd order (pink)
  8913151
  // 4th+ order (purple)
];
var scene = new THREE.Scene();
scene.background = new THREE.Color(1710638);
var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1e3);
var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);
var controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 5;
controls.maxDistance = 50;
controls.maxPolarAngle = Math.PI / 2 - 0.1;
var ambientLight = new THREE.AmbientLight(16777215, 0.4);
scene.add(ambientLight);
var directionalLight = new THREE.DirectionalLight(16777215, 0.8);
directionalLight.position.set(10, 15, 10);
scene.add(directionalLight);
var roomPolygons = createShoeboxRoom(ROOM_WIDTH, ROOM_DEPTH, ROOM_HEIGHT);
var sourcePos = [ROOM_WIDTH * 0.7, ROOM_DEPTH * 0.6, 1.5];
var source = new Source3D(sourcePos);
var lastPrecomputeTime = 0;
var smoothedComputeTime = 0;
var smoothedRenderTime = 0;
var TIMING_SMOOTHING = 0.3;
function createSolver() {
  const start = performance.now();
  const newSolver = new Solver3D(roomPolygons, source, {
    maxReflectionOrder: currentReflectionOrder,
    bucketSize: 16
  });
  lastPrecomputeTime = performance.now() - start;
  return newSolver;
}
var solver = createSolver();
function recreateSolver() {
  solver = createSolver();
}
var listenerPos = [ROOM_WIDTH * 0.3, ROOM_DEPTH * 0.3, 1.2];
var listener = new Listener3D(listenerPos);
function btToThree(pos) {
  return new THREE.Vector3(pos[0], pos[2], pos[1]);
}
var roomGroup = new THREE.Group();
var floorGeometry = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
var floorMaterial = new THREE.MeshStandardMaterial({
  color: 4473941,
  roughness: 0.8,
  metalness: 0.2,
  side: THREE.DoubleSide
});
var floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.set(ROOM_WIDTH / 2, 0, ROOM_DEPTH / 2);
floor.receiveShadow = true;
roomGroup.add(floor);
var roomBoxGeometry = new THREE.BoxGeometry(ROOM_WIDTH, ROOM_HEIGHT, ROOM_DEPTH);
var roomEdges = new THREE.EdgesGeometry(roomBoxGeometry);
var roomWireframe = new THREE.LineSegments(roomEdges, new THREE.LineBasicMaterial({ color: 8965375, opacity: 0.8, transparent: true }));
roomWireframe.position.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, ROOM_DEPTH / 2);
roomGroup.add(roomWireframe);
var gridHelper = new THREE.GridHelper(Math.max(ROOM_WIDTH, ROOM_DEPTH), Math.max(ROOM_WIDTH, ROOM_DEPTH), 4473958, 3355460);
gridHelper.position.set(ROOM_WIDTH / 2, 0.01, ROOM_DEPTH / 2);
roomGroup.add(gridHelper);
scene.add(roomGroup);
var sourceGeometry = new THREE.SphereGeometry(0.15, 32, 32);
var sourceMaterial = new THREE.MeshStandardMaterial({
  color: 16729156,
  emissive: 16720418,
  emissiveIntensity: 0.3,
  roughness: 0.3,
  metalness: 0.5
});
var sourceMesh = new THREE.Mesh(sourceGeometry, sourceMaterial);
sourceMesh.position.copy(btToThree(sourcePos));
scene.add(sourceMesh);
var sourceGlowGeometry = new THREE.SphereGeometry(0.25, 32, 32);
var sourceGlowMaterial = new THREE.MeshBasicMaterial({
  color: 16729156,
  transparent: true,
  opacity: 0.2
});
var sourceGlow = new THREE.Mesh(sourceGlowGeometry, sourceGlowMaterial);
sourceGlow.position.copy(btToThree(sourcePos));
scene.add(sourceGlow);
var listenerGeometry = new THREE.SphereGeometry(0.12, 32, 32);
var listenerMaterial = new THREE.MeshStandardMaterial({
  color: 4491519,
  emissive: 2254591,
  emissiveIntensity: 0.3,
  roughness: 0.3,
  metalness: 0.5
});
var listenerMesh = new THREE.Mesh(listenerGeometry, listenerMaterial);
listenerMesh.position.copy(btToThree(listenerPos));
scene.add(listenerMesh);
var pathsGroup = new THREE.Group();
scene.add(pathsGroup);
var beamsGroup = new THREE.Group();
scene.add(beamsGroup);
function clearVisualization() {
  while (pathsGroup.children.length > 0) {
    const child = pathsGroup.children[0];
    pathsGroup.remove(child);
    if (child instanceof THREE.Line || child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      const mat = child.material;
      if (Array.isArray(mat))
        mat.forEach((m) => m.dispose());
      else if (mat)
        mat.dispose();
    }
  }
  while (beamsGroup.children.length > 0) {
    const child = beamsGroup.children[0];
    beamsGroup.remove(child);
    if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
      child.geometry?.dispose();
      const mat = child.material;
      if (Array.isArray(mat))
        mat.forEach((m) => m.dispose());
      else if (mat)
        mat.dispose();
    }
  }
}
function updatePaths() {
  clearVisualization();
  const solveStart = performance.now();
  const paths = solver.getPaths(listener);
  const solveTime = performance.now() - solveStart;
  smoothedComputeTime = smoothedComputeTime * (1 - TIMING_SMOOTHING) + solveTime * TIMING_SMOOTHING;
  const metrics = solver.getMetrics();
  const renderStart = performance.now();
  if (visualizationMode === "beams") {
    const beams = solver.getBeamsForVisualization(currentReflectionOrder);
    for (const beam of beams) {
      drawBeamCone(beam);
    }
  } else {
    for (const path of paths) {
      drawPath(path);
    }
  }
  const renderTime = performance.now() - renderStart;
  smoothedRenderTime = smoothedRenderTime * (1 - TIMING_SMOOTHING) + renderTime * TIMING_SMOOTHING;
  updateUI(paths.length, metrics);
}
function drawPath(path) {
  const order = getPathReflectionOrder(path);
  const colorIndex = Math.min(order, PATH_COLORS.length - 1);
  const color = PATH_COLORS[colorIndex];
  const points = path.map((p) => btToThree(p.position));
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const opacity = Math.max(0.3, 0.8 - order * 0.15);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    linewidth: 2
    // Note: linewidth > 1 only works on some systems
  });
  const line = new THREE.Line(geometry, material);
  pathsGroup.add(line);
  for (let i = 1; i < path.length - 1; i++) {
    const pointGeom = new THREE.SphereGeometry(0.03, 8, 8);
    const pointMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 });
    const pointMesh = new THREE.Mesh(pointGeom, pointMat);
    pointMesh.position.copy(btToThree(path[i].position));
    pathsGroup.add(pointMesh);
  }
}
function drawBeamCone(beam) {
  const colorIndex = Math.min(beam.reflectionOrder, PATH_COLORS.length - 1);
  const color = PATH_COLORS[colorIndex];
  const opacity = Math.max(0.08, 0.2 - beam.reflectionOrder * 0.03);
  const vs = btToThree(beam.virtualSource);
  const apertureVerts = beam.apertureVertices.map((v) => btToThree(v));
  for (let i = 0; i < apertureVerts.length; i++) {
    const edgeGeom = new THREE.BufferGeometry().setFromPoints([vs, apertureVerts[i]]);
    const edgeMat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: opacity * 2
    });
    beamsGroup.add(new THREE.Line(edgeGeom, edgeMat));
  }
  const apertureOutline = [...apertureVerts, apertureVerts[0]];
  const outlineGeom = new THREE.BufferGeometry().setFromPoints(apertureOutline);
  const outlineMat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: opacity * 3
  });
  beamsGroup.add(new THREE.Line(outlineGeom, outlineMat));
  for (let i = 0; i < apertureVerts.length; i++) {
    const next = (i + 1) % apertureVerts.length;
    const v0 = vs;
    const v1 = apertureVerts[i];
    const v2 = apertureVerts[next];
    const faceGeom = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      v0.x,
      v0.y,
      v0.z,
      v1.x,
      v1.y,
      v1.z,
      v2.x,
      v2.y,
      v2.z
    ]);
    faceGeom.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    faceGeom.computeVertexNormals();
    const faceMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    beamsGroup.add(new THREE.Mesh(faceGeom, faceMat));
  }
  const vsGeom = new THREE.SphereGeometry(0.05, 8, 8);
  const vsMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 });
  const vsMesh = new THREE.Mesh(vsGeom, vsMat);
  vsMesh.position.copy(vs);
  beamsGroup.add(vsMesh);
}
function formatTime(ms) {
  if (ms < 1) {
    return ms.toFixed(2) + " ms";
  } else if (ms < 10) {
    return ms.toFixed(1) + " ms";
  } else {
    return Math.round(ms) + " ms";
  }
}
function updateUI(pathCount, metrics) {
  const pathCountEl = document.getElementById("pathCount");
  const raycastsEl = document.getElementById("raycasts");
  const leafNodesEl = document.getElementById("leafNodes");
  const failPlaneEl = document.getElementById("failPlane");
  const skipSphereEl = document.getElementById("skipSphere");
  const precomputeTimeEl = document.getElementById("precomputeTime");
  const computeTimeEl = document.getElementById("computeTime");
  const renderTimeEl = document.getElementById("renderTime");
  if (pathCountEl)
    pathCountEl.textContent = pathCount.toString();
  if (raycastsEl)
    raycastsEl.textContent = metrics.raycastCount.toString();
  if (leafNodesEl)
    leafNodesEl.textContent = metrics.totalLeafNodes.toString();
  if (failPlaneEl) {
    const total = metrics.failPlaneCacheHits + metrics.failPlaneCacheMisses;
    if (total > 0) {
      const hitRate = Math.round(metrics.failPlaneCacheHits / total * 100);
      failPlaneEl.textContent = `${metrics.failPlaneCacheHits} (${hitRate}%)`;
    } else {
      failPlaneEl.textContent = `${metrics.failPlaneCacheHits}`;
    }
  }
  if (skipSphereEl) {
    if (metrics.bucketsTotal > 0) {
      const skipRate = Math.round(metrics.bucketsSkipped / metrics.bucketsTotal * 100);
      skipSphereEl.textContent = `${metrics.bucketsSkipped}/${metrics.bucketsTotal} (${skipRate}%)`;
    } else {
      skipSphereEl.textContent = "0";
    }
  }
  if (precomputeTimeEl)
    precomputeTimeEl.textContent = formatTime(lastPrecomputeTime);
  if (computeTimeEl)
    computeTimeEl.textContent = formatTime(smoothedComputeTime);
  if (renderTimeEl)
    renderTimeEl.textContent = formatTime(smoothedRenderTime);
  updatePositionUI();
}
function updatePositionUI() {
  const sourceXEl = document.getElementById("sourceX");
  const sourceYEl = document.getElementById("sourceY");
  const sourceZEl = document.getElementById("sourceZ");
  const listenerXEl = document.getElementById("listenerX");
  const listenerYEl = document.getElementById("listenerY");
  const listenerZEl = document.getElementById("listenerZ");
  if (sourceXEl)
    sourceXEl.textContent = sourcePos[0].toFixed(1);
  if (sourceYEl)
    sourceYEl.textContent = sourcePos[1].toFixed(1);
  if (sourceZEl)
    sourceZEl.textContent = sourcePos[2].toFixed(2);
  if (listenerXEl)
    listenerXEl.textContent = listenerPos[0].toFixed(1);
  if (listenerYEl)
    listenerYEl.textContent = listenerPos[1].toFixed(1);
  if (listenerZEl)
    listenerZEl.textContent = listenerPos[2].toFixed(2);
}
function updateSourcePosition(axis, delta) {
  const margin = 0.3;
  const idx = axis === "x" ? 0 : axis === "y" ? 1 : 2;
  const maxVal = idx === 0 ? ROOM_WIDTH : idx === 1 ? ROOM_DEPTH : ROOM_HEIGHT;
  sourcePos[idx] = Math.max(margin, Math.min(maxVal - margin, sourcePos[idx] + delta));
  source = new Source3D(sourcePos);
  sourceMesh.position.copy(btToThree(sourcePos));
  sourceGlow.position.copy(btToThree(sourcePos));
  recreateSolver();
  updatePaths();
}
function updateListenerPosition(axis, delta) {
  const margin = 0.3;
  const idx = axis === "x" ? 0 : axis === "y" ? 1 : 2;
  const maxVal = idx === 0 ? ROOM_WIDTH : idx === 1 ? ROOM_DEPTH : ROOM_HEIGHT;
  listenerPos[idx] = Math.max(margin, Math.min(maxVal - margin, listenerPos[idx] + delta));
  listener.moveTo(listenerPos);
  listenerMesh.position.copy(btToThree(listenerPos));
  updatePaths();
}
document.querySelectorAll(".coord-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const target = btn.dataset.target;
    const axis = btn.dataset.axis;
    const delta = parseFloat(btn.dataset.delta || "0");
    if (target === "source") {
      updateSourcePosition(axis, delta);
    } else if (target === "listener") {
      updateListenerPosition(axis, delta);
    }
  });
});
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
var dragTarget = null;
var isMouseDown = false;
var mouseDownPos = { x: 0, y: 0 };
var DRAG_THRESHOLD = 3;
var lastPathUpdate = 0;
var lastUIUpdate = 0;
var PATH_UPDATE_THROTTLE = 16;
var UI_UPDATE_THROTTLE = 50;
var pendingSourceUpdate = false;
var intersectPoint = new THREE.Vector3();
function getDragPlane(targetPos) {
  const cameraDir = new THREE.Vector3();
  camera.getWorldDirection(cameraDir);
  const verticalComponent = Math.abs(cameraDir.y);
  const useHorizontalPlane = verticalComponent > 0.5;
  const threePos = btToThree(targetPos);
  if (useHorizontalPlane) {
    return new THREE.Plane(new THREE.Vector3(0, 1, 0), -threePos.y);
  } else {
    const horizontalDir = new THREE.Vector3(cameraDir.x, 0, cameraDir.z).normalize();
    const planeNormal = horizontalDir.clone();
    const constant = -planeNormal.dot(threePos);
    return new THREE.Plane(planeNormal, constant);
  }
}
function updateMousePosition(event) {
  mouse.x = event.clientX / window.innerWidth * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}
function getHoveredObject() {
  raycaster.setFromCamera(mouse, camera);
  const sourceHits = raycaster.intersectObject(sourceMesh);
  if (sourceHits.length > 0)
    return "source";
  const listenerHits = raycaster.intersectObject(listenerMesh);
  if (listenerHits.length > 0)
    return "listener";
  return null;
}
function updateCursor() {
  const hovered = getHoveredObject();
  renderer.domElement.style.cursor = hovered ? "grab" : "default";
}
function updatePathsRealtime(skipUI = false) {
  clearVisualization();
  const solveStart = performance.now();
  const paths = solver.getPaths(listener);
  const solveTime = performance.now() - solveStart;
  smoothedComputeTime = smoothedComputeTime * (1 - TIMING_SMOOTHING) + solveTime * TIMING_SMOOTHING;
  const renderStart = performance.now();
  if (visualizationMode === "beams") {
    const beams = solver.getBeamsForVisualization(currentReflectionOrder);
    for (const beam of beams) {
      drawBeamCone(beam);
    }
  } else {
    for (const path of paths) {
      drawPath(path);
    }
  }
  const renderTime = performance.now() - renderStart;
  smoothedRenderTime = smoothedRenderTime * (1 - TIMING_SMOOTHING) + renderTime * TIMING_SMOOTHING;
  if (!skipUI) {
    const metrics = solver.getMetrics();
    updateUI(paths.length, metrics);
  }
}
function scheduleSourceUpdate() {
  pendingSourceUpdate = true;
}
function processSourceUpdate() {
  if (!pendingSourceUpdate)
    return;
  pendingSourceUpdate = false;
  source = new Source3D(sourcePos);
  recreateSolver();
  updatePathsRealtime(false);
}
renderer.domElement.addEventListener("mousedown", (event) => {
  mouseDownPos = { x: event.clientX, y: event.clientY };
  isMouseDown = true;
  updateMousePosition(event);
  const target = getHoveredObject();
  if (target) {
    dragTarget = target;
    controls.enabled = false;
    renderer.domElement.style.cursor = "grabbing";
  }
});
renderer.domElement.addEventListener("mousemove", (event) => {
  updateMousePosition(event);
  if (!isMouseDown) {
    updateCursor();
    return;
  }
  if (!dragTarget) {
    const dx = event.clientX - mouseDownPos.x;
    const dy = event.clientY - mouseDownPos.y;
    if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
    }
    return;
  }
  raycaster.setFromCamera(mouse, camera);
  const currentPos = dragTarget === "source" ? sourcePos : listenerPos;
  const plane = getDragPlane(currentPos);
  if (raycaster.ray.intersectPlane(plane, intersectPoint)) {
    const margin = 0.3;
    const newX = Math.max(margin, Math.min(ROOM_WIDTH - margin, intersectPoint.x));
    const newY = Math.max(margin, Math.min(ROOM_DEPTH - margin, intersectPoint.z));
    const newZ = Math.max(margin, Math.min(ROOM_HEIGHT - margin, intersectPoint.y));
    if (dragTarget === "listener") {
      listenerPos = [newX, newY, newZ];
      listener.moveTo(listenerPos);
      listenerMesh.position.set(newX, newZ, newY);
      const now = performance.now();
      if (now - lastPathUpdate > PATH_UPDATE_THROTTLE) {
        lastPathUpdate = now;
        updatePathsRealtime(now - lastUIUpdate < UI_UPDATE_THROTTLE);
        if (now - lastUIUpdate >= UI_UPDATE_THROTTLE) {
          lastUIUpdate = now;
        }
      }
    } else {
      sourcePos = [newX, newY, newZ];
      sourceMesh.position.set(newX, newZ, newY);
      sourceGlow.position.set(newX, newZ, newY);
      scheduleSourceUpdate();
      const now = performance.now();
      if (now - lastUIUpdate > UI_UPDATE_THROTTLE) {
        lastUIUpdate = now;
        updatePositionUI();
      }
    }
  }
});
renderer.domElement.addEventListener("mouseup", (event) => {
  const wasDragging = dragTarget !== null;
  if (dragTarget === "source") {
    processSourceUpdate();
  }
  dragTarget = null;
  isMouseDown = false;
  controls.enabled = true;
  updateMousePosition(event);
  updateCursor();
  if (!wasDragging) {
    const dx = event.clientX - mouseDownPos.x;
    const dy = event.clientY - mouseDownPos.y;
    const didMove = Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD;
    if (!didMove) {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(floor);
      if (intersects.length > 0) {
        const point = intersects[0].point;
        const margin = 0.3;
        const x = Math.max(margin, Math.min(ROOM_WIDTH - margin, point.x));
        const z = Math.max(margin, Math.min(ROOM_DEPTH - margin, point.z));
        listenerPos = [x, z, listenerPos[2]];
        listener.moveTo(listenerPos);
        listenerMesh.position.set(x, listenerPos[2], z);
        updatePaths();
      }
    }
  }
});
renderer.domElement.addEventListener("mouseleave", () => {
  if (dragTarget === "source") {
    processSourceUpdate();
  }
  dragTarget = null;
  isMouseDown = false;
  controls.enabled = true;
  renderer.domElement.style.cursor = "default";
});
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", onWindowResize);
function updateOrderUI() {
  const orderValueEl = document.getElementById("orderValue");
  const orderUpBtn = document.getElementById("orderUp");
  const orderDownBtn = document.getElementById("orderDown");
  if (orderValueEl)
    orderValueEl.textContent = currentReflectionOrder.toString();
  if (orderUpBtn)
    orderUpBtn.disabled = currentReflectionOrder >= MAX_REFLECTION_ORDER;
  if (orderDownBtn)
    orderDownBtn.disabled = currentReflectionOrder <= MIN_REFLECTION_ORDER;
  for (let i = 0; i <= 4; i++) {
    const legendItem = document.getElementById(`legend-${i}`);
    if (legendItem) {
      const orderThreshold = i === 4 ? 4 : i;
      if (orderThreshold > currentReflectionOrder) {
        legendItem.classList.add("dimmed");
      } else {
        legendItem.classList.remove("dimmed");
      }
    }
  }
}
function changeReflectionOrder(delta) {
  const newOrder = currentReflectionOrder + delta;
  if (newOrder >= MIN_REFLECTION_ORDER && newOrder <= MAX_REFLECTION_ORDER) {
    currentReflectionOrder = newOrder;
    recreateSolver();
    updateOrderUI();
    updatePaths();
  }
}
document.getElementById("orderUp")?.addEventListener("click", (e) => {
  e.stopPropagation();
  changeReflectionOrder(1);
});
document.getElementById("orderDown")?.addEventListener("click", (e) => {
  e.stopPropagation();
  changeReflectionOrder(-1);
});
function toggleVisualizationMode() {
  visualizationMode = visualizationMode === "paths" ? "beams" : "paths";
  const toggleBtn = document.getElementById("toggleView");
  if (toggleBtn) {
    toggleBtn.textContent = visualizationMode === "paths" ? "Paths" : "Beams";
  }
  updatePaths();
}
document.getElementById("toggleView")?.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleVisualizationMode();
});
window.addEventListener("keydown", (e) => {
  if (e.key === "+" || e.key === "=" || e.key === "ArrowUp") {
    changeReflectionOrder(1);
  } else if (e.key === "-" || e.key === "_" || e.key === "ArrowDown") {
    changeReflectionOrder(-1);
  } else if (e.key === "b" || e.key === "B") {
    toggleVisualizationMode();
  }
});
var frameCount = 0;
var lastFPSUpdate = performance.now();
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  frameCount++;
  const now = performance.now();
  if (now - lastFPSUpdate >= 1e3) {
    const fpsEl = document.getElementById("fps");
    if (fpsEl)
      fpsEl.textContent = frameCount.toString();
    frameCount = 0;
    lastFPSUpdate = now;
  }
  const scale = 1 + Math.sin(now * 3e-3) * 0.1;
  sourceGlow.scale.setScalar(scale);
  renderer.render(scene, camera);
}
camera.position.set(ROOM_WIDTH * 1.2, ROOM_HEIGHT * 1.5, ROOM_DEPTH * 1.2);
controls.target.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 3, ROOM_DEPTH / 2);
controls.update();
updateOrderUI();
updatePositionUI();
updatePaths();
animate();
console.log("BeamTrace3D Demo initialized");
console.log(`Room: ${ROOM_WIDTH}m x ${ROOM_DEPTH}m x ${ROOM_HEIGHT}m`);
console.log(`Max reflection order: ${MAX_REFLECTION_ORDER}`);
console.log(`Leaf nodes: ${solver.getLeafNodeCount()}`);
//# sourceMappingURL=main3d.bundle.js.map
