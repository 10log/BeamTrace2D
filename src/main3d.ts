/**
 * BeamTrace3D Interactive Demo
 *
 * Three.js visualization of 3D acoustic beam tracing.
 * Click on the floor to move the listener and see reflection paths update in real-time.
 */

import * as THREE from 'three';
// @ts-expect-error - OrbitControls loaded from CDN via import map
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  createShoeboxRoom,
  Source3D,
  Listener3D,
  Solver3D,
  getPathReflectionOrder
} from './beamtrace3d';
import type { Vector3 as BT_Vector3, ReflectionPath3D, BeamVisualizationData } from './beamtrace3d';

// ============================================================================
// Configuration
// ============================================================================

const ROOM_WIDTH = 10;   // X dimension (meters)
const ROOM_DEPTH = 8;    // Y dimension (meters)
const ROOM_HEIGHT = 3;   // Z dimension (meters)
const MIN_REFLECTION_ORDER = 0;
const MAX_REFLECTION_ORDER = 6;
let currentReflectionOrder = 3;

// Visualization mode: 'paths' (rays) or 'beams' (cones)
let visualizationMode: 'paths' | 'beams' = 'paths';

// Colors for different reflection orders
const PATH_COLORS = [
  0x00ff00, // Direct (green)
  0xffff00, // 1st order (yellow)
  0xff8800, // 2nd order (orange)
  0xff0088, // 3rd order (pink)
  0x8800ff, // 4th+ order (purple)
];

// ============================================================================
// Three.js Setup
// ============================================================================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Camera controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 5;
controls.maxDistance = 50;
controls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent going below floor

// ============================================================================
// Lighting
// ============================================================================

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 15, 10);
scene.add(directionalLight);

// ============================================================================
// BeamTrace3D Setup
// ============================================================================

// Create room geometry
const roomPolygons = createShoeboxRoom(ROOM_WIDTH, ROOM_DEPTH, ROOM_HEIGHT);

// Source position (center of room, ear height)
let sourcePos: BT_Vector3 = [ROOM_WIDTH * 0.7, ROOM_DEPTH * 0.6, 1.5];
let source = new Source3D(sourcePos);

// Timing metrics (smoothed with exponential moving average)
let lastPrecomputeTime = 0;
let smoothedComputeTime = 0;
let smoothedRenderTime = 0;
const TIMING_SMOOTHING = 0.3; // Lower = smoother, higher = more responsive

// Create solver (will be recreated when reflection order changes)
function createSolver(): InstanceType<typeof Solver3D> {
  const start = performance.now();
  const newSolver = new Solver3D(roomPolygons, source, {
    maxReflectionOrder: currentReflectionOrder,
    bucketSize: 16
  });
  lastPrecomputeTime = performance.now() - start;
  return newSolver;
}

let solver = createSolver();

function recreateSolver(): void {
  solver = createSolver();
}

// Listener position
let listenerPos: BT_Vector3 = [ROOM_WIDTH * 0.3, ROOM_DEPTH * 0.3, 1.2];
const listener = new Listener3D(listenerPos);

// ============================================================================
// Room Visualization
// ============================================================================

/**
 * Convert BeamTrace3D coordinates to Three.js coordinates
 * BeamTrace: X=width, Y=depth, Z=height (up)
 * Three.js:  X=width, Y=height (up), Z=depth
 */
function btToThree(pos: BT_Vector3): THREE.Vector3 {
  return new THREE.Vector3(pos[0], pos[2], pos[1]);
}

// Room wireframe
const roomGroup = new THREE.Group();

// Floor
const floorGeometry = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0x444455,
  roughness: 0.8,
  metalness: 0.2,
  side: THREE.DoubleSide
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.set(ROOM_WIDTH / 2, 0, ROOM_DEPTH / 2);
floor.receiveShadow = true;
roomGroup.add(floor);

// Room edges (wireframe box)
const roomBoxGeometry = new THREE.BoxGeometry(ROOM_WIDTH, ROOM_HEIGHT, ROOM_DEPTH);
const roomEdges = new THREE.EdgesGeometry(roomBoxGeometry);
const roomWireframe = new THREE.LineSegments(
  roomEdges,
  new THREE.LineBasicMaterial({ color: 0x88ccff, opacity: 0.8, transparent: true })
);
roomWireframe.position.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, ROOM_DEPTH / 2);
roomGroup.add(roomWireframe);

