import type { Wall, Geberit, Room, ShowerCabin, Niche } from '../types';

export interface CornerObstacle {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Wall adjacency when viewing from inside the room:
 * [leftNeighborIdx, rightNeighborIdx]
 */
const WALL_ADJACENCY: [number, number][] = [
  [3, 1], // Wall 0 (A top): left=D, right=B
  [0, 2], // Wall 1 (B right): left=A, right=C
  [1, 3], // Wall 2 (C bottom): left=B, right=D
  [2, 0], // Wall 3 (D left): left=C, right=A
];

/**
 * Compute geberit projections from adjacent walls.
 * When a geberit sits in a corner (at the edge of its wall),
 * its depth protrudes onto the adjacent wall as an obstacle.
 */
export function getCornerGeberitObstacles(
  room: Room,
  wallIdx: number,
  effectiveWidth: number,
  effectiveHeight: number,
): CornerObstacle[] {
  const [leftIdx, rightIdx] = WALL_ADJACENCY[wallIdx];
  const leftWall = room.walls[leftIdx];
  const rightWall = room.walls[rightIdx];
  const result: CornerObstacle[] = [];
  const THRESHOLD = 1; // cm tolerance for corner detection

  // Left neighbor: geberits at its RIGHT end → left corner of current wall
  for (const g of leftWall.geberits) {
    if (g.offsetFromLeft + g.width >= leftWall.width - THRESHOLD) {
      result.push({
        x: 0,
        y: effectiveHeight - g.height,
        w: g.depth,
        h: g.height,
      });
    }
  }

  // Right neighbor: geberits at its LEFT end → right corner of current wall
  for (const g of rightWall.geberits) {
    if (g.offsetFromLeft <= THRESHOLD) {
      result.push({
        x: effectiveWidth - g.depth,
        y: effectiveHeight - g.height,
        w: g.depth,
        h: g.height,
      });
    }
  }

  return result;
}

export interface TileRect {
  // Position in cm from wall origin (top-left)
  x: number;
  y: number;
  w: number;
  h: number;
  isCutX: boolean; // cut horizontally (edge cut from calcAxis)
  isCutY: boolean; // cut vertically (edge cut from calcAxis)
  isOverDoor: boolean;
  isOverGeberit: boolean;
  hasObstacleCut: boolean; // tile partially overlaps an obstacle (corner/edge cutout)
  notchW: number; // width of cutout notch (0 if no notch)
  notchH: number; // height of cutout notch (0 if no notch)
  originalW: number; // full tile width before cut
  originalH: number; // full tile height before cut
}

export interface GeberitTileLayout {
  geberitId: string;
  tiles: TileRect[];
  fullTiles: number;
  cutTiles: number;
}

export interface LayoutResult {
  tiles: TileRect[];
  fullTiles: number;
  cutTiles: number;
  // Edge cut dimensions
  leftCut: number; // cm, 0 if no cut
  rightCut: number;
  topCut: number;
  bottomCut: number;
  geberitLayouts: GeberitTileLayout[];
}

/**
 * Calculate centered tile layout for a wall.
 * Uses the "quartering" technique: if edge cuts would be < half a tile,
 * shift by half a tile to avoid slivers.
 */
function calcAxis(wallSize: number, tileSize: number): { positions: number[]; sizes: number[] } {
  if (tileSize <= 0 || wallSize <= 0) return { positions: [], sizes: [] };

  const fullCount = Math.floor(wallSize / tileSize);
  let remainder = wallSize - fullCount * tileSize;

  // Round to avoid floating point issues
  remainder = Math.round(remainder * 100) / 100;

  if (remainder === 0) {
    // Perfect fit
    const positions: number[] = [];
    const sizes: number[] = [];
    for (let i = 0; i < fullCount; i++) {
      positions.push(i * tileSize);
      sizes.push(tileSize);
    }
    return { positions, sizes };
  }

  let edgeCut = remainder / 2;

  // Quartering: if edge cut < half tile, remove one full tile and redistribute.
  // Avoids tiny edge strips by creating larger, more practical cuts.
  // e.g. 75cm with 60cm tiles → 37.5 | 37.5 instead of 7.5 | 60 | 7.5
  if (edgeCut < tileSize / 2 && fullCount >= 1) {
    remainder = wallSize - (fullCount - 1) * tileSize;
    edgeCut = remainder / 2;
  }

  const positions: number[] = [];
  const sizes: number[] = [];

  // Left edge cut
  positions.push(0);
  sizes.push(Math.round(edgeCut * 100) / 100);

  // Full tiles in the middle
  let x = edgeCut;
  const middleCount = Math.round((wallSize - 2 * edgeCut) / tileSize);
  for (let i = 0; i < middleCount; i++) {
    positions.push(Math.round(x * 100) / 100);
    sizes.push(tileSize);
    x += tileSize;
  }

  // Right edge cut
  const rightCut = Math.round((wallSize - x) * 100) / 100;
  if (rightCut > 0.1) {
    positions.push(Math.round(x * 100) / 100);
    sizes.push(rightCut);
  }

  return { positions, sizes };
}

interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'door' | 'geberit';
}

