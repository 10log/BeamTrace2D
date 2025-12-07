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
  getPathReflectionOrder,
  Polygon3D
} from './beamtrace3d';
import type { Vector3 as BT_Vector3, ReflectionPath3D, BeamVisualizationData } from './beamtrace3d';

// ============================================================================
// Concord Room Geometry (L-shaped room from CRAM)
// ============================================================================

/**
 * Create the Concord room geometry - an L-shaped room with 9 surfaces.
 * Dimensions approximately: 12.43m x 10.86m x 4.88m (with L-shape cutout)
 *
 * Surface names: right1, back1, right2, back2, left, front, slope, ceil, floor
 */
function createConcordRoom(): Polygon3D[] {
  const polygons: Polygon3D[] = [];

  // Surface data extracted from concord.json
  // Each surface has triangles - we convert them to Polygon3D format
  // Format: [x, y, z] triplets, every 3 vertices = 1 triangle

  const surfaces: { name: string; vertices: number[] }[] = [
    {
      // right1 - right wall (lower section)
      name: 'right1',
      vertices: [
        12.430130004882812, 2.3483328819274902, 4.876800060272217,
        12.430130004882812, 5.575300216674805, 4.876800060272217,
        12.430130004882812, 5.575300216674805, 0,
        12.430130004882812, 5.575300216674805, 0,
        12.430130004882812, 0, 0,
        12.430130004882812, 0, 2.9337000846862793,
        12.430130004882812, 0, 2.9337000846862793,
        12.430130004882812, 2.3483328819274902, 4.876800060272217,
        12.430130004882812, 5.575300216674805, 0
      ]
    },
    {
      // back1 - back wall (lower section)
      name: 'back1',
      vertices: [
        6.215065002441406, 5.575300216674805, 4.876800060272217,
        12.430130004882812, 5.575300216674805, 0,
        12.430130004882812, 5.575300216674805, 4.876800060272217,
        6.215065002441406, 5.575300216674805, 4.876800060272217,
        6.215065002441406, 5.575300216674805, 0,
        12.430130004882812, 5.575300216674805, 0
      ]
    },
    {
      // right2 - right wall (upper section of L)
      name: 'right2',
      vertices: [
        6.215065002441406, 10.855531692504883, 0,
        6.215065002441406, 5.575300216674805, 4.876800060272217,
        6.215065002441406, 10.855531692504883, 4.876800060272217,
        6.215065002441406, 10.855531692504883, 0,
        6.215065002441406, 5.575300216674805, 0,
        6.215065002441406, 5.575300216674805, 4.876800060272217
      ]
    },
    {
      // back2 - back wall (upper section)
      name: 'back2',
      vertices: [
        0, 10.855531692504883, 0,
        6.215065002441406, 10.855531692504883, 4.876800060272217,
        0, 10.855531692504883, 4.876800060272217,
        0, 10.855531692504883, 0,
        6.215065002441406, 10.855531692504883, 0,
        6.215065002441406, 10.855531692504883, 4.876800060272217
      ]
    },
    {
      // left - left wall
      name: 'left',
      vertices: [
        0, 2.3483328819274902, 4.876800060272217,
        0, 0, 0,
        0, 10.855531692504883, 0,
        0, 10.855531692504883, 0,
        0, 10.855531692504883, 4.876800060272217,
        0, 2.3483328819274902, 4.876800060272217,
        0, 2.3483328819274902, 4.876800060272217,
        0, 0, 2.9337000846862793,
        0, 0, 0
      ]
    },
    {
      // front - front wall
      name: 'front',
      vertices: [
        12.430130004882812, 0, 0,
        0, 0, 2.9337000846862793,
        12.430130004882812, 0, 2.9337000846862793,
        12.430130004882812, 0, 0,
        0, 0, 0,
        0, 0, 2.9337000846862793
      ]
    },
    {
      // slope - sloped ceiling section at front
      name: 'slope',
      vertices: [
        12.430130004882812, 0, 2.9337000846862793,
        0, 2.3483328819274902, 4.876800060272217,
        12.430130004882812, 2.3483328819274902, 4.876800060272217,
        12.430130004882812, 0, 2.9337000846862793,
        0, 0, 2.9337000846862793,
        0, 2.3483328819274902, 4.876800060272217
      ]
    },
    {
      // ceil - ceiling (L-shaped)
      name: 'ceil',
      vertices: [
        12.430130004882812, 2.3483328819274902, 4.876800060272217,
        6.215065002441406, 5.575300216674805, 4.876800060272217,
        12.430130004882812, 5.575300216674805, 4.876800060272217,
        6.215065002441406, 5.575300216674805, 4.876800060272217,
        0, 10.855531692504883, 4.876800060272217,
        6.215065002441406, 10.855531692504883, 4.876800060272217,
        12.430130004882812, 2.3483328819274902, 4.876800060272217,
        0, 2.3483328819274902, 4.876800060272217,
        6.215065002441406, 5.575300216674805, 4.876800060272217,
        6.215065002441406, 5.575300216674805, 4.876800060272217,
        0, 2.3483328819274902, 4.876800060272217,
        0, 10.855531692504883, 4.876800060272217
      ]
    },
    {
      // floor - floor (L-shaped)
      name: 'floor',
      vertices: [
        6.215065002441406, 5.575300216674805, 0,
        12.430130004882812, 0, 0,
        12.430130004882812, 5.575300216674805, 0,
        6.215065002441406, 5.575300216674805, 0,
        0, 10.855531692504883, 0,
        0, 0, 0,
        6.215065002441406, 5.575300216674805, 0,
        0, 0, 0,
        12.430130004882812, 0, 0,
        6.215065002441406, 5.575300216674805, 0,
        6.215065002441406, 10.855531692504883, 0,
        0, 10.855531692504883, 0
      ]
    }
  ];

  // Convert each surface's triangles to Polygon3D format
  for (const surface of surfaces) {
    const verts = surface.vertices;
    // Each triangle is 9 values (3 vertices * 3 components)
    for (let i = 0; i < verts.length; i += 9) {
      const triangleVerts: BT_Vector3[] = [
        [verts[i], verts[i + 1], verts[i + 2]],
        [verts[i + 3], verts[i + 4], verts[i + 5]],
        [verts[i + 6], verts[i + 7], verts[i + 8]]
      ];
      polygons.push(Polygon3D.create(triangleVerts));
    }
  }

  return polygons;
}

