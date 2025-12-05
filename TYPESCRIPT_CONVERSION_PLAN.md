# TypeScript Conversion Plan for BeamTrace2D

This document outlines the step-by-step plan to convert BeamTrace2D from JavaScript to TypeScript.

## Decisions

- **Module format**: ES modules only (no UMD)
- **jQuery**: Remove, convert to vanilla JS
- **Bundler**: esbuild
- **Test runner**: Vitest (CLI) + QUnit (browser)

## Overview

| Current State | Target State |
|---------------|--------------|
| 4 JS files (UMD module) | TypeScript source with ES modules |
| No build system | TypeScript compiler + esbuild |
| Browser-based tests only | Vitest CLI + QUnit browser tests |
| jQuery dependency | Vanilla JS |
| Direct script loading | Compiled JS output |

## Phase 1: Project Setup

### 1.1 Install TypeScript and tooling

```bash
npm install --save-dev typescript esbuild vitest @types/qunit
npm uninstall jquery
```

### 1.2 Create tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 1.3 Create new directory structure

```
├── src/
│   ├── beamtrace2d.ts      (core library)
│   ├── main.ts             (demo app - vanilla JS)
│   ├── perf.ts             (performance demo - vanilla JS)
│   └── __tests__/
│       └── beamtrace2d.test.ts  (Vitest tests)
├── dist/                    (compiled output)
├── js/                      (keep for backward compatibility during migration)
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

### 1.4 Add build scripts to package.json

```json
{
  "scripts": {
    "build": "tsc && npm run bundle",
    "bundle": "esbuild dist/main.js --bundle --outfile=dist/main.bundle.js --format=iife && esbuild dist/perf.js --bundle --outfile=dist/perf.bundle.js --format=iife",
    "watch": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "start": "node server.js"
  }
}
```

### 1.5 Create vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts'],
    globals: true,
  },
});
```

---

## Phase 2: Define Type Interfaces

Create type definitions for all data structures in `src/types.ts` or at the top of `beamtrace2d.ts`:

### 2.1 Core geometric types

```typescript
/** 2D point as [x, y] tuple */
export type Point = [number, number];

/** Wall segment defined by two endpoints */
export interface Wall {
  p1: Point;
  p2: Point;
  id?: number;
}

/** Path point with reflection info [x, y, wallId] */
export type PathPoint = [number, number, number | null];

/** Complete reflection path from source to listener */
export type ReflectionPath = PathPoint[];
```

### 2.2 Internal algorithm types

```typescript
/** Line intersection result */
interface IntersectionResult {
  p: Point;           // intersection point
  seg1: number;       // parameter along segment 1 (0-1 if on segment)
  seg2: number;       // parameter along segment 2
}

/** BSP tree node */
interface BSPNode {
  wall: Wall;
  front: BSPNode | null;
  back: BSPNode | null;
}

/** Beam node in the beam tree */
interface BeamNode {
  virtualSource: Point;
  wall: Wall | null;
  leftEdge: Point;
  rightEdge: Point;
  children: BeamNode[];
}
```

### 2.3 Public API types

```typescript
export interface Solver {
  getPaths(listener: Listener): ReflectionPath[];
}

export interface Source {
  p0: Point;
}

export interface Listener {
  p0: Point;
}
```

---

## Phase 3: Convert Core Library (beamtrace2d.ts)

### 3.1 Convert helper functions

Convert standalone functions with explicit types:

- `lineIntersection(p1, p2, p3, p4)` → typed parameters and return
- `pointMirror(point, wall)` → typed parameters
- `pointSide(point, wall)` → return type enum or number
- Other utility functions

### 3.2 Convert BSP tree classes

```typescript
class BSPNode {
  wall: Wall;
  front: BSPNode | null = null;
  back: BSPNode | null = null;

  constructor(wall: Wall) {
    this.wall = wall;
  }
}

class BSPTree {
  root: BSPNode | null = null;

  constructor(walls: Wall[]) {
    // build tree
  }

  raycast(origin: Point, direction: Point): Wall | null {
    // ...
  }
}
```

### 3.3 Convert Beam tree classes

```typescript
class BeamNode {
  virtualSource: Point;
  wall: Wall | null;
  children: BeamNode[] = [];
  // ...
}

class BeamTree {
  root: BeamNode;
  maxOrder: number;

  constructor(source: Source, walls: Wall[], maxOrder: number) {
    // ...
  }
}
```

### 3.4 Convert Solver class