/**
 * Check tile-obstacle overlap.
 * A tile keeps its full base grid dimensions — it's not split into fragments.
 * If it partially overlaps an obstacle, the tiler cuts a notch from the tile.
 * The obstacle overlay visually covers the hidden part.
 */
function classifyTile(
  x: number, y: number, w: number, h: number,
  obstacles: Obstacle[],
): { isOverDoor: boolean; isOverGeberit: boolean; hasObstacleCut: boolean; notchW: number; notchH: number } {
  let isOverDoor = false;
  let isOverGeberit = false;
  let hasObstacleCut = false;
  let notchW = 0;
  let notchH = 0;

  for (const obs of obstacles) {
    const overlapX = x + w > obs.x + 0.05 && x < obs.x + obs.w - 0.05;
    const overlapY = y + h > obs.y + 0.05 && y < obs.y + obs.h - 0.05;

    if (overlapX && overlapY) {
      const fullyInside = x >= obs.x - 0.05 && x + w <= obs.x + obs.w + 0.05 &&
                          y >= obs.y - 0.05 && y + h <= obs.y + obs.h + 0.05;

      if (fullyInside) {
        if (obs.type === 'door') isOverDoor = true;
        else isOverGeberit = true;
      } else {
        hasObstacleCut = true;
        // Compute notch (intersection of tile and obstacle)
        const ix = Math.max(x, obs.x);
        const iy = Math.max(y, obs.y);
        const ix2 = Math.min(x + w, obs.x + obs.w);
        const iy2 = Math.min(y + h, obs.y + obs.h);
        notchW = Math.round((ix2 - ix) * 100) / 100;
        notchH = Math.round((iy2 - iy) * 100) / 100;
      }
    }
  }

  // Clean up negligible obstacle overlaps
  const MIN_CUT = 2; // cm — notches smaller than this are ignored (tiler won't bother cutting)
  if (hasObstacleCut && notchW > 0 && notchH > 0) {
    // Case 1: Notch is negligibly small — ignore the obstacle cut entirely
    if (notchW < MIN_CUT || notchH < MIN_CUT) {
      hasObstacleCut = false;
      notchW = 0;
      notchH = 0;
    }
    // Case 2: Tile nearly fully covered — visible strip is too thin to matter
    else {
      const visW = w - notchW;
      const visH = h - notchH;
      // notch spans full height → visible strip is visW wide
      // notch spans full width → visible strip is visH tall
      if ((notchH >= h - 0.1 && visW < MIN_CUT) ||
          (notchW >= w - 0.1 && visH < MIN_CUT) ||
          (visW < MIN_CUT && visH < MIN_CUT)) {
        isOverDoor = true;
        hasObstacleCut = false;
        notchW = 0;
        notchH = 0;
      }
    }
  }

  return { isOverDoor, isOverGeberit, hasObstacleCut, notchW, notchH };
}