// ============================================================================
// Auditorium Room Geometry (from CRAM auditorium.json)
// ============================================================================

/**
 * Create the Auditorium room geometry - a fan-shaped room with sloped floor.
 * Dimensions approximately: 26m x 23m x 9m
 */
function createAuditoriumRoom(): Polygon3D[] {
  const polygons: Polygon3D[] = [];

  // Surface data extracted from auditorium.json
  // Each surface has triangles - we convert them to Polygon3D format
  // Format: [x, y, z] triplets, every 3 vertices = 1 triangle

  const surfaces: { name: string; vertices: number[] }[] = [
    {
      name: "stage-side",
      vertices: [
        3.6396543979644775, 14.278063774108887, -0.6776000261306763, 3.6396543979644775, 14.278063774108887, 0, 3.6396543979644775, -0.7260642051696777, -0.6776000261306763,
        3.6396543979644775, -0.7260642051696777, 0, 3.6396543979644775, -0.7260642051696777, -0.6776000261306763, 3.6396543979644775, 14.278063774108887, 0
      ]
    },
    {
      name: "stage-floor",
      vertices: [
        3.6396543979644775, -0.7260642051696777, 0, 3.6396543979644775, 14.278063774108887, 0, 3.388000011444092, -1.3552000522613525, 0,
        3.6396543979644775, 14.278063774108887, 0, 3.388000011444092, 14.90719985961914, 0, 3.388000011444092, -1.3552000522613525, 0,
        3.388000011444092, -1.3552000522613525, 0, 3.388000011444092, 14.90719985961914, 0, 0, 0, 0,
        0, 13.552000045776367, 0, 0, 0, 0, 3.388000011444092, 14.90719985961914, 0
      ]
    },
    {
      name: "right-wall-1",
      vertices: [
        25.27349090576172, 0, 8.243200302124023, 25.27349090576172, 0, 0.5723999738693237, 23.240692138671875, -4.500878810882568, 8.243200302124023,
        23.240692138671875, -4.500878810882568, 0.5723999738693237, 23.240692138671875, -4.500878810882568, 8.243200302124023, 25.27349090576172, 0, 0.5723999738693237
      ]
    },
    {
      name: "right-wall-2",
      vertices: [
        25.27349090576172, 13.552000045776367, 8.243200302124023, 25.27349090576172, 13.552000045776367, 0.5723999738693237, 25.951091766357422, 6.776000022888184, 8.243200302124023,
        25.951091766357422, 6.776000022888184, 0.5723999738693237, 25.951091766357422, 6.776000022888184, 8.243200302124023, 25.27349090576172, 13.552000045776367, 0.5723999738693237
      ]
    },
    {
      name: "right-wall-3",
      vertices: [
        25.951091766357422, 6.776000022888184, 8.243200302124023, 25.951091766357422, 6.776000022888184, 0.5723999738693237, 25.27349090576172, 0, 8.243200302124023,
        25.27349090576172, 0, 0.5723999738693237, 25.27349090576172, 0, 8.243200302124023, 25.951091766357422, 6.776000022888184, 0.5723999738693237
      ]
    },
    {
      name: "left-wall-1",
      vertices: [
        23.240692138671875, 18.052879333496094, 8.243200302124023, 23.240692138671875, 18.052879333496094, 0.5723999738693237, 25.27349090576172, 13.552000045776367, 8.243200302124023,
        25.27349090576172, 13.552000045776367, 0.5723999738693237, 25.27349090576172, 13.552000045776367, 8.243200302124023, 23.240692138671875, 18.052879333496094, 0.5723999738693237
      ]
    },
    {
      name: "audience-floor-1",
      vertices: [
        25.951091766357422, 6.776000022888184, 0.5723999738693237, 25.27349090576172, 13.552000045776367, 0.5723999738693237, 25.27349090576172, 0, 0.5723999738693237,
        25.27349090576172, 13.552000045776367, 0.5723999738693237, 23.240692138671875, 18.052879333496094, 0.5723999738693237, 25.27349090576172, 0, 0.5723999738693237,
        23.240692138671875, -4.500878810882568, 0.5723999738693237, 25.27349090576172, 0, 0.5723999738693237, 23.240692138671875, 18.052879333496094, 0.5723999738693237
      ]
    },
    {
      name: "audience-floor-2",
      vertices: [
        13.076691627502441, -4.500878810882568, 0.07240000367164612, 13.076691627502441, 18.052879333496094, 0.07240000367164612, 3.6396543979644775, -0.7260642051696777, -0.6776000261306763,
        3.6396543979644775, 14.278063774108887, -0.6776000261306763, 3.6396543979644775, -0.7260642051696777, -0.6776000261306763, 13.076691627502441, 18.052879333496094, 0.07240000367164612
      ]
    },
    {
      name: "audience-floor-3",
      vertices: [
        23.240692138671875, -4.500878810882568, 0.5723999738693237, 23.240692138671875, 18.052879333496094, 0.5723999738693237, 13.076691627502441, -4.500878810882568, 0.07240000367164612,
        13.076691627502441, 18.052879333496094, 0.07240000367164612, 13.076691627502441, -4.500878810882568, 0.07240000367164612, 23.240692138671875, 18.052879333496094, 0.5723999738693237
      ]
    },
    {
      name: "front-wall-1",
      vertices: [
        13.076691627502441, -4.500878810882568, 7.493199825286865, 13.076691627502441, -4.500878810882568, 0.07240000367164612, 3.6396543979644775, -0.7260642051696777, 4.743199825286865,
        3.6396543979644775, -0.7260642051696777, 4.743199825286865, 13.076691627502441, -4.500878810882568, 0.07240000367164612, 3.6396543979644775, -0.7260642051696777, 0,
        3.6396543979644775, -0.7260642051696777, -0.6776000261306763, 3.6396543979644775, -0.7260642051696777, 0, 13.076691627502441, -4.500878810882568, 0.07240000367164612
      ]
    },
    {
      name: "back-wall-1",
      vertices: [
        15.076691627502441, 18.052879333496094, 8.243200302124023, 13.076691627502441, 18.052879333496094, 7.493199825286865, 23.240692138671875, 18.052879333496094, 8.243200302124023,
        23.240692138671875, 18.052879333496094, 8.243200302124023, 13.076691627502441, 18.052879333496094, 7.493199825286865, 23.240692138671875, 18.052879333496094, 0.5723999738693237,
        13.076691627502441, 18.052879333496094, 0.07240000367164612, 23.240692138671875, 18.052879333496094, 0.5723999738693237, 13.076691627502441, 18.052879333496094, 7.493199825286865
      ]
    },
    {
      name: "back-wall-2",
      vertices: [
        13.076691627502441, 18.052879333496094, 7.493199825286865, 3.6396543979644775, 14.278063774108887, 4.743199825286865, 13.076691627502441, 18.052879333496094, 0.07240000367164612,
        3.6396543979644775, 14.278063774108887, 4.743199825286865, 3.6396543979644775, 14.278063774108887, 0, 13.076691627502441, 18.052879333496094, 0.07240000367164612,
        3.6396543979644775, 14.278063774108887, -0.6776000261306763, 13.076691627502441, 18.052879333496094, 0.07240000367164612, 3.6396543979644775, 14.278063774108887, 0
      ]
    },
    {
      name: "front-wall-2",
      vertices: [
        15.076691627502441, -4.500878810882568, 8.243200302124023, 23.240692138671875, -4.500878810882568, 8.243200302124023, 13.076691627502441, -4.500878810882568, 7.493199825286865,
        23.240692138671875, -4.500878810882568, 8.243200302124023, 23.240692138671875, -4.500878810882568, 0.5723999738693237, 13.076691627502441, -4.500878810882568, 7.493199825286865,
        13.076691627502441, -4.500878810882568, 0.07240000367164612, 13.076691627502441, -4.500878810882568, 7.493199825286865, 23.240692138671875, -4.500878810882568, 0.5723999738693237
      ]
    },
    {
      name: "ceiling",
      vertices: [
        25.951091766357422, 6.776000022888184, 8.243200302124023, 25.27349090576172, 0, 8.243200302124023, 25.27349090576172, 13.552000045776367, 8.243200302124023,
        25.27349090576172, 13.552000045776367, 8.243200302124023, 25.27349090576172, 0, 8.243200302124023, 23.240692138671875, 18.052879333496094, 8.243200302124023,
        25.27349090576172, 0, 8.243200302124023, 23.240692138671875, -4.500878810882568, 8.243200302124023, 23.240692138671875, 18.052879333496094, 8.243200302124023,
        23.240692138671875, 18.052879333496094, 8.243200302124023, 23.240692138671875, -4.500878810882568, 8.243200302124023, 15.076691627502441, 18.052879333496094, 8.243200302124023,
        15.076691627502441, -4.500878810882568, 8.243200302124023, 15.076691627502441, 18.052879333496094, 8.243200302124023, 23.240692138671875, -4.500878810882568, 8.243200302124023
      ]
    },
    {
      name: "stage-back-1",
      vertices: [
        0, 0, 4.743199825286865, 3.388000011444092, -1.3552000522613525, 4.743199825286865, 0, 0, 0,
        3.388000011444092, -1.3552000522613525, 0, 0, 0, 0, 3.388000011444092, -1.3552000522613525, 4.743199825286865
      ]
    },
    {
      name: "stage-back-2",
      vertices: [
        3.388000011444092, 14.90719985961914, 4.743199825286865, 0, 13.552000045776367, 4.743199825286865, 3.388000011444092, 14.90719985961914, 0,
        0, 13.552000045776367, 0, 3.388000011444092, 14.90719985961914, 0, 0, 13.552000045776367, 4.743199825286865
      ]
    },
    {
      name: "stage-side-1",
      vertices: [
        3.6396543979644775, -0.7260642051696777, 4.743199825286865, 3.6396543979644775, -0.7260642051696777, 0, 3.388000011444092, -1.3552000522613525, 4.743199825286865,
        3.388000011444092, -1.3552000522613525, 0, 3.388000011444092, -1.3552000522613525, 4.743199825286865, 3.6396543979644775, -0.7260642051696777, 0
      ]
    },
    {
      name: "stage-side-2",
      vertices: [
        3.388000011444092, 14.90719985961914, 4.743199825286865, 3.388000011444092, 14.90719985961914, 0, 3.6396543979644775, 14.278063774108887, 4.743199825286865,
        3.6396543979644775, 14.278063774108887, 0, 3.6396543979644775, 14.278063774108887, 4.743199825286865, 3.388000011444092, 14.90719985961914, 0
      ]
    },
    {
      name: "back-wall",
      vertices: [
        0, 13.552000045776367, 0, 0, 13.552000045776367, 4.743199825286865, 0, 0, 0,
        0, 0, 4.743199825286865, 0, 0, 0, 0, 13.552000045776367, 4.743199825286865
      ]
    },
    {
      name: "stage-ceiling",
      vertices: [
        3.6396543979644775, 14.278063774108887, 4.743199825286865, 3.6396543979644775, -0.7260642051696777, 4.743199825286865, 3.388000011444092, 14.90719985961914, 4.743199825286865,
        3.6396543979644775, -0.7260642051696777, 4.743199825286865, 3.388000011444092, -1.3552000522613525, 4.743199825286865, 3.388000011444092, 14.90719985961914, 4.743199825286865,
        3.388000011444092, 14.90719985961914, 4.743199825286865, 3.388000011444092, -1.3552000522613525, 4.743199825286865, 0, 13.552000045776367, 4.743199825286865,
        0, 0, 4.743199825286865, 0, 13.552000045776367, 4.743199825286865, 3.388000011444092, -1.3552000522613525, 4.743199825286865
      ]
    },
    {
      name: "ceiling-slope",
      vertices: [
        15.076691627502441, 18.052879333496094, 8.243200302124023, 15.076691627502441, -4.500878810882568, 8.243200302124023, 13.076691627502441, 18.052879333496094, 7.493199825286865,
        13.076691627502441, -4.500878810882568, 7.493199825286865, 13.076691627502441, 18.052879333496094, 7.493199825286865, 15.076691627502441, -4.500878810882568, 8.243200302124023
      ]
    },
    {
      name: "ceiling-slope-2",
      vertices: [
        13.076691627502441, 18.052879333496094, 7.493199825286865, 13.076691627502441, -4.500878810882568, 7.493199825286865, 3.6396543979644775, 14.278063774108887, 4.743199825286865,
        3.6396543979644775, -0.7260642051696777, 4.743199825286865, 3.6396543979644775, 14.278063774108887, 4.743199825286865, 13.076691627502441, -4.500878810882568, 7.493199825286865
      ]
    }
  ];

  // Convert each surface's triangles to Polygon3D format
  for (const surface of surfaces) {
    const verts = surface.vertices;
    // Each triangle is 9 values (3 vertices * 3 components)
    for (let i = 0; i < verts.length; i += 9) {
      const triangleVerts: BT_Vector3[] = [
        [verts[i], verts[i + 1], verts[i + 2]],
        [verts[i + 3], verts[i + 4], verts[i + 5]],
        [verts[i + 6], verts[i + 7], verts[i + 8]]
      ];
      polygons.push(Polygon3D.create(triangleVerts));
    }
  }

  return polygons;
}