// Grid helper on floor
const gridHelper = new THREE.GridHelper(
  Math.max(ROOM_WIDTH, ROOM_DEPTH),
  Math.max(ROOM_WIDTH, ROOM_DEPTH),
  0x444466,
  0x333344
);
gridHelper.position.set(ROOM_WIDTH / 2, 0.01, ROOM_DEPTH / 2);
roomGroup.add(gridHelper);

scene.add(roomGroup);

// ============================================================================
// Source and Listener Visualization
// ============================================================================

// Source sphere (red)
const sourceGeometry = new THREE.SphereGeometry(0.15, 32, 32);
const sourceMaterial = new THREE.MeshStandardMaterial({
  color: 0xff4444,
  emissive: 0xff2222,
  emissiveIntensity: 0.3,
  roughness: 0.3,
  metalness: 0.5
});
const sourceMesh = new THREE.Mesh(sourceGeometry, sourceMaterial);
sourceMesh.position.copy(btToThree(sourcePos));
scene.add(sourceMesh);

// Source glow
const sourceGlowGeometry = new THREE.SphereGeometry(0.25, 32, 32);
const sourceGlowMaterial = new THREE.MeshBasicMaterial({
  color: 0xff4444,
  transparent: true,
  opacity: 0.2
});
const sourceGlow = new THREE.Mesh(sourceGlowGeometry, sourceGlowMaterial);
sourceGlow.position.copy(btToThree(sourcePos));
scene.add(sourceGlow);

// Listener sphere (blue)
const listenerGeometry = new THREE.SphereGeometry(0.12, 32, 32);
const listenerMaterial = new THREE.MeshStandardMaterial({
  color: 0x4488ff,
  emissive: 0x2266ff,
  emissiveIntensity: 0.3,
  roughness: 0.3,
  metalness: 0.5
});
const listenerMesh = new THREE.Mesh(listenerGeometry, listenerMaterial);
listenerMesh.position.copy(btToThree(listenerPos));
scene.add(listenerMesh);

// ============================================================================
// Reflection Paths Visualization
// ============================================================================

const pathsGroup = new THREE.Group();
scene.add(pathsGroup);

const beamsGroup = new THREE.Group();
scene.add(beamsGroup);

function clearVisualization(): void {
  // Clear paths
  while (pathsGroup.children.length > 0) {
    const child = pathsGroup.children[0];
    pathsGroup.remove(child);
    if (child instanceof THREE.Line || child instanceof THREE.Mesh) {
      (child as THREE.Mesh).geometry?.dispose();
      const mat = (child as THREE.Mesh).material;
      if (Array.isArray(mat)) mat.forEach(m => m.dispose());
      else if (mat) (mat as THREE.Material).dispose();
    }
  }

  // Clear beams
  while (beamsGroup.children.length > 0) {
    const child = beamsGroup.children[0];
    beamsGroup.remove(child);
    if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
      (child as THREE.Mesh).geometry?.dispose();
      const mat = (child as THREE.Mesh).material;
      if (Array.isArray(mat)) mat.forEach(m => m.dispose());
      else if (mat) (mat as THREE.Material).dispose();
    }
  }
}

function updatePaths(): void {
  clearVisualization();

  // Get paths from solver with timing
  const solveStart = performance.now();
  const paths = solver.getPaths(listener);
  const solveTime = performance.now() - solveStart;
  smoothedComputeTime = smoothedComputeTime * (1 - TIMING_SMOOTHING) + solveTime * TIMING_SMOOTHING;

  const metrics = solver.getMetrics();

  // Draw based on visualization mode
  const renderStart = performance.now();

  if (visualizationMode === 'beams') {
    // Draw beam cones
    const beams = solver.getBeamsForVisualization(currentReflectionOrder);
    for (const beam of beams) {
      drawBeamCone(beam);
    }
  } else {
    // Draw ray paths (default)
    for (const path of paths) {
      drawPath(path);
    }
  }

  const renderTime = performance.now() - renderStart;
  smoothedRenderTime = smoothedRenderTime * (1 - TIMING_SMOOTHING) + renderTime * TIMING_SMOOTHING;

  // Update UI
  updateUI(paths.length, metrics);
}