export function calculateTileLayout(
  wall: Wall,
  effectiveWidth?: number,
  effectiveHeight?: number,
  cornerObstacles?: CornerObstacle[],
): LayoutResult | null {
  if (!wall.tileConfig) return null;

  const tile = wall.tileConfig;
  const wallW = effectiveWidth ?? wall.width;
  const wallH = effectiveHeight ?? wall.height;
  const hAxis = calcAxis(wallW, tile.width);
  const vAxis = calcAxis(wallH, tile.height);

  // Build obstacle list
  const obstacles: Obstacle[] = [];

  for (const door of wall.doors) {
    obstacles.push({
      x: door.offsetFromLeft,
      y: wallH - door.height,
      w: door.width,
      h: door.height,
      type: 'door',
    });
  }

  for (const g of wall.geberits) {
    obstacles.push({
      x: g.offsetFromLeft,
      y: wallH - g.height,
      w: g.width,
      h: g.height,
      type: 'geberit',
    });
  }

  for (const n of wall.niches ?? []) {
    obstacles.push({
      x: n.offsetFromLeft,
      y: wallH - n.offsetFromBottom - n.height,
      w: n.width,
      h: n.height,
      type: 'door', // treat as door-type cutout (tiles removed, not covered)
    });
  }

  // Corner geberit projections from adjacent walls
  for (const co of cornerObstacles ?? []) {
    obstacles.push({
      x: co.x,
      y: co.y,
      w: co.w,
      h: co.h,
      type: 'geberit',
    });
  }

  const tiles: TileRect[] = [];
  let fullTiles = 0;
  let cutTiles = 0;

  for (let row = 0; row < vAxis.positions.length; row++) {
    for (let col = 0; col < hAxis.positions.length; col++) {
      const x = hAxis.positions[col];
      const y = vAxis.positions[row];
      const w = hAxis.sizes[col];
      const h = vAxis.sizes[row];

      const isCutX = Math.abs(w - tile.width) > 0.1;
      const isCutY = Math.abs(h - tile.height) > 0.1;
      const { isOverDoor, isOverGeberit, hasObstacleCut, notchW, notchH } = classifyTile(x, y, w, h, obstacles);

      tiles.push({
        x, y, w, h,
        isCutX, isCutY,
        isOverDoor, isOverGeberit,
        hasObstacleCut,
        notchW, notchH,
        originalW: tile.width,
        originalH: tile.height,
      });

      if (!isOverDoor && !isOverGeberit) {
        if (isCutX || isCutY || hasObstacleCut) cutTiles++;
        else fullTiles++;
      }
    }
  }

  // Calculate geberit face tile layouts
  const geberitLayouts: GeberitTileLayout[] = [];
  for (const g of wall.geberits) {
    if (g.tileConfig) {
      const gLayout = calculateGeberitFaceLayout(g, wallH);
      if (gLayout) geberitLayouts.push(gLayout);
    }
  }

  // Edge cuts from the base grid
  const leftCut = hAxis.sizes.length > 0 && Math.abs(hAxis.sizes[0] - tile.width) > 0.1
    ? hAxis.sizes[0] : 0;
  const rightCutVal = hAxis.sizes.length > 1 && Math.abs(hAxis.sizes[hAxis.sizes.length - 1] - tile.width) > 0.1
    ? hAxis.sizes[hAxis.sizes.length - 1] : 0;
  const topCut = vAxis.sizes.length > 0 && Math.abs(vAxis.sizes[0] - tile.height) > 0.1
    ? vAxis.sizes[0] : 0;
  const bottomCut = vAxis.sizes.length > 1 && Math.abs(vAxis.sizes[vAxis.sizes.length - 1] - tile.height) > 0.1
    ? vAxis.sizes[vAxis.sizes.length - 1] : 0;

  return { tiles, fullTiles, cutTiles, leftCut, rightCut: rightCutVal, topCut, bottomCut, geberitLayouts };
}