// ============================================================================
// Configuration
// ============================================================================

// Room type selection
type RoomType = 'concord' | 'shoebox' | 'auditorium';
let currentRoomType: RoomType = 'concord';

// Room dimensions - will be set based on room type
let ROOM_WIDTH = 12.43;   // X dimension (meters)
let ROOM_DEPTH = 10.86;   // Y dimension (meters)
let ROOM_HEIGHT = 4.88;   // Z dimension (meters)

// Shoebox room default dimensions
const SHOEBOX_WIDTH = 10;
const SHOEBOX_DEPTH = 8;
const SHOEBOX_HEIGHT = 3;
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
let roomPolygons = createConcordRoom();

// Source position - from Concord save file: [3.7, 9.9, 1]
let sourcePos: BT_Vector3 = [3.7, 9.9, 1.0];
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

// Listener position - from Concord save file: [10.8, 3.8, 1.2]
let listenerPos: BT_Vector3 = [10.8, 3.8, 1.2];
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

// Floor mesh reference (will be recreated on room change)
let floor: THREE.Mesh;
const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0x444455,
  roughness: 0.8,
  metalness: 0.2,
  side: THREE.DoubleSide
});

/**
 * Build the room visualization for Concord (L-shaped) room
 */
function buildConcordRoomVisuals(): void {
  // L-shaped floor for Concord room
  const floorShape = new THREE.Shape();
  floorShape.moveTo(0, 0);
  floorShape.lineTo(12.43, 0);
  floorShape.lineTo(12.43, 5.575);
  floorShape.lineTo(6.215, 5.575);
  floorShape.lineTo(6.215, 10.856);
  floorShape.lineTo(0, 10.856);
  floorShape.lineTo(0, 0);

  const floorGeometry = new THREE.ShapeGeometry(floorShape);
  floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  roomGroup.add(floor);

  // Draw room edges as lines for the L-shape
  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x88ccff, opacity: 0.8, transparent: true });

  // Floor outline
  const floorOutline = [
    [0, 0, 0], [12.43, 0, 0], [12.43, 5.575, 0], [6.215, 5.575, 0],
    [6.215, 10.856, 0], [0, 10.856, 0], [0, 0, 0]
  ];
  const floorPoints = floorOutline.map(p => btToThree(p as BT_Vector3));
  const floorLineGeom = new THREE.BufferGeometry().setFromPoints(floorPoints);
  roomGroup.add(new THREE.Line(floorLineGeom, edgeMaterial));

  // Ceiling outline
  const ceilHeight = 4.877;
  const ceilOutline = [
    [0, 2.348, ceilHeight], [12.43, 2.348, ceilHeight], [12.43, 5.575, ceilHeight],
    [6.215, 5.575, ceilHeight], [6.215, 10.856, ceilHeight], [0, 10.856, ceilHeight],
    [0, 2.348, ceilHeight]
  ];
  const ceilPoints = ceilOutline.map(p => btToThree(p as BT_Vector3));
  const ceilLineGeom = new THREE.BufferGeometry().setFromPoints(ceilPoints);
  roomGroup.add(new THREE.Line(ceilLineGeom, edgeMaterial));

  // Vertical edges at corners
  const verticalEdges = [
    [[0, 0, 0], [0, 0, 2.934]],
    [[0, 0, 2.934], [0, 2.348, ceilHeight]],
    [[12.43, 0, 0], [12.43, 0, 2.934]],
    [[12.43, 0, 2.934], [12.43, 2.348, ceilHeight]],
    [[12.43, 5.575, 0], [12.43, 5.575, ceilHeight]],
    [[6.215, 5.575, 0], [6.215, 5.575, ceilHeight]],
    [[6.215, 10.856, 0], [6.215, 10.856, ceilHeight]],
    [[0, 10.856, 0], [0, 10.856, ceilHeight]],
    [[0, 2.348, ceilHeight], [0, 10.856, ceilHeight]],
  ];
  verticalEdges.forEach(([p1, p2]) => {
    const points = [btToThree(p1 as BT_Vector3), btToThree(p2 as BT_Vector3)];
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    roomGroup.add(new THREE.Line(geom, edgeMaterial));
  });

  // Front slope edge
  const slopeEdge = [[0, 0, 2.934], [12.43, 0, 2.934]];
  const slopePoints = slopeEdge.map(p => btToThree(p as BT_Vector3));
  const slopeGeom = new THREE.BufferGeometry().setFromPoints(slopePoints);
  roomGroup.add(new THREE.Line(slopeGeom, edgeMaterial));
}

