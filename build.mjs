import * as esbuild from 'esbuild';

// Bundle main demo app (2D)
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

// Bundle 3D demo app (Three.js loaded via CDN, marked as external)
await esbuild.build({
  entryPoints: ['dist/main3d.js'],
  bundle: true,
  outfile: 'dist/main3d.bundle.js',
  format: 'esm',
  minify: false,
  sourcemap: true,
  external: ['three', 'three/*'],
});

console.log('Build complete');
