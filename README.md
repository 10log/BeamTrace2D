# BeamTrace - 2D & 3D Acoustic Beam Tracing

A TypeScript library for acoustic beam tracing simulations in 2D and 3D environments. Uses BSP (Binary Space Partitioning) trees for accelerated ray tracing and beam trees for tracking reflection paths from a sound source to a listener.

Based on: S. Laine, S. Siltanen, T. Lokki, and L. Savioja. "Accelerated beam tracing algorithm." Applied Acoustics, 70(1):172–181, 2009.

and original 2D implementation of this library by [kai5z](https://github.com/kai5z/BeamTrace2D)

## Features

- **2D Beam Tracing** - Original implementation for 2D room acoustics
- **3D Beam Tracing** - Full 3D implementation with polygonal room geometry
- **BSP Tree Acceleration** - O(log n) ray-polygon intersection queries
- **Fail Plane Optimization** - O(1) early rejection caching for ~40x speedup
- **Skip Sphere Optimization** - Spatial bucketing for additional ~1.5x speedup
- **Performance Metrics** - Built-in tracking of cache hits, raycasts, and path counts

## Installation

```bash
npm install
```

## Usage

### 2D Beam Tracing

```typescript
import { Wall, Source, Listener, Solver } from 'beam-trace/2d';

// Define room walls
const walls = [
  new Wall([0, 0], [100, 0]),
  new Wall([100, 0], [100, 100]),
  new Wall([100, 100], [0, 100]),
  new Wall([0, 100], [0, 0])
];

// Create source and solver
const source = new Source([50, 50]);
const solver = new Solver(walls, source, 4); // 4 = max reflection order

// Find paths to listener
const listener = new Listener([60, 60]);
const paths = solver.getPaths(listener);

// Get detailed path information with angles
const detailedPaths = solver.getDetailedPaths(listener);
for (const path of detailedPaths) {
  console.log(`Path length: ${path.totalPathLength.toFixed(2)}m`);
  console.log(`Reflections: ${path.reflectionCount}`);
  for (const reflection of path.reflections) {
    const angleInDegrees = reflection.incidenceAngle * (180 / Math.PI);
    console.log(`  Wall ${reflection.wallId}: angle ${angleInDegrees.toFixed(1)}°`);
  }
}
```

### 3D Beam Tracing

```typescript
import {
  Polygon3D,
  Source3D,
  Listener3D,
  Solver3D,
  createShoeboxRoom,
  computePathLength,
  computeArrivalTime
} from 'beam-trace/3d';

// Create a simple shoebox room (10m x 8m x 3m)
const room = createShoeboxRoom(10, 8, 3);

// Or define custom polygonal geometry
const customWall = Polygon3D.create([
  [0, 0, 0],
  [10, 0, 0],
  [10, 0, 3],
  [0, 0, 3]
]);

// Create source and solver
const source = new Source3D([5, 4, 1.5]);
const solver = new Solver3D(room, source, {
  maxReflectionOrder: 4,
  bucketSize: 16
});

// Find paths to listener
const listener = new Listener3D([2, 2, 1.2]);
const paths = solver.getPaths(listener);

// Analyze paths
for (const path of paths) {
  const length = computePathLength(path);
  const arrivalTime = computeArrivalTime(path); // seconds
  console.log(`Path length: ${length.toFixed(2)}m, arrival: ${(arrivalTime * 1000).toFixed(2)}ms`);
}

// Check performance metrics
const metrics = solver.getMetrics();
console.log(`Valid paths: ${metrics.validPathCount}`);
console.log(`Cache hits: ${metrics.failPlaneCacheHits}`);
console.log(`Buckets skipped: ${metrics.bucketsSkipped}`);

// Get detailed path information with angles
const detailedPaths = solver.getDetailedPaths(listener);
for (const path of detailedPaths) {
  console.log(`Path length: ${path.totalPathLength.toFixed(2)}m`);
  console.log(`Reflections: ${path.reflectionCount}`);
  for (const reflection of path.reflections) {
    const angleInDegrees = reflection.incidenceAngle * (180 / Math.PI);
    console.log(`  Polygon ${reflection.polygonId}: angle ${angleInDegrees.toFixed(1)}°`);
  }
}
```

## Commands

```bash
npm install    # Install dependencies
npm run build  # Compile TypeScript and bundle for browser
npm test       # Run Vitest tests (173 tests)
npm start      # Run dev server at http://localhost:3000
```

**Browser tests:** Open `test.html` in browser (QUnit-based)
**Performance tests:** Open `perf.html` in browser

## Project Structure

```
src/
├── core/                    # Core mathematical primitives
│   ├── types.ts             # Shared type definitions
│   ├── vector3.ts           # 3D vector operations
│   └── plane3d.ts           # 3D plane operations
│
├── geometry/                # Geometry operations
│   ├── polygon3d.ts         # 3D polygon representation
│   ├── polygon-split.ts     # Polygon splitting for BSP
│   └── clipping3d.ts        # Sutherland-Hodgman clipping
│
├── structures/              # Data structures
│   ├── bsp3d.ts             # 3D BSP tree
│   ├── beam3d.ts            # 3D beam representation
│   └── beamtree3d.ts        # Beam tree construction
│
├── optimization/            # Performance optimizations
│   ├── failplane3d.ts       # Fail plane caching
│   └── skipsphere3d.ts      # Skip sphere bucketing
│
├── solver/                  # Main solver
│   └── solver3d.ts          # OptimizedSolver3D
│
├── beamtrace2d.ts           # 2D library (original)
├── beamtrace3d.ts           # 3D library entry point
├── geometry.ts              # 2D geometry utilities
├── optimization.ts          # 2D optimizations
├── main.ts                  # 2D demo application
└── perf.ts                  # Performance demo
```

## Algorithm Overview

### Data Flow

1. **BSP Tree Construction** - Room polygons are partitioned into a BSP tree for O(log n) ray queries
2. **Beam Tree Construction** - Virtual sources are computed by mirroring the source across each polygon, creating a tree of reflection paths
3. **Path Finding** - For each listener position, the beam tree is traversed to find valid reflection paths
4. **Optimization** - Failed paths cache their geometric failure reason (fail plane) for O(1) rejection on subsequent frames

### Performance Optimizations

| Optimization | Speedup | Description |
|--------------|---------|-------------|
| BSP Tree | ~10x | O(log n) ray-polygon intersection instead of O(n) |
| Fail Plane | ~40x | Cache geometric failure reason for O(1) rejection |
| Skip Sphere | ~1.5x | Group nodes into buckets with spatial rejection spheres |
| **Combined** | **~60x** | Total speedup vs naive implementation |

## API Reference

### 2D Types

```typescript
type Point = [number, number];
type PathPoint = [number, number, number | null]; // [x, y, wallId]
type ReflectionPath = PathPoint[];

interface ReflectionDetail {
  wall: Wall;                    // The wall that was hit
  wallId: number;                // Index of the wall
  hitPoint: Point;               // Point where reflection occurred
  incidenceAngle: number;        // Angle of incidence (radians)
  reflectionAngle: number;       // Angle of reflection (radians)
  incomingDirection: Point;      // Normalized incoming ray direction
  outgoingDirection: Point;      // Normalized outgoing ray direction
  wallNormal: Point;             // Wall normal (toward incoming ray)
  reflectionOrder: number;       // Which reflection (1 = first, 2 = second, etc.)
  wallPosition: number;          // Parametric position on wall (0 = p1, 1 = p2)
  cumulativeDistance: number;    // Distance traveled up to this reflection
  incomingSegmentLength: number; // Length of incoming segment
  isGrazing: boolean;            // True if angle near 90° (numerically unstable)
}

interface SegmentDetail {
  startPoint: Point;             // Start of segment
  endPoint: Point;               // End of segment
  length: number;                // Segment length
  segmentIndex: number;          // Index (0 = first segment from listener)
}

interface DetailedReflectionPath {
  listenerPosition: Point;       // Start point
  sourcePosition: Point;         // End point
  totalPathLength: number;       // Total path distance
  reflectionCount: number;       // Number of reflections
  reflections: ReflectionDetail[]; // Details for each reflection
  segments: SegmentDetail[];     // Details for each path segment
  simplePath: ReflectionPath;    // Original path representation
}
```

### 2D Classes

- `Wall(p1: Point, p2: Point)` - Wall segment defined by two endpoints
- `Source(position: Point)` - Sound source position
- `Listener(position: Point)` - Listener position
- `Solver(walls, source, reflectionOrder?)` - Main solver

#### Solver Methods (2D)

| Method | Returns | Description |
|--------|---------|-------------|
| `getPaths(listener)` | `ReflectionPath[]` | Find all valid reflection paths |
| `getDetailedPaths(listener)` | `DetailedReflectionPath[]` | Find paths with full reflection details including angles |

### 3D Types

```typescript
type Vector3 = [number, number, number];

interface Polygon3D {
  vertices: Vector3[];
  plane: Plane3D;
  materialId?: number;
}

interface PathPoint3D {
  position: Vector3;
  polygonId: number | null;
}

type ReflectionPath3D = PathPoint3D[];

interface ReflectionDetail3D {
  polygon: Polygon3D;              // The polygon that was hit
  polygonId: number;               // Index of the polygon
  hitPoint: Vector3;               // Point where reflection occurred [x, y, z]
  incidenceAngle: number;          // Angle of incidence (radians)
  reflectionAngle: number;         // Angle of reflection (radians)
  incomingDirection: Vector3;      // Normalized incoming ray direction
  outgoingDirection: Vector3;      // Normalized outgoing ray direction
  surfaceNormal: Vector3;          // Surface normal (toward incoming ray)
  reflectionOrder: number;         // Which reflection (1 = first, 2 = second, etc.)
  cumulativeDistance: number;      // Distance traveled up to this reflection
  incomingSegmentLength: number;   // Length of incoming segment
  isGrazing: boolean;              // True if angle near 90° (numerically unstable)
}

interface SegmentDetail3D {
  startPoint: Vector3;             // Start of segment
  endPoint: Vector3;               // End of segment
  length: number;                  // Segment length
  segmentIndex: number;            // Index (0 = first segment from listener)
}

interface DetailedReflectionPath3D {
  listenerPosition: Vector3;       // Start point
  sourcePosition: Vector3;         // End point
  totalPathLength: number;         // Total path distance
  reflectionCount: number;         // Number of reflections
  reflections: ReflectionDetail3D[]; // Details for each reflection
  segments: SegmentDetail3D[];     // Details for each path segment
  simplePath: ReflectionPath3D;    // Original path representation
}
```

### 3D Classes

- `Source3D(position: Vector3)` - Sound source position
- `Listener3D(position: Vector3)` - Listener position with `moveTo()` method
- `Solver3D(polygons, source, config?)` - Main solver

#### Solver3D Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getPaths(listener)` | `ReflectionPath3D[]` | Find all valid reflection paths to listener |
| `getDetailedPaths(listener)` | `DetailedReflectionPath3D[]` | Find paths with full reflection details including angles |
| `getMetrics()` | `PerformanceMetrics3D` | Get performance stats from last `getPaths()` call |
| `getBeamsForVisualization(maxOrder?)` | `BeamVisualizationData[]` | Get beam cone geometry for rendering |
| `getLeafNodeCount()` | `number` | Number of leaf nodes in beam tree |
| `getMaxReflectionOrder()` | `number` | Configured maximum reflection order |
| `clearCache()` | `void` | Clear fail plane and skip sphere caches |

#### Performance Metrics

```typescript
interface PerformanceMetrics3D {
  totalLeafNodes: number;      // Total beam tree leaf nodes
  bucketsTotal: number;        // Total skip sphere buckets
  bucketsSkipped: number;      // Buckets skipped via skip sphere
  bucketsChecked: number;      // Buckets fully evaluated
  failPlaneCacheHits: number;  // Paths rejected via cached fail plane
  failPlaneCacheMisses: number; // Cache misses (full validation needed)
  raycastCount: number;        // Total BSP ray queries
  skipSphereCount: number;     // Skip spheres created this frame
  validPathCount: number;      // Valid paths found
}
```

#### Beam Visualization Data

```typescript
interface BeamVisualizationData {
  virtualSource: Vector3;       // Cone apex (mirrored source position)
  apertureVertices: Vector3[];  // Vertices of the aperture polygon
  reflectionOrder: number;      // 1 = first reflection, 2 = second, etc.
  polygonId: number;            // ID of the reflecting polygon
}
```

### Helper Functions

- `createShoeboxRoom(width, depth, height)` - Create a rectangular room
- `computePathLength(path)` - Total path distance in meters
- `computeArrivalTime(path, speedOfSound?)` - Arrival time in seconds
- `getPathReflectionOrder(path)` - Number of reflections
- `convertToDetailedPath3D(path, polygons)` - Convert a simple path to detailed path with reflection info

## Demos

```bash
npm start
```

### 2D Demo
Open [http://localhost:3000](http://localhost:3000) - Click to move the source position.

### 3D Demo
Open [http://localhost:3000/index3d.html](http://localhost:3000/index3d.html) - Interactive Three.js visualization:

**Controls:**
- **Drag** source (red) or listener (blue) spheres to reposition
- **Click** on the floor to move the listener
- **Drag** elsewhere to orbit the camera
- **Scroll** to zoom in/out
- **+/-** or arrow keys to change reflection order (0-6)
- **B** to toggle between path rays and beam cones

**Display:**
- Paths/beams are color-coded by reflection order (green=direct, yellow/orange/pink/purple=reflections)
- Real-time performance metrics: path count, raycasts, cache hit rates
- Timing breakdown: precompute, solve, and render times
- Source/listener position controls with coordinate display

## License

MIT