/**
 * Build the room visualization for Shoebox room
 */
function buildShoeboxRoomVisuals(): void {
  const floorGeometry = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
  floor = new THREE.Mesh(floorGeometry, floorMaterial);
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
}

/**
 * Build the room visualization for Auditorium (fan-shaped with stage)
 */
function buildAuditoriumRoomVisuals(): void {
  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x88ccff, opacity: 0.8, transparent: true });

  // Build floor from the auditorium geometry
  // The auditorium has a sloped audience floor and a flat stage
  // We'll create a simplified floor visualization

  // Stage floor (flat, near origin)
  const stageFloorGeom = new THREE.PlaneGeometry(3.5, 16);
  const stageMesh = new THREE.Mesh(stageFloorGeom, floorMaterial.clone());
  stageMesh.material.color.setHex(0x554455); // Slightly different color for stage
  stageMesh.rotation.x = -Math.PI / 2;
  stageMesh.position.set(1.75, 0, 6.776); // Center of stage area
  roomGroup.add(stageMesh);

  // Main audience floor - simplified as a large plane (actual geometry is sloped)
  // Audience area spans from ~3.6 to ~26 in X, -4.5 to 18 in Y
  const audienceFloorGeom = new THREE.PlaneGeometry(22, 23);
  floor = new THREE.Mesh(audienceFloorGeom, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(14.5, 0.3, 6.776); // Center of audience area, slightly elevated
  floor.receiveShadow = true;
  roomGroup.add(floor);

  // Draw major boundary edges for the auditorium shape
  // Fan-shaped outline with stage

  // Stage area edges
  const stageOutline: [number, number, number][] = [
    [0, 0, 0], [0, 13.552, 0], [3.388, 14.907, 0], [3.64, 14.278, 0],
    [3.64, -0.726, 0], [3.388, -1.355, 0], [0, 0, 0]
  ];
  const stagePoints = stageOutline.map(p => btToThree(p as BT_Vector3));
  const stageLineGeom = new THREE.BufferGeometry().setFromPoints(stagePoints);
  roomGroup.add(new THREE.Line(stageLineGeom, edgeMaterial));

  // Main audience area floor boundary (fan shape)
  const audienceOutline: [number, number, number][] = [
    [3.64, -0.726, 0], [3.64, 14.278, 0],
    [13.077, 18.053, 0.072], [23.24, 18.053, 0.572],
    [25.27, 13.552, 0.572], [25.95, 6.776, 0.572],
    [25.27, 0, 0.572], [23.24, -4.5, 0.572],
    [13.077, -4.5, 0.072], [3.64, -0.726, 0]
  ];
  const audiencePoints = audienceOutline.map(p => btToThree(p as BT_Vector3));
  const audienceLineGeom = new THREE.BufferGeometry().setFromPoints(audiencePoints);
  roomGroup.add(new THREE.Line(audienceLineGeom, edgeMaterial));

  // Ceiling outline at height ~8.24m (flat section) and ~4.74m (stage ceiling)
  const ceilingOutline: [number, number, number][] = [
    [0, 0, 4.743], [0, 13.552, 4.743], [3.388, 14.907, 4.743], [3.64, 14.278, 4.743],
    [13.077, 18.053, 7.493], [15.077, 18.053, 8.243],
    [23.24, 18.053, 8.243], [25.27, 13.552, 8.243], [25.95, 6.776, 8.243],
    [25.27, 0, 8.243], [23.24, -4.5, 8.243], [15.077, -4.5, 8.243],
    [13.077, -4.5, 7.493], [3.64, -0.726, 4.743], [3.388, -1.355, 4.743],
    [0, 0, 4.743]
  ];
  const ceilingPoints = ceilingOutline.map(p => btToThree(p as BT_Vector3));
  const ceilingLineGeom = new THREE.BufferGeometry().setFromPoints(ceilingPoints);
  roomGroup.add(new THREE.Line(ceilingLineGeom, edgeMaterial));

  // Vertical edges at key corners
  const verticalEdges: [[number, number, number], [number, number, number]][] = [
    [[0, 0, 0], [0, 0, 4.743]],
    [[0, 13.552, 0], [0, 13.552, 4.743]],
    [[3.388, 14.907, 0], [3.388, 14.907, 4.743]],
    [[3.388, -1.355, 0], [3.388, -1.355, 4.743]],
    [[3.64, 14.278, 0], [3.64, 14.278, 4.743]],
    [[3.64, -0.726, 0], [3.64, -0.726, 4.743]],
    [[13.077, 18.053, 0.072], [13.077, 18.053, 7.493]],
    [[13.077, -4.5, 0.072], [13.077, -4.5, 7.493]],
    [[23.24, 18.053, 0.572], [23.24, 18.053, 8.243]],
    [[23.24, -4.5, 0.572], [23.24, -4.5, 8.243]],
    [[25.27, 13.552, 0.572], [25.27, 13.552, 8.243]],
    [[25.27, 0, 0.572], [25.27, 0, 8.243]],
    [[25.95, 6.776, 0.572], [25.95, 6.776, 8.243]],
  ];
  verticalEdges.forEach(([p1, p2]) => {
    const points = [btToThree(p1 as BT_Vector3), btToThree(p2 as BT_Vector3)];
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    roomGroup.add(new THREE.Line(geom, edgeMaterial));
  });

  // Sloped ceiling edges connecting stage ceiling to main ceiling
  const slopedEdges: [[number, number, number], [number, number, number]][] = [
    [[3.64, 14.278, 4.743], [13.077, 18.053, 7.493]],
    [[3.64, -0.726, 4.743], [13.077, -4.5, 7.493]],
    [[13.077, 18.053, 7.493], [15.077, 18.053, 8.243]],
    [[13.077, -4.5, 7.493], [15.077, -4.5, 8.243]],
  ];
  slopedEdges.forEach(([p1, p2]) => {
    const points = [btToThree(p1 as BT_Vector3), btToThree(p2 as BT_Vector3)];
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    roomGroup.add(new THREE.Line(geom, edgeMaterial));
  });
}

