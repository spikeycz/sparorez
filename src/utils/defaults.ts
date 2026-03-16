import { v4 as uuid } from 'uuid';
import type { Room, Wall, TileConfig } from '../types';

export const DEFAULT_TILE_PRESETS: TileConfig[] = [
  { width: 30, height: 30, name: '30×30', color: '#73979c' },
  { width: 30, height: 60, name: '30×60', color: '#0095b6' },
  { width: 60, height: 60, name: '60×60', color: '#c3d3d5' },
  { width: 25, height: 50, name: '25×50', color: '#d9e4e7' },
  { width: 20, height: 20, name: '20×20', color: '#193137' },
  { width: 10, height: 10, name: 'Mozaika 10×10', color: '#ffcc00' },
];

function makeWalls(width: number, depth: number, height: number): Wall[] {
  return [
    { id: uuid(), label: 'A', width, height, side: 'top', tileConfig: undefined, geberits: [], niches: [], doors: [] },
    { id: uuid(), label: 'B', width: depth, height, side: 'right', tileConfig: undefined, geberits: [], niches: [], doors: [] },
    { id: uuid(), label: 'C', width, height, side: 'bottom', tileConfig: undefined, geberits: [], niches: [], doors: [] },
    { id: uuid(), label: 'D', width: depth, height, side: 'left', tileConfig: undefined, geberits: [], niches: [], doors: [] },
  ];
}

export function createDefaultRooms(): Room[] {
  return [
    {
      id: uuid(),
      name: 'WC',
      width: 120,
      depth: 160,
      height: 260,
      walls: makeWalls(120, 160, 260),
      showerCabins: [],
      tileThickness: 1.5,
    },
    {
      id: uuid(),
      name: 'Koupelna 1',
      width: 200,
      depth: 180,
      height: 260,
      walls: makeWalls(200, 180, 260),
      showerCabins: [],
      tileThickness: 1.5,
    },
    {
      id: uuid(),
      name: 'Koupelna 2',
      width: 180,
      depth: 170,
      height: 260,
      walls: makeWalls(180, 170, 260),
      showerCabins: [],
      tileThickness: 1.5,
    },
  ];
}
