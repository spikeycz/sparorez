import type { Room } from '../types';

export interface EffectiveDimensions {
  walls: {
    // wallIndex -> { width, height }
    [index: number]: { width: number; height: number };
  };
  floor: { width: number; depth: number };
}

/**
 * Compute effective wall/floor dimensions accounting for tile + adhesive thickness.
 *
 * Room dimensions are measured on the empty room. When tiling:
 * - Walls A/C (top/bottom, indices 0/2) keep full room width (they go into corners)
 * - Walls B/D (right/left, indices 1/3) are shortened by tile thickness
 *   for each adjacent tiled wall (A at top, C at bottom)
 * - Wall height is reduced by floor tile thickness (tiles go on top of floor)
 * - Floor dimensions are reduced by wall tile thickness on each side
 */
export function getEffectiveDimensions(room: Room): EffectiveDimensions {
  const t = room.tileThickness || 0;

  const wallA = room.walls[0]; // top
  const wallB = room.walls[1]; // right
  const wallC = room.walls[2]; // bottom
  const wallD = room.walls[3]; // left

  const hasA = !!wallA?.tileConfig;
  const hasB = !!wallB?.tileConfig;
  const hasC = !!wallC?.tileConfig;
  const hasD = !!wallD?.tileConfig;
  const hasFloor = !!room.floorTileConfig;

  // Height reduction: floor tile thickness at bottom
  const heightReduction = hasFloor ? t : 0;

  // Walls A and C (top/bottom): full room width, they go corner to corner
  const wallACWidth = room.width;
  const wallACHeight = room.height - heightReduction;

  // Walls B and D (right/left): reduced by A/C tile thickness
  const wallBDWidth = room.depth - (hasA ? t : 0) - (hasC ? t : 0);
  const wallBDHeight = room.height - heightReduction;

  // Floor: reduced by wall tiles on each side
  const floorWidth = room.width - (hasB ? t : 0) - (hasD ? t : 0);
  const floorDepth = room.depth - (hasA ? t : 0) - (hasC ? t : 0);

  return {
    walls: {
      0: { width: wallACWidth, height: wallACHeight },
      1: { width: wallBDWidth, height: wallBDHeight },
      2: { width: wallACWidth, height: wallACHeight },
      3: { width: wallBDWidth, height: wallBDHeight },
    },
    floor: { width: floorWidth, depth: floorDepth },
  };
}
