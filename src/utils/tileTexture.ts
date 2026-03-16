import type { TileConfig } from '../types';
import type { TileRect } from './tileLayout';

const GROUT_COLOR = '#b0b0b0';
const GROUT_WIDTH_PX = 2;
const UNTILED_COLOR = '#c8c8c8';
const DOOR_COLOR = '#8B6914';
const CUT_TILE_DARKEN = 0.92; // slightly darker for cut tiles

function darkenColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`;
}

/**
 * Generate a canvas texture from actual computed tile layout.
 * Each tile rect is drawn at its exact position with grout lines.
 */
export function createTileCanvasFromLayout(
  tiles: TileRect[],
  surfaceWidthCm: number,
  surfaceHeightCm: number,
  tileColor: string,
  decorImg?: HTMLImageElement | null,
): HTMLCanvasElement {
  const pxPerCm = 3;
  const canvas = document.createElement('canvas');
  canvas.width = Math.min(Math.ceil(surfaceWidthCm * pxPerCm), 2048);
  canvas.height = Math.min(Math.ceil(surfaceHeightCm * pxPerCm), 2048);
  const ctx = canvas.getContext('2d')!;
  // Fill with grout
  ctx.fillStyle = GROUT_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const t of tiles) {
    const px = t.x * pxPerCm;
    const py = t.y * pxPerCm;
    const pw = t.w * pxPerCm - GROUT_WIDTH_PX;
    const ph = t.h * pxPerCm - GROUT_WIDTH_PX;

    if (pw <= 0 || ph <= 0) continue;

    if (t.isOverDoor) {
      ctx.fillStyle = DOOR_COLOR;
      ctx.fillRect(px + GROUT_WIDTH_PX / 2, py + GROUT_WIDTH_PX / 2, pw, ph);
      continue;
    }

    if (t.isOverGeberit) {
      // Skip — geberit face is separate
      continue;
    }

    const isCut = t.isCutX || t.isCutY || t.hasObstacleCut;

    if (decorImg) {
      // Draw decor image, cropped to tile size
      const srcW = decorImg.width;
      const srcH = decorImg.height;
      // For cut tiles, draw a portion of the image
      const cropW = (t.w / t.originalW) * srcW;
      const cropH = (t.h / t.originalH) * srcH;
      ctx.drawImage(
        decorImg,
        0, 0, cropW, cropH,
        px + GROUT_WIDTH_PX / 2, py + GROUT_WIDTH_PX / 2, pw, ph,
      );
      if (isCut) {
        // Subtle overlay to indicate cut
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        ctx.fillRect(px + GROUT_WIDTH_PX / 2, py + GROUT_WIDTH_PX / 2, pw, ph);
      }
    } else {
      ctx.fillStyle = isCut ? darkenColor(tileColor, CUT_TILE_DARKEN) : tileColor;
      ctx.fillRect(px + GROUT_WIDTH_PX / 2, py + GROUT_WIDTH_PX / 2, pw, ph);
    }
  }

  return canvas;
}

/**
 * Simple fallback: generate a basic tile grid without layout computation.
 */
export function createTileCanvas(
  tile: TileConfig | undefined,
  surfaceWidthCm: number,
  surfaceHeightCm: number,
  decorImg?: HTMLImageElement | null,
): HTMLCanvasElement {
  const pxPerCm = 3;
  const canvas = document.createElement('canvas');
  canvas.width = Math.min(Math.ceil(surfaceWidthCm * pxPerCm), 2048);
  canvas.height = Math.min(Math.ceil(surfaceHeightCm * pxPerCm), 2048);
  const ctx = canvas.getContext('2d')!;

  if (!tile) {
    ctx.fillStyle = UNTILED_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas;
  }

  const tileW = tile.width * pxPerCm;
  const tileH = tile.height * pxPerCm;

  ctx.fillStyle = GROUT_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cols = Math.ceil(canvas.width / (tileW + GROUT_WIDTH_PX)) + 1;
  const rows = Math.ceil(canvas.height / (tileH + GROUT_WIDTH_PX)) + 1;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * (tileW + GROUT_WIDTH_PX);
      const y = row * (tileH + GROUT_WIDTH_PX);
      if (decorImg) {
        ctx.drawImage(decorImg, x, y, tileW, tileH);
      } else {
        ctx.fillStyle = tile.color;
        ctx.fillRect(x, y, tileW, tileH);
      }
    }
  }

  return canvas;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