function drawPath(path: ReflectionPath3D): void {
  const order = getPathReflectionOrder(path);
  const colorIndex = Math.min(order, PATH_COLORS.length - 1);
  const color = PATH_COLORS[colorIndex];

  // Create points array
  const points: THREE.Vector3[] = path.map(p => btToThree(p.position));

  // Create line geometry
  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  // Line material with varying opacity based on order
  const opacity = Math.max(0.3, 0.8 - order * 0.15);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    linewidth: 2 // Note: linewidth > 1 only works on some systems
  });

  const line = new THREE.Line(geometry, material);
  pathsGroup.add(line);

  // Add small spheres at reflection points
  for (let i = 1; i < path.length - 1; i++) {
    const pointGeom = new THREE.SphereGeometry(0.03, 8, 8);
    const pointMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 });
    const pointMesh = new THREE.Mesh(pointGeom, pointMat);
    pointMesh.position.copy(btToThree(path[i].position));
    pathsGroup.add(pointMesh);
  }
}

/**
 * Draw a beam as a cone from virtual source through aperture polygon
 */
function drawBeamCone(beam: BeamVisualizationData): void {
  const colorIndex = Math.min(beam.reflectionOrder, PATH_COLORS.length - 1);
  const color = PATH_COLORS[colorIndex];
  const opacity = Math.max(0.08, 0.2 - beam.reflectionOrder * 0.03);

  const vs = btToThree(beam.virtualSource);
  const apertureVerts = beam.apertureVertices.map(v => btToThree(v));

  // Draw edges from virtual source to each aperture vertex
  for (let i = 0; i < apertureVerts.length; i++) {
    const edgeGeom = new THREE.BufferGeometry().setFromPoints([vs, apertureVerts[i]]);
    const edgeMat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: opacity * 2
    });
    beamsGroup.add(new THREE.Line(edgeGeom, edgeMat));
  }

  // Draw aperture polygon outline
  const apertureOutline = [...apertureVerts, apertureVerts[0]];
  const outlineGeom = new THREE.BufferGeometry().setFromPoints(apertureOutline);
  const outlineMat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: opacity * 3
  });
  beamsGroup.add(new THREE.Line(outlineGeom, outlineMat));

  // Draw triangular faces of the cone (from virtual source to each aperture edge)
  for (let i = 0; i < apertureVerts.length; i++) {
    const next = (i + 1) % apertureVerts.length;
    const v0 = vs;
    const v1 = apertureVerts[i];
    const v2 = apertureVerts[next];

    const faceGeom = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      v0.x, v0.y, v0.z,
      v1.x, v1.y, v1.z,
      v2.x, v2.y, v2.z
    ]);
    faceGeom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
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

  // Draw virtual source as small sphere
  const vsGeom = new THREE.SphereGeometry(0.05, 8, 8);
  const vsMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 });
  const vsMesh = new THREE.Mesh(vsGeom, vsMat);
  vsMesh.position.copy(vs);
  beamsGroup.add(vsMesh);
}

// ============================================================================
// UI Updates
// ============================================================================

/**
 * Format time for display - always in ms with appropriate precision
 */
function formatTime(ms: number): string {
  if (ms < 1) {
    return ms.toFixed(2) + ' ms';
  } else if (ms < 10) {
    return ms.toFixed(1) + ' ms';
  } else {
    return Math.round(ms) + ' ms';
  }
}