/**
 * Clear all objects from the room group (except grid)
 */
function clearRoomVisuals(): void {
  // Remove all children except we'll rebuild everything
  while (roomGroup.children.length > 0) {
    const child = roomGroup.children[0];
    roomGroup.remove(child);
    if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.LineSegments) {
      (child as THREE.Mesh).geometry?.dispose();
    }
  }
}

/**
 * Switch to a different room type
 */
function switchRoom(roomType: RoomType): void {
  if (roomType === currentRoomType) return;

  currentRoomType = roomType;

  // Update dimensions based on room type
  if (roomType === 'concord') {
    ROOM_WIDTH = 12.43;
    ROOM_DEPTH = 10.86;
    ROOM_HEIGHT = 4.88;
    roomPolygons = createConcordRoom();
    sourcePos = [3.7, 9.9, 1.0];
    listenerPos = [10.8, 3.8, 1.2];
  } else if (roomType === 'auditorium') {
    ROOM_WIDTH = 26;
    ROOM_DEPTH = 23;
    ROOM_HEIGHT = 8.25;
    roomPolygons = createAuditoriumRoom();
    // Source on stage, listener in audience
    sourcePos = [1.5, 6.8, 1.5];
    listenerPos = [18, 6.8, 1.5];
  } else {
    ROOM_WIDTH = SHOEBOX_WIDTH;
    ROOM_DEPTH = SHOEBOX_DEPTH;
    ROOM_HEIGHT = SHOEBOX_HEIGHT;
    roomPolygons = createShoeboxRoom(ROOM_WIDTH, ROOM_DEPTH, ROOM_HEIGHT);
    sourcePos = [ROOM_WIDTH * 0.7, ROOM_DEPTH * 0.6, 1.5];
    listenerPos = [ROOM_WIDTH * 0.3, ROOM_DEPTH * 0.3, 1.2];
  }

  // Update source and listener
  source = new Source3D(sourcePos);
  listener.moveTo(listenerPos);

  // Update mesh positions
  sourceMesh.position.copy(btToThree(sourcePos));
  sourceGlow.position.copy(btToThree(sourcePos));
  listenerMesh.position.copy(btToThree(listenerPos));

  // Rebuild room visuals
  clearRoomVisuals();
  if (roomType === 'concord') {
    buildConcordRoomVisuals();
  } else if (roomType === 'auditorium') {
    buildAuditoriumRoomVisuals();
  } else {
    buildShoeboxRoomVisuals();
  }

  // Rebuild grid
  const gridHelper = new THREE.GridHelper(
    Math.max(ROOM_WIDTH, ROOM_DEPTH),
    Math.max(ROOM_WIDTH, ROOM_DEPTH),
    0x444466,
    0x333344
  );
  gridHelper.position.set(ROOM_WIDTH / 2, 0.01, ROOM_DEPTH / 2);
  roomGroup.add(gridHelper);

  // Update camera to fit new room
  camera.position.set(
    ROOM_WIDTH * 1.2,
    ROOM_HEIGHT * 1.5,
    ROOM_DEPTH * 1.2
  );
  controls.target.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 3, ROOM_DEPTH / 2);
  controls.update();

  // Recreate solver and update paths
  recreateSolver();
  updatePaths();

  const roomNames: Record<RoomType, string> = {
    'concord': 'Concord (L-shaped)',
    'shoebox': 'Shoebox',
    'auditorium': 'Auditorium (fan-shaped)'
  };
  console.log(`Switched to ${roomNames[roomType]} room`);
}

// Build initial room visuals
buildConcordRoomVisuals();

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

// Room selector handler
document.getElementById('roomSelect')?.addEventListener('change', (e) => {
  const select = e.target as HTMLSelectElement;
  switchRoom(select.value as RoomType);
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
console.log(`Room: ${currentRoomType === 'concord' ? 'Concord (L-shaped)' : 'Shoebox'} - ${ROOM_WIDTH.toFixed(2)}m x ${ROOM_DEPTH.toFixed(2)}m x ${ROOM_HEIGHT.toFixed(2)}m`);
console.log(`Polygons: ${roomPolygons.length}`);
console.log(`Max reflection order: ${MAX_REFLECTION_ORDER}`);
console.log(`Leaf nodes: ${solver.getLeafNodeCount()}`);