```typescript
class Solver {
  private bspTree: BSPTree;
  private beamTree: BeamTree;
  private walls: Wall[];
  private source: Source;

  constructor(walls: Wall[], source: Source, reflectionOrder: number) {
    this.walls = walls;
    this.source = source;
    this.bspTree = new BSPTree(walls);
    this.beamTree = new BeamTree(source, walls, reflectionOrder);
  }

  getPaths(listener: Listener): ReflectionPath[] {
    // ...
  }
}
```

### 3.5 Convert factory functions to classes

Current JS uses factory functions. Convert to proper classes:

```typescript
// Before (JS)
BeamTrace2D.Wall = function(p1, p2) { return { p1, p2 }; }

// After (TS)
export class Wall {
  constructor(public p1: Point, public p2: Point) {}
}
```

### 3.6 Update module exports

Change from UMD to ES modules:

```typescript
// src/beamtrace2d.ts
export { Wall, Source, Listener, Solver };
export type { Point, PathPoint, ReflectionPath };

// For backward compatibility, also export as namespace
export const BeamTrace2D = {
  Wall,
  Source,
  Listener,
  Solver
};

export default BeamTrace2D;
```

---

## Phase 4: Convert Demo Applications (jQuery → Vanilla JS)

### 4.1 Convert main.ts

- Remove jQuery dependency entirely
- Replace `$(document).ready()` with `DOMContentLoaded` event
- Replace `$('#cvs')` with `document.getElementById('cvs')`
- Replace jQuery event handlers with `addEventListener`
- Add type annotations to all variables

```typescript
import { Wall, Source, Listener, Solver, Point, ReflectionPath } from './beamtrace2d';

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('cvs') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;

  let walls: Wall[] = [];
  let source: Source;
  let listener: Listener;
  let solver: Solver;

  // Replace $(canvas).click() with:
  canvas.addEventListener('click', (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // ...
  });

  // Replace $(canvas).mousemove() with:
  canvas.addEventListener('mousemove', (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // ...
  });
});
```

### 4.2 Convert perf.ts

Same approach as main.ts - remove jQuery, use vanilla JS event handling.

---

## Phase 5: Convert Tests

### 5.1 Create Vitest tests (CLI runner)

Create `src/__tests__/beamtrace2d.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { Wall, Source, Listener, Solver } from '../beamtrace2d';

describe('BeamTrace2D', () => {
  describe('Wall', () => {
    it('creates a wall with two points', () => {
      const wall = new Wall([0, 0], [100, 0]);
      expect(wall.p1).toEqual([0, 0]);
      expect(wall.p2).toEqual([100, 0]);
    });
  });

  describe('Solver', () => {
    it('returns direct path when no walls block', () => {
      const walls: Wall[] = [
        new Wall([0, 0], [100, 0]),
        new Wall([100, 0], [100, 100]),
        new Wall([100, 100], [0, 100]),
        new Wall([0, 100], [0, 0]),
      ];
      const source = new Source([50, 50]);
      const solver = new Solver(walls, source, 3);
      const listener = new Listener([60, 60]);

      const paths = solver.getPaths(listener);
      expect(Array.isArray(paths)).toBe(true);
      expect(paths.length).toBeGreaterThan(0);
    });

    it('computes reflection paths', () => {
      const walls: Wall[] = [
        new Wall([0, 0], [100, 0]),
        new Wall([100, 0], [100, 100]),
        new Wall([100, 100], [0, 100]),
        new Wall([0, 100], [0, 0]),
      ];
      const source = new Source([25, 50]);
      const solver = new Solver(walls, source, 2);
      const listener = new Listener([75, 50]);

      const paths = solver.getPaths(listener);
      // Should have direct path plus reflection paths
      expect(paths.length).toBeGreaterThan(1);
    });
  });
});
```

### 5.2 Keep QUnit tests for browser (optional)

Update `test.html` to load compiled JS and keep browser-based testing available.

### 5.3 Recommended test coverage

Add tests for:
- Line intersection edge cases (parallel lines, collinear, endpoints)
- BSP tree construction and ray casting
- Beam tree reflection calculations
- Point mirroring across walls
- Path validation (blocked vs unblocked)

---

## Phase 6: Build Configuration (esbuild)

### 6.1 Build pipeline

1. **TypeScript compilation**: `tsc` compiles `.ts` → `.js` with type checking
2. **Bundling**: `esbuild` bundles for browser (IIFE format)

### 6.2 esbuild configuration

For simple cases, use CLI flags. For complex builds, create `build.mjs`:

```javascript
import * as esbuild from 'esbuild';

// Bundle main demo app
await esbuild.build({
  entryPoints: ['dist/main.js'],
  bundle: true,
  outfile: 'dist/main.bundle.js',
  format: 'iife',
  minify: false,
  sourcemap: true,
});

// Bundle perf demo app
await esbuild.build({
  entryPoints: ['dist/perf.js'],
  bundle: true,
  outfile: 'dist/perf.bundle.js',
  format: 'iife',
  minify: false,
  sourcemap: true,
});

console.log('Build complete');
```

### 6.3 Final package.json scripts

```json
{
  "scripts": {
    "build": "tsc && node build.mjs",
    "watch": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "start": "node server.js"
  }
}
```

---

## Phase 7: Update HTML Files

### 7.1 Update index.html

```html
<!-- Remove jQuery -->
<!-- <script src="node_modules/jquery/dist/jquery.min.js"></script> -->

<!-- Change from -->
<script src="js/beamtrace2d.js"></script>
<script src="js/main.js"></script>

<!-- To single bundled file -->
<script src="dist/main.bundle.js"></script>
```

### 7.2 Update perf.html

```html
<!-- Remove jQuery, use bundled file -->
<script src="dist/perf.bundle.js"></script>
```

### 7.3 Update test.html (for QUnit browser tests)

```html
<!-- Keep QUnit -->
<link rel="stylesheet" href="node_modules/qunitjs/qunit/qunit.css">
<script src="node_modules/qunitjs/qunit/qunit.js"></script>

<!-- Load compiled library directly (not bundled, for testing) -->
<script type="module">
  import { Wall, Source, Listener, Solver } from './dist/beamtrace2d.js';
  window.BeamTrace2D = { Wall, Source, Listener, Solver };
</script>
<script src="dist/tests.browser.js"></script>
```

---

## Phase 8: Cleanup and Documentation

### 8.1 Remove old JS files

Once conversion is complete and tested:
```bash
rm -rf js/  # or move to js.backup/
```

### 8.2 Update package.json

```json
{
  "name": "beam-trace-2d",
  "version": "2.0.0",
  "type": "module",
  "main": "dist/beamtrace2d.js",
  "types": "dist/beamtrace2d.d.ts",
  "exports": {
    ".": {
      "import": "./dist/beamtrace2d.js",
      "types": "./dist/beamtrace2d.d.ts"
    }
  },
  "scripts": {
    "build": "tsc && node build.mjs",
    "watch": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "start": "node server.js"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "esbuild": "^0.20.x",
    "vitest": "^1.x",
    "@types/qunit": "^2.x"
  },
  "dependencies": {
    "express": "^4.x",
    "qunitjs": "^2.x"
  }
}
```

### 8.3 Update CLAUDE.md

```markdown
## Commands

\`\`\`bash
npm install    # Install dependencies
npm run build  # Compile TypeScript and bundle for browser
npm test       # Run Vitest tests (CLI)
npm start      # Run dev server at http://localhost:3000
\`\`\`

**Browser tests:** Open `test.html` in browser (QUnit-based)
**Performance tests:** Open `perf.html` in browser
```

### 8.4 Add .gitignore entries

```
dist/
```

---

## Implementation Order Summary

| Step | Phase | Description |
|------|-------|-------------|
| 1 | Setup | Install deps, create tsconfig, vitest.config, directory structure |
| 2 | Types | Define all interfaces and type aliases |
| 3 | Core | Convert beamtrace2d.js → beamtrace2d.ts |
| 4 | Tests | Create Vitest tests, verify core library works |
| 5 | Demos | Convert main.js and perf.js (remove jQuery) |
| 6 | Build | Configure esbuild bundling |
| 7 | HTML | Update script references, remove jQuery |
| 8 | Cleanup | Remove old js/ folder, update docs |

---

## Risk Mitigation

### Keep backward compatibility during migration

- Keep original `js/` folder until migration is complete
- Test thoroughly at each phase
- Run both old and new tests until confident

### Type strictness

Start with `strict: true` in tsconfig. If too many errors:
1. Temporarily set `strict: false`
2. Enable individual strict flags incrementally:
   - `noImplicitAny`
   - `strictNullChecks`
   - `strictFunctionTypes`

---

## Estimated Effort by File

| File | Complexity | Notes |
|------|------------|-------|
| beamtrace2d.js → .ts | High | Core algorithms, many internal types |
| main.js → .ts | Medium | jQuery → vanilla JS conversion |
| perf.js → .ts | Medium | jQuery → vanilla JS conversion |
| tests.js → Vitest | Low | Rewrite as Vitest tests |
| Config files | Low | tsconfig, vitest.config, package.json |