function updateUI(pathCount: number, metrics: ReturnType<typeof solver.getMetrics>): void {
  const pathCountEl = document.getElementById('pathCount');
  const raycastsEl = document.getElementById('raycasts');
  const leafNodesEl = document.getElementById('leafNodes');
  const failPlaneEl = document.getElementById('failPlane');
  const skipSphereEl = document.getElementById('skipSphere');
  const precomputeTimeEl = document.getElementById('precomputeTime');
  const computeTimeEl = document.getElementById('computeTime');
  const renderTimeEl = document.getElementById('renderTime');

  if (pathCountEl) pathCountEl.textContent = pathCount.toString();
  if (raycastsEl) raycastsEl.textContent = metrics.raycastCount.toString();
  if (leafNodesEl) leafNodesEl.textContent = metrics.totalLeafNodes.toString();

  // Fail plane: hits / (hits + misses) - shows cache effectiveness
  if (failPlaneEl) {
    const total = metrics.failPlaneCacheHits + metrics.failPlaneCacheMisses;
    if (total > 0) {
      const hitRate = Math.round((metrics.failPlaneCacheHits / total) * 100);
      failPlaneEl.textContent = `${metrics.failPlaneCacheHits} (${hitRate}%)`;
    } else {
      failPlaneEl.textContent = `${metrics.failPlaneCacheHits}`;
    }
  }

  // Skip sphere: buckets skipped / total buckets
  if (skipSphereEl) {
    if (metrics.bucketsTotal > 0) {
      const skipRate = Math.round((metrics.bucketsSkipped / metrics.bucketsTotal) * 100);
      skipSphereEl.textContent = `${metrics.bucketsSkipped}/${metrics.bucketsTotal} (${skipRate}%)`;
    } else {
      skipSphereEl.textContent = '0';
    }
  }

  if (precomputeTimeEl) precomputeTimeEl.textContent = formatTime(lastPrecomputeTime);
  if (computeTimeEl) computeTimeEl.textContent = formatTime(smoothedComputeTime);
  if (renderTimeEl) renderTimeEl.textContent = formatTime(smoothedRenderTime);

  // Update position displays
  updatePositionUI();
}

function updatePositionUI(): void {
  const sourceXEl = document.getElementById('sourceX');
  const sourceYEl = document.getElementById('sourceY');
  const sourceZEl = document.getElementById('sourceZ');
  const listenerXEl = document.getElementById('listenerX');
  const listenerYEl = document.getElementById('listenerY');
  const listenerZEl = document.getElementById('listenerZ');

  if (sourceXEl) sourceXEl.textContent = sourcePos[0].toFixed(1);
  if (sourceYEl) sourceYEl.textContent = sourcePos[1].toFixed(1);
  if (sourceZEl) sourceZEl.textContent = sourcePos[2].toFixed(2);
  if (listenerXEl) listenerXEl.textContent = listenerPos[0].toFixed(1);
  if (listenerYEl) listenerYEl.textContent = listenerPos[1].toFixed(1);
  if (listenerZEl) listenerZEl.textContent = listenerPos[2].toFixed(2);
}

function updateSourcePosition(axis: 'x' | 'y' | 'z', delta: number): void {
  const margin = 0.3;
  const idx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
  const maxVal = idx === 0 ? ROOM_WIDTH : idx === 1 ? ROOM_DEPTH : ROOM_HEIGHT;

  sourcePos[idx] = Math.max(margin, Math.min(maxVal - margin, sourcePos[idx] + delta));
  source = new Source3D(sourcePos);

  // Update visualization
  sourceMesh.position.copy(btToThree(sourcePos));
  sourceGlow.position.copy(btToThree(sourcePos));

  // Recreate solver with new source position
  recreateSolver();
  updatePaths();
}

function updateListenerPosition(axis: 'x' | 'y' | 'z', delta: number): void {
  const margin = 0.3;
  const idx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
  const maxVal = idx === 0 ? ROOM_WIDTH : idx === 1 ? ROOM_DEPTH : ROOM_HEIGHT;

  listenerPos[idx] = Math.max(margin, Math.min(maxVal - margin, listenerPos[idx] + delta));
  listener.moveTo(listenerPos);

  // Update visualization
  listenerMesh.position.copy(btToThree(listenerPos));

  // Update paths
  updatePaths();
}

// Set up coordinate button handlers
document.querySelectorAll('.coord-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const target = (btn as HTMLElement).dataset.target;
    const axis = (btn as HTMLElement).dataset.axis as 'x' | 'y' | 'z';
    const delta = parseFloat((btn as HTMLElement).dataset.delta || '0');

    if (target === 'source') {
      updateSourcePosition(axis, delta);
    } else if (target === 'listener') {
      updateListenerPosition(axis, delta);
    }
  });
});

