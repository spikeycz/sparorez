import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Box, Typography, IconButton, Paper, Tooltip, Chip, Divider } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CameraIcon from '@mui/icons-material/CameraAlt';
import { Button } from '@mui/material';
import type { Room, Wall, TileConfig } from '../types';
import { createTileCanvasFromLayout, createTileCanvas, loadImage } from '../utils/tileTexture';
import { calculateTileLayout, calculateFloorLayout, getCornerGeberitObstacles } from '../utils/tileLayout';
import { getEffectiveDimensions } from '../utils/effectiveDimensions';

const CM = 0.01;

function makeTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

async function makeWallTexture(
  wall: Wall, roomHeight: number,
  effectiveWidth?: number, effectiveHeight?: number,
  cornerObstacles?: import('../utils/tileLayout').CornerObstacle[],
): Promise<THREE.CanvasTexture> {
  const decorImg = wall.tileConfig?.decorImage ? await loadImage(wall.tileConfig.decorImage).catch(() => null) : null;
  const effW = effectiveWidth ?? wall.width;
  const effH = effectiveHeight ?? roomHeight;
  try {
    const layout = calculateTileLayout(wall, effW, effH, cornerObstacles);
    if (layout && wall.tileConfig) {
      return makeTexture(createTileCanvasFromLayout(layout.tiles, effW, effH, wall.tileConfig.color, decorImg));
    }
  } catch { /* fallback */ }
  return makeTexture(createTileCanvas(wall.tileConfig, effW, effH, decorImg));
}

async function makeFloorTexture(room: Room): Promise<THREE.CanvasTexture> {
  const dims = getEffectiveDimensions(room);
  const effW = dims.floor.width;
  const effD = dims.floor.depth;
  const decorImg = room.floorTileConfig?.decorImage ? await loadImage(room.floorTileConfig.decorImage).catch(() => null) : null;
  try {
    const result = calculateFloorLayout(room, effW, effD);
    if (result && room.floorTileConfig) {
      return makeTexture(createTileCanvasFromLayout(result.layout.tiles, effW, effD, room.floorTileConfig.color, decorImg));
    }
  } catch { /* fallback */ }
  return makeTexture(createTileCanvas(room.floorTileConfig, effW, effD, decorImg));
}

function createConcreteTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#c8c4be';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 40000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const gray = 160 + Math.random() * 50;
    const alpha = 0.05 + Math.random() * 0.12;
    ctx.fillStyle = `rgba(${gray},${gray - 5},${gray - 10},${alpha})`;
    ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 10 + Math.random() * 30;
    const gray = 170 + Math.random() * 40;
    ctx.fillStyle = `rgba(${gray},${gray - 3},${gray - 8},0.08)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface WallMeshInfo {
  group: THREE.Group;
  wallId: string;
  side: 'top' | 'right' | 'bottom' | 'left';
}

interface SceneResult {
  scene: THREE.Scene;
  wallMeshes: WallMeshInfo[];
}

async function buildScene(room: Room, showCeiling: boolean): Promise<SceneResult> {
  const scene = new THREE.Scene();
  const wallMeshes: WallMeshInfo[] = [];
  const rW = room.width * CM;
  const rD = room.depth * CM;
  const hM = room.height * CM;

  // Lights — warm bathroom mood
  scene.add(new THREE.AmbientLight(0xfff8f0, 0.25));

  for (const frac of [1 / 3, 2 / 3]) {
    const z = rD / 2 - frac * rD;
    const spot = new THREE.SpotLight(0xffe8cc, 2.5, hM * 2.5, Math.PI / 4, 0.6, 1.2);
    spot.position.set(0, hM - 0.01, z);
    spot.target.position.set(0, 0, z);
    scene.add(spot);
    scene.add(spot.target);
  }

  const fill = new THREE.HemisphereLight(0xffffff, 0xe0d8d0, 0.35);
  scene.add(fill);

  // Ground — concrete texture
  const groundGeo = new THREE.PlaneGeometry(10, 10);
  const concreteTex = createConcreteTexture();
  const groundMat = new THREE.MeshStandardMaterial({ map: concreteTex, roughness: 0.9 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.005;
  scene.add(ground);

  // Floor
  const floorTex = await makeFloorTexture(room);
  const floorGeo = new THREE.PlaneGeometry(rW, rD);
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, side: THREE.DoubleSide });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // Ceiling
  if (showCeiling) {
    const ceilGeo = new THREE.PlaneGeometry(rW, rD);
    const ceilMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const ceil = new THREE.Mesh(ceilGeo, ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = hM;
    scene.add(ceil);
  }

  // Walls
  const dims = getEffectiveDimensions(room);
  for (let wallIdx = 0; wallIdx < room.walls.length; wallIdx++) {
    const wall = room.walls[wallIdx];
    const effW = dims.walls[wallIdx]?.width ?? wall.width;
    const effH = dims.walls[wallIdx]?.height ?? wall.height;
    const cornerObs = getCornerGeberitObstacles(room, wallIdx, effW, effH);
    const wM = wall.width * CM;
    const tex = await makeWallTexture(wall, room.height, effW, effH, cornerObs);

    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(wM, 0);
    shape.lineTo(wM, hM);
    shape.lineTo(0, hM);
    shape.closePath();

    for (const door of wall.doors) {
      const dx = door.offsetFromLeft * CM;
      const dw = door.width * CM;
      const dh = door.height * CM;
      const hole = new THREE.Path();
      hole.moveTo(dx, 0);
      hole.lineTo(dx + dw, 0);
      hole.lineTo(dx + dw, dh);
      hole.lineTo(dx, dh);
      hole.closePath();
      shape.holes.push(hole);
    }

    for (const n of wall.niches ?? []) {
      const nx = n.offsetFromLeft * CM;
      const ny = n.offsetFromBottom * CM;
      const nw = n.width * CM;
      const nh = n.height * CM;
      const hole = new THREE.Path();
      hole.moveTo(nx, ny);
      hole.lineTo(nx + nw, ny);
      hole.lineTo(nx + nw, ny + nh);
      hole.lineTo(nx, ny + nh);
      hole.closePath();
      shape.holes.push(hole);
    }

    const geo = new THREE.ShapeGeometry(shape);
    const pos = geo.attributes.position;
    const uvs = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uvs[i * 2] = pos.getX(i) / wM;
      uvs[i * 2 + 1] = pos.getY(i) / hM;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    const matInner = new THREE.MeshStandardMaterial({ map: tex, side: THREE.FrontSide });
    const meshInner = new THREE.Mesh(geo, matInner);

    const geoOuter = geo.clone();
    const matOuter = new THREE.MeshStandardMaterial({ color: 0xd8dce0, side: THREE.BackSide });
    const meshOuter = new THREE.Mesh(geoOuter, matOuter);

    const group = new THREE.Group();
    group.add(meshInner);
    group.add(meshOuter);

    switch (wall.side) {
      case 'top':
        group.position.set(-rW / 2, 0, -rD / 2);
        break;
      case 'right':
        group.position.set(rW / 2, 0, -rD / 2);
        group.rotation.y = -Math.PI / 2;
        break;
      case 'bottom':
        group.position.set(rW / 2, 0, rD / 2);
        group.rotation.y = Math.PI;
        break;
      case 'left':
        group.position.set(-rW / 2, 0, rD / 2);
        group.rotation.y = Math.PI / 2;
        break;
    }

    scene.add(group);
    wallMeshes.push({ group, wallId: wall.id, side: wall.side });
  }

  // Geberits
  for (const wall of room.walls) {
    for (const g of wall.geberits) {
      const gW = g.width * CM;
      const gH = g.height * CM;
      const gD = g.depth * CM;
      const offsetM = g.offsetFromLeft * CM;

      let boxArgs: [number, number, number];
      let px: number, py: number, pz: number;

      switch (wall.side) {
        case 'top':
          boxArgs = [gW, gH, gD];
          px = -rW / 2 + offsetM + gW / 2; py = gH / 2; pz = -rD / 2 + gD / 2;
          break;
        case 'right':
          boxArgs = [gD, gH, gW];
          px = rW / 2 - gD / 2; py = gH / 2; pz = -rD / 2 + offsetM + gW / 2;
          break;
        case 'bottom':
          boxArgs = [gW, gH, gD];
          px = rW / 2 - offsetM - gW / 2; py = gH / 2; pz = rD / 2 - gD / 2;
          break;
        case 'left':
        default:
          boxArgs = [gD, gH, gW];
          px = -rW / 2 + gD / 2; py = gH / 2; pz = rD / 2 - offsetM - gW / 2;
          break;
      }

      const tc = g.tileConfig || wall.tileConfig;
      const gDecorImg = tc?.decorImage ? await loadImage(tc.decorImage).catch(() => null) : null;
      const faceTex = makeTexture(createTileCanvas(tc, g.width, g.height, gDecorImg));
      const sideTex = makeTexture(createTileCanvas(tc, g.depth, g.height, gDecorImg));
      const topTex = makeTexture(createTileCanvas(tc, g.width, g.depth, gDecorImg));

      const geo = new THREE.BoxGeometry(...boxArgs);
      let mats: THREE.MeshStandardMaterial[];
      if (wall.side === 'top' || wall.side === 'bottom') {
        mats = [
          new THREE.MeshStandardMaterial({ map: sideTex, side: THREE.DoubleSide }),
          new THREE.MeshStandardMaterial({ map: sideTex, side: THREE.DoubleSide }),
          new THREE.MeshStandardMaterial({ map: topTex, side: THREE.DoubleSide }),
          new THREE.MeshStandardMaterial({ map: topTex, side: THREE.DoubleSide }),
          new THREE.MeshStandardMaterial({ map: faceTex, side: THREE.DoubleSide }),
          new THREE.MeshStandardMaterial({ map: faceTex, side: THREE.DoubleSide }),
        ];
      } else {
        mats = [
          new THREE.MeshStandardMaterial({ map: faceTex, side: THREE.DoubleSide }),
          new THREE.MeshStandardMaterial({ map: faceTex, side: THREE.DoubleSide }),
          new THREE.MeshStandardMaterial({ map: topTex, side: THREE.DoubleSide }),
          new THREE.MeshStandardMaterial({ map: topTex, side: THREE.DoubleSide }),
          new THREE.MeshStandardMaterial({ map: sideTex, side: THREE.DoubleSide }),
          new THREE.MeshStandardMaterial({ map: sideTex, side: THREE.DoubleSide }),
        ];
      }
      const mesh = new THREE.Mesh(geo, mats);
      mesh.position.set(px, py, pz);
      scene.add(mesh);
    }
  }

  // Niches
  for (const wall of room.walls) {
    for (const n of wall.niches ?? []) {
      const nW = n.width * CM;
      const nH = n.height * CM;
      const nD = n.depth * CM;
      const offsetM = n.offsetFromLeft * CM;
      const offsetBottom = n.offsetFromBottom * CM;

      let px: number, py: number, pz: number;
      let boxArgs: [number, number, number];

      switch (wall.side) {
        case 'top':
          boxArgs = [nW, nH, nD];
          px = -rW / 2 + offsetM + nW / 2; py = offsetBottom + nH / 2; pz = -rD / 2 - nD / 2;
          break;
        case 'right':
          boxArgs = [nD, nH, nW];
          px = rW / 2 + nD / 2; py = offsetBottom + nH / 2; pz = -rD / 2 + offsetM + nW / 2;
          break;
        case 'bottom':
          boxArgs = [nW, nH, nD];
          px = rW / 2 - offsetM - nW / 2; py = offsetBottom + nH / 2; pz = rD / 2 + nD / 2;
          break;
        case 'left':
        default:
          boxArgs = [nD, nH, nW];
          px = -rW / 2 - nD / 2; py = offsetBottom + nH / 2; pz = rD / 2 - offsetM - nW / 2;
          break;
      }

      const tc = n.tileConfig || wall.tileConfig;
      const nDecorImg = tc?.decorImage ? await loadImage(tc.decorImage).catch(() => null) : null;
      const backTex = makeTexture(createTileCanvas(tc, n.width, n.height, nDecorImg));
      const sideTex = makeTexture(createTileCanvas(tc, n.depth, n.height, nDecorImg));
      const topTex = makeTexture(createTileCanvas(tc, n.width, n.depth, nDecorImg));

      const invisible = new THREE.MeshStandardMaterial({ visible: false });
      const geo = new THREE.BoxGeometry(...boxArgs);
      let mats: THREE.Material[];
      if (wall.side === 'top') {
        mats = [
          new THREE.MeshStandardMaterial({ map: sideTex, side: THREE.DoubleSide }),
          new THREE.MeshStandardMaterial({ map: sideTex, side: THREE.DoubleSide }),
          new THREE.MeshStandardMaterial({ map: topTex, side: THREE.DoubleSide }),
          new THREE.MeshStandardMaterial({ map: topTex, side: THREE.DoubleSide }),
          invisible,
          new THREE.MeshStandardMaterial({ map: backTex, side: THREE.DoubleSide }),
        ];
      } else if (wall.side === 'bottom') {
        mats = [
          new THREE.MeshStandardMaterial({ map: sideTex, side: THREE.DoubleSide }),
          new THREE.MeshStandardMaterial({ map: sideTex, side: THREE.DoubleSide }),
          new THREE.MeshStandardMaterial({ map: topTex, side: THREE.DoubleSide }),
          new THREE.MeshStandardMaterial({ map: topTex, side: THREE.DoubleSide }),
          new THREE.MeshStandardMaterial({ map: backTex, side: THREE.DoubleSide }),
          invisible,
        ];
      } else if (wall.side === 'right') {
        mats = [
          new THREE.MeshStandardMaterial({ map: backTex, side: THREE.DoubleSide }),
          invisible,
          new THREE.MeshStandardMaterial({ map: topTex, side: THREE.DoubleSide }),
          new THREE.MeshStandardMaterial({ map: topTex, side: THREE.DoubleSide }),
          new THREE.MeshStandardMaterial({ map: sideTex, side: THREE.DoubleSide }),
          new THREE.MeshStandardMaterial({ map: sideTex, side: THREE.DoubleSide }),
        ];
      } else {
        mats = [
          invisible,
          new THREE.MeshStandardMaterial({ map: backTex, side: THREE.DoubleSide }),
          new THREE.MeshStandardMaterial({ map: topTex, side: THREE.DoubleSide }),
          new THREE.MeshStandardMaterial({ map: topTex, side: THREE.DoubleSide }),
          new THREE.MeshStandardMaterial({ map: sideTex, side: THREE.DoubleSide }),
          new THREE.MeshStandardMaterial({ map: sideTex, side: THREE.DoubleSide }),
        ];
      }
      const mesh = new THREE.Mesh(geo, mats);
      mesh.position.set(px, py, pz);
      scene.add(mesh);
    }
  }

  // Showers
  for (const s of room.showerCabins) {
    const sW = s.width * CM;
    const sD = s.depth * CM;
    let x = 0, z = 0;
    switch (s.corner) {
      case 'top-left':     x = -rW / 2 + sW / 2; z = -rD / 2 + sD / 2; break;
      case 'top-right':    x =  rW / 2 - sW / 2; z = -rD / 2 + sD / 2; break;
      case 'bottom-left':  x = -rW / 2 + sW / 2; z =  rD / 2 - sD / 2; break;
      case 'bottom-right': x =  rW / 2 - sW / 2; z =  rD / 2 - sD / 2; break;
    }
    const points = [
      new THREE.Vector3(-sW / 2, 0, -sD / 2),
      new THREE.Vector3( sW / 2, 0, -sD / 2),
      new THREE.Vector3( sW / 2, 0,  sD / 2),
      new THREE.Vector3(-sW / 2, 0,  sD / 2),
      new THREE.Vector3(-sW / 2, 0, -sD / 2),
    ];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x2196f3, linewidth: 2 });
    const line = new THREE.Line(lineGeo, lineMat);
    line.position.set(x, 0.006, z);
    scene.add(line);
  }

  // Wall labels on the floor outside each wall
  for (const wall of room.walls) {
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 128;
    labelCanvas.height = 128;
    const lctx = labelCanvas.getContext('2d')!;
    lctx.fillStyle = 'rgba(0,0,0,0)';
    lctx.fillRect(0, 0, 128, 128);
    lctx.fillStyle = '#555';
    lctx.font = 'bold 80px sans-serif';
    lctx.textAlign = 'center';
    lctx.textBaseline = 'middle';
    lctx.fillText(wall.label, 64, 64);

    const labelTex = new THREE.CanvasTexture(labelCanvas);
    labelTex.colorSpace = THREE.SRGBColorSpace;
    const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, depthWrite: false });
    const labelGeo = new THREE.PlaneGeometry(0.3, 0.3);
    const labelMesh = new THREE.Mesh(labelGeo, labelMat);
    labelMesh.rotation.x = -Math.PI / 2;
    labelMesh.position.y = 0.001;

    const offset = 0.35; // distance from wall on the floor
    switch (wall.side) {
      case 'top':    labelMesh.position.set(0, 0.001, -rD / 2 - offset); break;
      case 'bottom': labelMesh.position.set(0, 0.001, rD / 2 + offset); break;
      case 'right':  labelMesh.position.set(rW / 2 + offset, 0.001, 0); break;
      case 'left':   labelMesh.position.set(-rW / 2 - offset, 0.001, 0); break;
    }
    scene.add(labelMesh);
  }

  return { scene, wallMeshes };
}

interface Room3DProps {
  room: Room;
  onClose: () => void;
  tilePalette?: TileConfig[];
  onUpdate?: (room: Room) => void;
}

export default function Room3DView({ room, onClose, tilePalette, onUpdate }: Room3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const [showCeiling, setShowCeiling] = useState(false);
  const [fisheye, setFisheye] = useState(false);
  const [autoHideWalls, setAutoHideWalls] = useState(true);
  const [manualHidden, setManualHidden] = useState<Set<string>>(new Set());
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const wallMeshesRef = useRef<WallMeshInfo[]>([]);
  const manualHiddenRef = useRef(manualHidden);
  manualHiddenRef.current = manualHidden;
  const autoHideRef = useRef(autoHideWalls);
  autoHideRef.current = autoHideWalls;

  const [selectedSurface, setSelectedSurface] = useState<string | null>(null);

  const assignTile = useCallback((tile: TileConfig) => {
    if (!onUpdate || !selectedSurface) return;
    if (selectedSurface === 'floor') {
      onUpdate({ ...room, floorTileConfig: tile });
    } else {
      onUpdate({
        ...room,
        walls: room.walls.map(w => w.id === selectedSurface ? { ...w, tileConfig: tile } : w),
      });
    }
  }, [onUpdate, selectedSurface, room]);

  // Update FOV and position when fisheye toggles
  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    const rW = room.width * CM;
    const rD = room.depth * CM;
    const hM = room.height * CM;
    const maxDim = Math.max(rW, rD, hM);
    if (fisheye) {
      camera.fov = 120;
      camera.position.set(0, hM * 0.5, 0);
      controls.target.set(0, hM * 0.5, -rD * 0.4);
      controls.minDistance = 0;
    } else {
      camera.fov = 50;
      const dist = maxDim * 1.6;
      camera.position.set(dist * 0.8, dist * 0.7, dist * 0.8);
      controls.target.set(0, hM * 0.35, 0);
      controls.minDistance = 0.3;
    }
    camera.updateProjectionMatrix();
    controls.update();
  }, [fisheye, room]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0xe8ecf0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const rW = room.width * CM;
    const rD = room.depth * CM;
    const hM = room.height * CM;
    const maxDim = Math.max(rW, rD, hM);
    const dist = maxDim * 1.6;

    const camera = new THREE.PerspectiveCamera(fisheye ? 120 : 50, w / h, 0.01, 100);
    if (fisheye) {
      camera.position.set(0, hM * 0.5, 0);
    } else {
      camera.position.set(dist * 0.8, dist * 0.7, dist * 0.8);
    }
    camera.lookAt(0, hM * 0.35, 0);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, hM * 0.35, 0);
    controls.maxPolarAngle = Math.PI * 0.85;
    controls.minDistance = 0.3;
    controls.maxDistance = maxDim * 5;
    controls.update();
    controlsRef.current = controls;

    let animId: number;
    let cancelled = false;

    buildScene(room, showCeiling).then(({ scene, wallMeshes }) => {
      if (cancelled) return;
      wallMeshesRef.current = wallMeshes;

      function animate() {
        animId = requestAnimationFrame(animate);
        controls.update();

        // Auto-hide walls based on camera position
        for (const wm of wallMeshes) {
          if (manualHiddenRef.current.has(wm.wallId)) {
            wm.group.visible = false;
            continue;
          }
          if (!autoHideRef.current) {
            wm.group.visible = true;
            continue;
          }
          // Hide wall if camera is on exterior side
          const cp = camera.position;
          switch (wm.side) {
            case 'top':    wm.group.visible = cp.z >= -rD / 2; break;
            case 'bottom': wm.group.visible = cp.z <= rD / 2; break;
            case 'right':  wm.group.visible = cp.x <= rW / 2; break;
            case 'left':   wm.group.visible = cp.x >= -rW / 2; break;
          }
        }

        renderer.render(scene, camera);
      }
      animate();
    });

    const onResize = () => {
      const w2 = container.clientWidth;
      const h2 = container.clientHeight;
      camera.aspect = w2 / h2;
      camera.updateProjectionMatrix();
      renderer.setSize(w2, h2);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      rendererRef.current = null;
      controlsRef.current = null;
    };
  }, [room, showCeiling, fisheye]);

  const palette = tilePalette ?? [];

  return (
    <Box sx={{ position: 'relative', width: '100%', flex: 1, minHeight: 0, display: 'flex' }}>
      {/* 3D Canvas */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        <Paper elevation={3} sx={{ position: 'absolute', top: 12, left: 12, zIndex: 10, display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.5 }}>
          <Typography variant="subtitle2" fontWeight={700}>3D: {room.name}</Typography>
          <Typography variant="caption" color="text.secondary">{room.width}x{room.depth}x{room.height} cm</Typography>
        </Paper>

        <Paper elevation={3} sx={{ position: 'absolute', top: 12, right: 12, zIndex: 10, display: 'flex', alignItems: 'center', gap: 0.5, px: 0.5, py: 0.25 }}>
          <Tooltip title={autoHideWalls ? 'Vypnout auto-skrývání stěn' : 'Zapnout auto-skrývání stěn'}>
            <IconButton size="small" onClick={() => setAutoHideWalls(!autoHideWalls)} color={autoHideWalls ? 'primary' : 'default'}>
              {autoHideWalls ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title={fisheye ? 'Normální pohled' : 'Fisheye (širokoúhlý)'}>
            <IconButton size="small" onClick={() => setFisheye(!fisheye)} color={fisheye ? 'primary' : 'default'}>
              <CameraIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={showCeiling ? 'Skryt strop' : 'Zobrazit strop'}>
            <IconButton size="small" onClick={() => setShowCeiling(!showCeiling)}>
              {showCeiling ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Zavřít 3D">
            <IconButton size="small" onClick={onClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Paper>

        <div
          ref={containerRef}
          style={{ width: '100%', height: '100%', borderRadius: 8, overflow: 'hidden' }}
        />

        <Paper elevation={3} sx={{ position: 'absolute', bottom: 12, left: 12, zIndex: 10, display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>Stěny:</Typography>
          {room.walls.map(w => {
            const hidden = manualHidden.has(w.id);
            return (
              <Button
                key={w.id}
                size="small"
                variant={hidden ? 'outlined' : 'contained'}
                color={hidden ? 'inherit' : 'primary'}
                onClick={() => {
                  const next = new Set(manualHidden);
                  if (hidden) next.delete(w.id); else next.add(w.id);
                  setManualHidden(next);
                }}
                sx={{ minWidth: 0, px: 1, py: 0.25, fontSize: 12, textTransform: 'none', opacity: hidden ? 0.5 : 1 }}
              >
                {w.label}
              </Button>
            );
          })}
        </Paper>
      </Box>

      {/* Tile picker panel */}
      {palette.length > 0 && onUpdate && (
        <Paper
          elevation={3}
          sx={{
            width: 200, flexShrink: 0, p: 1.5, overflowY: 'auto',
            borderRadius: '0 8px 8px 0', bgcolor: 'background.paper',
          }}
        >
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Dlaždice</Typography>

          {/* Surface selector */}
          <Typography variant="caption" color="text.secondary">Vyberte plochu:</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5, mb: 1.5 }}>
            {room.walls.map(w => (
              <Chip
                key={w.id}
                label={`Stěna ${w.label}`}
                size="small"
                variant={selectedSurface === w.id ? 'filled' : 'outlined'}
                color={selectedSurface === w.id ? 'primary' : 'default'}
                onClick={() => setSelectedSurface(selectedSurface === w.id ? null : w.id)}
                sx={{ fontSize: 11 }}
              />
            ))}
            <Chip
              label="Podlaha"
              size="small"
              variant={selectedSurface === 'floor' ? 'filled' : 'outlined'}
              color={selectedSurface === 'floor' ? 'primary' : 'default'}
              onClick={() => setSelectedSurface(selectedSurface === 'floor' ? null : 'floor')}
              sx={{ fontSize: 11 }}
            />
          </Box>

          {selectedSurface && (
            <>
              <Divider sx={{ mb: 1 }} />
              <Typography variant="caption" color="text.secondary">
                Klikněte na dlaždici:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 0.75 }}>
                {palette.map((tile, idx) => {
                  const currentTile = selectedSurface === 'floor'
                    ? room.floorTileConfig
                    : room.walls.find(w => w.id === selectedSurface)?.tileConfig;
                  const isActive = currentTile?.name === tile.name && currentTile?.color === tile.color;
                  return (
                    <Paper
                      key={idx}
                      variant="outlined"
                      onClick={() => assignTile(tile)}
                      sx={{
                        p: 0.75, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1,
                        borderColor: isActive ? 'primary.main' : 'divider',
                        bgcolor: isActive ? 'primary.50' : 'transparent',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      {tile.decorImage ? (
                        <Box
                          component="img"
                          src={tile.decorImage}
                          sx={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 0.5, flexShrink: 0 }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 28, height: 28, bgcolor: tile.color, borderRadius: 0.5, flexShrink: 0,
                            border: '1px solid rgba(0,0,0,0.1)',
                          }}
                        />
                      )}
                      <Box>
                        <Typography variant="caption" fontWeight={600} sx={{ display: 'block', lineHeight: 1.2 }}>
                          {tile.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                          {tile.width}×{tile.height} cm
                        </Typography>
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            </>
          )}
        </Paper>
      )}
    </Box>
  );
}
