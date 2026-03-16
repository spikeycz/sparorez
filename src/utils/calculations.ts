import type { Wall, Room, TileCalculation, RoomCalculation } from '../types';

const WASTE_FACTOR = 0.10; // 10% waste

function calculateWallTiles(wall: Wall): TileCalculation {
  const totalAreaCm2 = wall.width * wall.height;

  // Calculate geberit areas (the face of the geberit box that covers the wall)
  const geberitAreas = wall.geberits.map(g => ({
    id: g.id,
    area: (g.width * g.height) / 10000, // convert cm2 to m2
  }));

  const geberitTotalCm2 = wall.geberits.reduce(
    (sum, g) => sum + g.width * g.height,
    0
  );

  // Calculate door areas (full cutouts - no tiles)
  const doorTotalCm2 = wall.doors.reduce(
    (sum, d) => sum + d.width * d.height,
    0
  );

  const netAreaCm2 = totalAreaCm2 - geberitTotalCm2 - doorTotalCm2;
  const netArea = netAreaCm2 / 10000; // m2
  const totalArea = totalAreaCm2 / 10000;

  let tilesNeeded = 0;
  let cuts = 0;

  if (wall.tileConfig) {
    const tile = wall.tileConfig;
    const tileAreaCm2 = tile.width * tile.height;

    // How many tiles fit in the net area
    tilesNeeded = Math.ceil(netAreaCm2 / tileAreaCm2);

    // Estimate cuts: each row and column edge potentially needs a cut
    const tilesPerRow = Math.ceil(wall.width / tile.width);
    const tilesPerCol = Math.ceil(wall.height / tile.height);
    // Last tile in each row/column likely needs cutting
    const rowCuts = wall.width % tile.width !== 0 ? tilesPerCol : 0;
    const colCuts = wall.height % tile.height !== 0 ? tilesPerRow : 0;
    // Geberit cutouts + door cutouts
    const geberitCuts = wall.geberits.length * 4;
    const doorCuts = wall.doors.length * 3; // top + 2 sides (bottom is floor)
    cuts = rowCuts + colCuts + geberitCuts + doorCuts;
  }

  const tilesWithWaste = Math.ceil(tilesNeeded * (1 + WASTE_FACTOR));

  return {
    wallId: wall.id,
    wallLabel: wall.label,
    totalArea,
    geberitAreas,
    netArea,
    tilesNeeded,
    tilesWithWaste,
    cuts,
  };
}

function calculateGeberitSurfaces(wall: Wall): { area: number; tiles: number; tilesWithWaste: number }[] {
  return wall.geberits.map(g => {
    if (!g.tileConfig) return { area: 0, tiles: 0, tilesWithWaste: 0 };

    // Geberit box has 3 visible faces: front, top, and two sides
    // Front face
    const frontArea = g.width * g.height;
    // Top face
    const topArea = g.width * g.depth;
    // Two side faces
    const sideArea = 2 * g.depth * g.height;

    const totalCm2 = frontArea + topArea + sideArea;
    const area = totalCm2 / 10000;

    const tileAreaCm2 = g.tileConfig.width * g.tileConfig.height;
    const tiles = Math.ceil(totalCm2 / tileAreaCm2);
    const tilesWithWaste = Math.ceil(tiles * (1 + WASTE_FACTOR));

    return { area, tiles, tilesWithWaste };
  });
}

export function calculateRoom(room: Room): RoomCalculation {
  const wallCalculations = room.walls.map(w => calculateWallTiles(w));

  const floorAreaCm2 = room.width * room.depth;
  const floorArea = floorAreaCm2 / 10000;

  let floorTilesNeeded = 0;
  let floorTilesWithWaste = 0;

  if (room.floorTileConfig) {
    const tile = room.floorTileConfig;
    const tileAreaCm2 = tile.width * tile.height;
    floorTilesNeeded = Math.ceil(floorAreaCm2 / tileAreaCm2);
    floorTilesWithWaste = Math.ceil(floorTilesNeeded * (1 + WASTE_FACTOR));
  }

  const totalTileArea =
    wallCalculations.reduce((sum, wc) => sum + wc.netArea, 0) + floorArea;

  return {
    roomName: room.name,
    wallCalculations,
    floorArea,
    floorTilesNeeded,
    floorTilesWithWaste,
    totalTileArea,
  };
}

export function calculateGeberitTiles(wall: Wall) {
  return calculateGeberitSurfaces(wall);
}

export function formatArea(areaSqM: number): string {
  return areaSqM.toFixed(2);
}