// ============================================================================
// Interaction - Draggable Source and Listener
// ============================================================================

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Drag state
type DragTarget = 'source' | 'listener' | null;
let dragTarget: DragTarget = null;
let isMouseDown = false;
let mouseDownPos = { x: 0, y: 0 };
const DRAG_THRESHOLD = 3; // pixels - smaller for more responsive drag detection

// Throttling for performance
let lastPathUpdate = 0;
let lastUIUpdate = 0;
const PATH_UPDATE_THROTTLE = 16; // ~60fps for listener
const UI_UPDATE_THROTTLE = 50; // 20fps for UI text updates
let pendingSourceUpdate = false;

// Drag intersection point
const intersectPoint = new THREE.Vector3();

/**
 * Determine the best drag plane based on camera orientation.
 * - When looking from above (plan view), use horizontal plane (move in X/Y)
 * - When looking from side (section view), use vertical plane (move in X/Z or Y/Z)
 *
 * The key insight: we want to use a plane that is most perpendicular to the view direction.
 * This gives the most intuitive mouse-to-world mapping.
 */
function getDragPlane(targetPos: BT_Vector3): THREE.Plane {
  const cameraDir = new THREE.Vector3();
  camera.getWorldDirection(cameraDir);

  // Get camera's "up" component - how much are we looking down vs sideways?
  // cameraDir.y: -1 = looking straight down, 0 = looking horizontal, 1 = looking up
  const verticalComponent = Math.abs(cameraDir.y);

  // Threshold for switching between horizontal and vertical planes
  // Below 0.5 means camera is more horizontal than vertical
  const useHorizontalPlane = verticalComponent > 0.5;

  // Three.js coordinates: X = width, Y = height (up), Z = depth
  // BeamTrace coords:    X = width, Y = depth, Z = height (up)
  const threePos = btToThree(targetPos);

  if (useHorizontalPlane) {
    // Plan view - horizontal plane at object's height
    // Allows dragging in X and Z (world), which maps to X and Y (BeamTrace)
    return new THREE.Plane(new THREE.Vector3(0, 1, 0), -threePos.y);
  } else {
    // Section view - vertical plane perpendicular to horizontal camera direction
    // This allows dragging to change height (Y in Three.js, Z in BeamTrace)

    // Project camera direction onto XZ plane (remove vertical component)
    const horizontalDir = new THREE.Vector3(cameraDir.x, 0, cameraDir.z).normalize();

    // The plane normal should face the camera (perpendicular to view)
    // This creates a "screen-aligned" vertical plane at the object's position
    const planeNormal = horizontalDir.clone();

    // Calculate plane constant: -dot(normal, point)
    const constant = -planeNormal.dot(threePos);

    return new THREE.Plane(planeNormal, constant);
  }
}

