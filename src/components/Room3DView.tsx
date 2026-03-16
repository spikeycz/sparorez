import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Box, Typography, IconButton, Paper, Tooltip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CameraIcon from '@mui/icons-material/CameraAlt';
import type { Room, Wall } from '../types';
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

async function buildScene(room: Room, showCeiling: boolean): Promise<THREE.Scene> {
  const scene = new THREE.Scene();
  const rW = room.width * CM;
  const rD = room.depth * CM;
  const hM = room.height * CM;

  // Lights — warm bathroom mood
  scene.add(new THREE.AmbientLight(0xfff8f0, 0.25));

  // 2 recessed ceiling spotlights from wall C to A, spaced at 1/3 and 2/3 of depth
  for (const frac of [1 / 3, 2 / 3]) {
    const z = rD / 2 - frac * rD; // C is +z, A is -z
    const spot = new THREE.SpotLight(0xffe8cc, 2.5, hM * 2.5, Math.PI / 4, 0.6, 1.2);
    spot.position.set(0, hM - 0.01, z);
    spot.target.position.set(0, 0, z);
    scene.add(spot);
    scene.add(spot.target);
  }

  // Gentle fill to keep walls visible
  const fill = new THREE.HemisphereLight(0xffffff, 0xe0d8d0, 0.35);
  scene.add(fill);

  // Ground
  const groundGeo = new THREE.PlaneGeometry(10, 10);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xd8dce0 });
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

    // Niche openings — cut holes in the wall just like doors
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
    // UVs
    const pos = geo.attributes.position;
    const uvs = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uvs[i * 2] = pos.getX(i) / wM;
      uvs[i * 2 + 1] = pos.getY(i) / hM;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    // Interior face: tile/decor texture
    const matInner = new THREE.MeshStandardMaterial({ map: tex, side: THREE.FrontSide });
    const meshInner = new THREE.Mesh(geo, matInner);

    // Exterior face: light grey
    const geoOuter = geo.clone();
    const matOuter = new THREE.MeshStandardMaterial({ color: 0xd8dce0, side: THREE.BackSide });
    const meshOuter = new THREE.Mesh(geoOuter, matOuter);

    const group = new THREE.Group();
    group.add(meshInner);
    group.add(meshOuter);
    const mesh = group;

    switch (wall.side) {
      case 'top':
        mesh.position.set(-rW / 2, 0, -rD / 2);
        break;
      case 'right':
        mesh.position.set(rW / 2, 0, -rD / 2);
        mesh.rotation.y = -Math.PI / 2;
        break;
      case 'bottom':
        mesh.position.set(rW / 2, 0, rD / 2);
        mesh.rotation.y = Math.PI;
        break;
      case 'left':
        mesh.position.set(-rW / 2, 0, rD / 2);
        mesh.rotation.y = Math.PI / 2;
        break;
    }

    scene.add(mesh);
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

      // BoxGeometry material order: +x, -x, +y, -y, +z, -z
      const geo = new THREE.BoxGeometry(...boxArgs);
      let mats: THREE.MeshStandardMaterial[];
      if (wall.side === 'top' || wall.side === 'bottom') {
        mats = [
          new THREE.MeshStandardMaterial({ map: sideTex, side: THREE.DoubleSide }), // +x
          new THREE.MeshStandardMaterial({ map: sideTex, side: THREE.DoubleSide }), // -x
          new THREE.MeshStandardMaterial({ map: topTex, side: THREE.DoubleSide }),  // +y
          new THREE.MeshStandardMaterial({ map: topTex, side: THREE.DoubleSide }),  // -y
          new THREE.MeshStandardMaterial({ map: faceTex, side: THREE.DoubleSide }), // +z (front)
          new THREE.MeshStandardMaterial({ map: faceTex, side: THREE.DoubleSide }), // -z (back)
        ];
      } else {
        mats = [
          new THREE.MeshStandardMaterial({ map: faceTex, side: THREE.DoubleSide }), // +x (front)
          new THREE.MeshStandardMaterial({ map: faceTex, side: THREE.DoubleSide }), // -x (back)
          new THREE.MeshStandardMaterial({ map: topTex, side: THREE.DoubleSide }),  // +y
          new THREE.MeshStandardMaterial({ map: topTex, side: THREE.DoubleSide }),  // -y
          new THREE.MeshStandardMaterial({ map: sideTex, side: THREE.DoubleSide }), // +z
          new THREE.MeshStandardMaterial({ map: sideTex, side: THREE.DoubleSide }), // -z
        ];
      }
      const mesh = new THREE.Mesh(geo, mats);
      mesh.position.set(px, py, pz);
      scene.add(mesh);
    }
  }

  // Niches — box-shaped indentations going into the wall
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

      const geo = new THREE.BoxGeometry(...boxArgs);
      let mats: THREE.MeshStandardMaterial[];
      if (wall.side === 'top' || wall.side === 'bottom') {
        mats = [
          new THREE.MeshStandardMaterial({ map: sideTex, side: THREE.DoubleSide }),
          new THREE.MeshStandardMaterial({ map: sideTex, side: THREE.DoubleSide }),
          new THREE.MeshStandardMaterial({ map: topTex, side: THREE.DoubleSide }),
          new THREE.MeshStandardMaterial({ map: topTex, side: THREE.DoubleSide }),
          new THREE.MeshStandardMaterial({ map: backTex, side: THREE.DoubleSide }),
          new THREE.MeshStandardMaterial({ map: backTex, side: THREE.DoubleSide }),
        ];
      } else {
        mats = [
          new THREE.MeshStandardMaterial({ map: backTex, side: THREE.DoubleSide }),
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

  // Showers — draw just an outline stroke on the floor
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
    // Outline rectangle
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

  return scene;
}

export default function Room3DView({ room, onClose }: { room: Room; onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const [showCeiling, setShowCeiling] = useState(false);
  const [fisheye, setFisheye] = useState(false);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

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

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0xe8ecf0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Camera
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

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, hM * 0.35, 0);
    controls.maxPolarAngle = Math.PI * 0.85;
    controls.minDistance = 0.3;
    controls.maxDistance = maxDim * 5;
    controls.update();
    controlsRef.current = controls;

    // Scene
    let animId: number;
    let cancelled = false;

    buildScene(room, showCeiling).then((scene) => {
      if (cancelled) return;

      // Animate
      function animate() {
        animId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      }
      animate();
    });

    // Resize
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

  return (
    <Box sx={{ position: 'relative', width: '100%', height: 'calc(100vh - 120px)', minHeight: 400 }}>
      <Paper elevation={3} sx={{ position: 'absolute', top: 12, left: 12, zIndex: 10, display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.5 }}>
        <Typography variant="subtitle2" fontWeight={700}>3D: {room.name}</Typography>
        <Typography variant="caption" color="text.secondary">{room.width}x{room.depth}x{room.height} cm</Typography>
      </Paper>

      <Paper elevation={3} sx={{ position: 'absolute', top: 12, right: 12, zIndex: 10, display: 'flex', alignItems: 'center', gap: 0.5, px: 0.5, py: 0.25 }}>
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
        <Tooltip title="Zavrit 3D">
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Paper>

      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', borderRadius: 8, overflow: 'hidden' }}
      />

      <Typography variant="caption" color="text.secondary" sx={{ position: 'absolute', bottom: 8, left: 12 }}>
        Tahejte mysi pro otaceni, koleckem priblizujte
      </Typography>
    </Box>
  );
}
