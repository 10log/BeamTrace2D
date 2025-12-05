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