function updateMousePosition(event: MouseEvent): void {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function getHoveredObject(): DragTarget {
  raycaster.setFromCamera(mouse, camera);

  // Check source first (larger hitbox)
  const sourceHits = raycaster.intersectObject(sourceMesh);
  if (sourceHits.length > 0) return 'source';

  const listenerHits = raycaster.intersectObject(listenerMesh);
  if (listenerHits.length > 0) return 'listener';

  return null;
}

function updateCursor(): void {
  const hovered = getHoveredObject();
  renderer.domElement.style.cursor = hovered ? 'grab' : 'default';
}

// Optimized path update - skips UI for real-time dragging
function updatePathsRealtime(skipUI: boolean = false): void {
  clearVisualization();

  // Get paths from solver with timing
  const solveStart = performance.now();
  const paths = solver.getPaths(listener);
  const solveTime = performance.now() - solveStart;
  smoothedComputeTime = smoothedComputeTime * (1 - TIMING_SMOOTHING) + solveTime * TIMING_SMOOTHING;

  // Draw based on visualization mode with timing
  const renderStart = performance.now();

  if (visualizationMode === 'beams') {
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

  // Throttle UI updates
  if (!skipUI) {
    const metrics = solver.getMetrics();
    updateUI(paths.length, metrics);
  }
}

// Deferred source update (precompute is expensive)
function scheduleSourceUpdate(): void {
  pendingSourceUpdate = true;
}

function processSourceUpdate(): void {
  if (!pendingSourceUpdate) return;
  pendingSourceUpdate = false;

  source = new Source3D(sourcePos);
  recreateSolver();
  updatePathsRealtime(false);
}

renderer.domElement.addEventListener('mousedown', (event: MouseEvent) => {
  mouseDownPos = { x: event.clientX, y: event.clientY };
  isMouseDown = true;

  updateMousePosition(event);
  const target = getHoveredObject();

  if (target) {
    dragTarget = target;
    controls.enabled = false; // Disable orbit controls while dragging
    renderer.domElement.style.cursor = 'grabbing';
  }
});

renderer.domElement.addEventListener('mousemove', (event: MouseEvent) => {
  updateMousePosition(event);

  if (!isMouseDown) {
    // Just hovering - update cursor
    updateCursor();
    return;
  }

  if (!dragTarget) {
    // Check if we've moved enough to start an orbit drag
    const dx = event.clientX - mouseDownPos.x;
    const dy = event.clientY - mouseDownPos.y;
    if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
      // Let OrbitControls handle it
    }
    return;
  }

  // Dragging source or listener - raycast to appropriate plane based on camera view
  raycaster.setFromCamera(mouse, camera);

  const currentPos = dragTarget === 'source' ? sourcePos : listenerPos;
  const plane = getDragPlane(currentPos);

  if (raycaster.ray.intersectPlane(plane, intersectPoint)) {
    const margin = 0.3;

    // Clamp intersect point to room bounds
    // Three.js: X = width, Y = height, Z = depth
    // BeamTrace: X = width, Y = depth, Z = height
    const newX = Math.max(margin, Math.min(ROOM_WIDTH - margin, intersectPoint.x));
    const newY = Math.max(margin, Math.min(ROOM_DEPTH - margin, intersectPoint.z)); // Three.js Z -> BeamTrace Y
    const newZ = Math.max(margin, Math.min(ROOM_HEIGHT - margin, intersectPoint.y)); // Three.js Y -> BeamTrace Z

    if (dragTarget === 'listener') {
      // Real-time listener updates
      listenerPos = [newX, newY, newZ];
      listener.moveTo(listenerPos);
      listenerMesh.position.set(newX, newZ, newY); // Convert back to Three.js coords

      // Throttle path updates
      const now = performance.now();
      if (now - lastPathUpdate > PATH_UPDATE_THROTTLE) {
        lastPathUpdate = now;
        updatePathsRealtime(now - lastUIUpdate < UI_UPDATE_THROTTLE);
        if (now - lastUIUpdate >= UI_UPDATE_THROTTLE) {
          lastUIUpdate = now;
        }
      }
    } else {
      // Source: update visual immediately, defer expensive precompute
      sourcePos = [newX, newY, newZ];
      sourceMesh.position.set(newX, newZ, newY); // Convert back to Three.js coords
      sourceGlow.position.set(newX, newZ, newY);
      scheduleSourceUpdate();

      // Update position display at throttled rate
      const now = performance.now();
      if (now - lastUIUpdate > UI_UPDATE_THROTTLE) {
        lastUIUpdate = now;
        updatePositionUI();
      }
    }
  }
});

renderer.domElement.addEventListener('mouseup', (event: MouseEvent) => {
  const wasDragging = dragTarget !== null;

  if (dragTarget === 'source') {
    // Process deferred source update on release
    processSourceUpdate();
  }

  dragTarget = null;
  isMouseDown = false;
  controls.enabled = true;

  updateMousePosition(event);
  updateCursor();

  // If we weren't dragging an object, check for floor click
  if (!wasDragging) {
    const dx = event.clientX - mouseDownPos.x;
    const dy = event.clientY - mouseDownPos.y;
    const didMove = Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD;

    if (!didMove) {
      // Click on floor - move listener
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

// Handle mouse leaving the canvas
renderer.domElement.addEventListener('mouseleave', () => {
  if (dragTarget === 'source') {
    processSourceUpdate();
  }
  dragTarget = null;
  isMouseDown = false;
  controls.enabled = true;
  renderer.domElement.style.cursor = 'default';
});

// ============================================================================
// Window Resize
// ============================================================================

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onWindowResize);

// ============================================================================
// Reflection Order Controls
// ============================================================================

function updateOrderUI(): void {
  const orderValueEl = document.getElementById('orderValue');
  const orderUpBtn = document.getElementById('orderUp') as HTMLButtonElement;
  const orderDownBtn = document.getElementById('orderDown') as HTMLButtonElement;

  if (orderValueEl) orderValueEl.textContent = currentReflectionOrder.toString();
  if (orderUpBtn) orderUpBtn.disabled = currentReflectionOrder >= MAX_REFLECTION_ORDER;
  if (orderDownBtn) orderDownBtn.disabled = currentReflectionOrder <= MIN_REFLECTION_ORDER;

  // Update legend to show which orders are visible
  for (let i = 0; i <= 4; i++) {
    const legendItem = document.getElementById(`legend-${i}`);
    if (legendItem) {
      // Order 4 in legend represents 4+ orders
      const orderThreshold = i === 4 ? 4 : i;
      if (orderThreshold > currentReflectionOrder) {
        legendItem.classList.add('dimmed');
      } else {
        legendItem.classList.remove('dimmed');
      }
    }
  }
}

function changeReflectionOrder(delta: number): void {
  const newOrder = currentReflectionOrder + delta;
  if (newOrder >= MIN_REFLECTION_ORDER && newOrder <= MAX_REFLECTION_ORDER) {
    currentReflectionOrder = newOrder;
    recreateSolver();
    updateOrderUI();
    updatePaths();
  }
}

// Button controls
document.getElementById('orderUp')?.addEventListener('click', (e) => {
  e.stopPropagation();
  changeReflectionOrder(1);
});

document.getElementById('orderDown')?.addEventListener('click', (e) => {
  e.stopPropagation();
  changeReflectionOrder(-1);
});

// Toggle visualization mode
function toggleVisualizationMode(): void {
  visualizationMode = visualizationMode === 'paths' ? 'beams' : 'paths';
  const toggleBtn = document.getElementById('toggleView');
  if (toggleBtn) {
    toggleBtn.textContent = visualizationMode === 'paths' ? 'Paths' : 'Beams';
  }
  updatePaths();
}

document.getElementById('toggleView')?.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleVisualizationMode();
});

// Keyboard controls
window.addEventListener('keydown', (e) => {
  if (e.key === '+' || e.key === '=' || e.key === 'ArrowUp') {
    changeReflectionOrder(1);
  } else if (e.key === '-' || e.key === '_' || e.key === 'ArrowDown') {
    changeReflectionOrder(-1);
  } else if (e.key === 'b' || e.key === 'B') {
    toggleVisualizationMode();
  }
});

// ============================================================================
// Animation Loop
// ============================================================================

let frameCount = 0;
let lastFPSUpdate = performance.now();

function animate(): void {
  requestAnimationFrame(animate);

  // Update controls
  controls.update();

  // FPS counter
  frameCount++;
  const now = performance.now();
  if (now - lastFPSUpdate >= 1000) {
    const fpsEl = document.getElementById('fps');
    if (fpsEl) fpsEl.textContent = frameCount.toString();
    frameCount = 0;
    lastFPSUpdate = now;
  }

  // Subtle source glow animation
  const scale = 1 + Math.sin(now * 0.003) * 0.1;
  sourceGlow.scale.setScalar(scale);

  renderer.render(scene, camera);
}

// ============================================================================
// Initialize
// ============================================================================

// Set initial camera position
camera.position.set(
  ROOM_WIDTH * 1.2,
  ROOM_HEIGHT * 1.5,
  ROOM_DEPTH * 1.2
);
controls.target.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 3, ROOM_DEPTH / 2);
controls.update();

// Initialize UI
updateOrderUI();
updatePositionUI();

// Initial path calculation
updatePaths();

// Start animation loop
animate();

console.log('BeamTrace3D Demo initialized');
console.log(`Room: ${ROOM_WIDTH}m x ${ROOM_DEPTH}m x ${ROOM_HEIGHT}m`);
console.log(`Max reflection order: ${MAX_REFLECTION_ORDER}`);
console.log(`Leaf nodes: ${solver.getLeafNodeCount()}`);