function calculateGeberitFaceLayout(g: Geberit, wallHeight: number): GeberitTileLayout | null {
  if (!g.tileConfig) return null;

  const tile = g.tileConfig;
  const hAxis = calcAxis(g.width, tile.width);
  const vAxis = calcAxis(g.height, tile.height);

  const gTop = wallHeight - g.height;

  const tiles: TileRect[] = [];
  let fullTiles = 0;
  let cutTiles = 0;

  for (let row = 0; row < vAxis.positions.length; row++) {
    for (let col = 0; col < hAxis.positions.length; col++) {
      const x = g.offsetFromLeft + hAxis.positions[col];
      const y = gTop + vAxis.positions[row];
      const w = hAxis.sizes[col];
      const h = vAxis.sizes[row];

      const isCutX = Math.abs(w - tile.width) > 0.1;
      const isCutY = Math.abs(h - tile.height) > 0.1;

      tiles.push({
        x, y, w, h,
        isCutX, isCutY,
        isOverDoor: false,
        isOverGeberit: true,
        hasObstacleCut: false,
        notchW: 0, notchH: 0,
        originalW: tile.width,
        originalH: tile.height,
      });

      if (isCutX || isCutY) cutTiles++;
      else fullTiles++;
    }
  }

  return { geberitId: g.id, tiles, fullTiles, cutTiles };
}

export interface FloorObstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

export interface FloorLayoutResult {
  layout: LayoutResult;
  obstacles: FloorObstacle[];
  // Tiling area offset (when prefab showers reduce the floor)
  tileStartX: number;
  tileStartY: number;
}

/**
 * Calculate floor tile layout for a room.
 * When prefabricated showers span the full depth/width, tiles are calculated
 * only for the remaining floor area (independent centering/quartering).
 * Geberit footprints within the tiling area are excluded as obstacles.
 */
export function calculateFloorLayout(
  room: Room,
  effectiveWidth?: number,
  effectiveDepth?: number,
): FloorLayoutResult | null {
  if (!room.floorTileConfig) return null;

  const tile = room.floorTileConfig;
  const floorW = effectiveWidth ?? room.width;
  const floorD = effectiveDepth ?? room.depth;

  // Compute effective tiling area by subtracting full-spanning prefab showers
  let tileStartX = 0;
  let tileEndX = floorW;
  let tileStartY = 0;
  let tileEndY = floorD;

  const floorObstacles: FloorObstacle[] = [];

  for (const sc of room.showerCabins ?? []) {
    if (!sc.prefabricated) continue;
    const { x: sx, y: sy } = getShowerPosition(sc, floorW, floorD);
    // Clip shower bounds to floor
    const shX1 = Math.max(0, sx);
    const shY1 = Math.max(0, sy);
    const shX2 = Math.min(floorW, sx + sc.width);
    const shY2 = Math.min(floorD, sy + sc.depth);
    floorObstacles.push({ x: shX1, y: shY1, w: shX2 - shX1, h: shY2 - shY1, label: 'Sprcha' });

    // If shower spans full depth → shrink horizontal range
    if (shY1 <= 0.1 && shY2 >= floorD - 0.1) {
      if (shX1 <= 0.1) tileStartX = Math.max(tileStartX, shX2);
      if (shX2 >= floorW - 0.1) tileEndX = Math.min(tileEndX, shX1);
    }
    // If shower spans full width → shrink vertical range
    if (shX1 <= 0.1 && shX2 >= floorW - 0.1) {
      if (shY1 <= 0.1) tileStartY = Math.max(tileStartY, shY2);
      if (shY2 >= floorD - 0.1) tileEndY = Math.min(tileEndY, shY1);
    }
  }

  const tileAreaW = Math.round((tileEndX - tileStartX) * 100) / 100;
  const tileAreaD = Math.round((tileEndY - tileStartY) * 100) / 100;

  if (tileAreaW <= 0 || tileAreaD <= 0) {
    return {
      layout: { tiles: [], fullTiles: 0, cutTiles: 0, leftCut: 0, rightCut: 0, topCut: 0, bottomCut: 0, geberitLayouts: [] },
      obstacles: floorObstacles,

      tileStartX, tileStartY,
    };
  }

  // Tile grid calculated for the remaining area only
  const hAxis = calcAxis(tileAreaW, tile.width);
  const vAxis = calcAxis(tileAreaD, tile.height);

  // Offset positions to floor coordinate system
  for (let i = 0; i < hAxis.positions.length; i++) {
    hAxis.positions[i] = Math.round((hAxis.positions[i] + tileStartX) * 100) / 100;
  }
  for (let i = 0; i < vAxis.positions.length; i++) {
    vAxis.positions[i] = Math.round((vAxis.positions[i] + tileStartY) * 100) / 100;
  }

  // Collect geberit floor footprints — only those overlapping the tiling area become obstacles
  const obstacles: Obstacle[] = [];

  room.walls.forEach((wall, idx) => {
    wall.geberits.forEach(g => {
      let fx: number, fy: number, fw: number, fh: number;
      if (idx === 0) { // top wall
        fx = g.offsetFromLeft; fy = 0; fw = g.width; fh = g.depth;
      } else if (idx === 1) { // right wall
        fx = floorW - g.depth; fy = g.offsetFromLeft; fw = g.depth; fh = g.width;
      } else if (idx === 2) { // bottom wall
        fx = floorW - g.offsetFromLeft - g.width; fy = floorD - g.depth; fw = g.width; fh = g.depth;
      } else { // left wall
        fx = 0; fy = floorD - g.offsetFromLeft - g.width; fw = g.depth; fh = g.width;
      }

      floorObstacles.push({ x: fx, y: fy, w: fw, h: fh, label: 'Geberit' });
      // Only add as tile obstacle if it overlaps the tiling area
      if (fx + fw > tileStartX + 0.1 && fx < tileEndX - 0.1 &&
          fy + fh > tileStartY + 0.1 && fy < tileEndY - 0.1) {
        obstacles.push({ x: fx, y: fy, w: fw, h: fh, type: 'door' });
      }
    });
  });

  const tiles: TileRect[] = [];
  let fullTiles = 0;
  let cutTiles = 0;

  for (let row = 0; row < vAxis.positions.length; row++) {
    for (let col = 0; col < hAxis.positions.length; col++) {
      const x = hAxis.positions[col];
      const y = vAxis.positions[row];
      const w = hAxis.sizes[col];
      const h = vAxis.sizes[row];

      const isCutX = Math.abs(w - tile.width) > 0.1;
      const isCutY = Math.abs(h - tile.height) > 0.1;
      const { isOverDoor, hasObstacleCut, notchW, notchH } = classifyTile(x, y, w, h, obstacles);

      tiles.push({
        x, y, w, h,
        isCutX, isCutY,
        isOverDoor,
        isOverGeberit: false,
        hasObstacleCut,
        notchW, notchH,
        originalW: tile.width,
        originalH: tile.height,
      });

      if (!isOverDoor) {
        if (isCutX || isCutY || hasObstacleCut) cutTiles++;
        else fullTiles++;
      }
    }
  }

  // Edge cuts from tiling area grid
  const leftCut = hAxis.sizes.length > 0 && Math.abs(hAxis.sizes[0] - tile.width) > 0.1
    ? hAxis.sizes[0] : 0;
  const rightCut = hAxis.sizes.length > 1 && Math.abs(hAxis.sizes[hAxis.sizes.length - 1] - tile.width) > 0.1
    ? hAxis.sizes[hAxis.sizes.length - 1] : 0;
  const topCut = vAxis.sizes.length > 0 && Math.abs(vAxis.sizes[0] - tile.height) > 0.1
    ? vAxis.sizes[0] : 0;
  const bottomCut = vAxis.sizes.length > 1 && Math.abs(vAxis.sizes[vAxis.sizes.length - 1] - tile.height) > 0.1
    ? vAxis.sizes[vAxis.sizes.length - 1] : 0;

  return {
    layout: { tiles, fullTiles, cutTiles, leftCut, rightCut, topCut, bottomCut, geberitLayouts: [] },
    obstacles: floorObstacles,
    showerLayouts: [],
    tileStartX, tileStartY,
  };
}

/** Get shower cabin position on the floor based on its corner */
function getShowerPosition(sc: ShowerCabin, floorW: number, floorD: number): { x: number; y: number } {
  switch (sc.corner) {
    case 'top-left': return { x: 0, y: 0 };
    case 'top-right': return { x: floorW - sc.width, y: 0 };
    case 'bottom-left': return { x: 0, y: floorD - sc.depth };
    case 'bottom-right': return { x: floorW - sc.width, y: floorD - sc.depth };
  }
}
