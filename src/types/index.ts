export interface TileConfig {
  width: number; // cm
  height: number; // cm
  name: string;
  color: string;
  pricePerSqm?: number;
  decorImage?: string; // data URL of uploaded decor texture
}

export interface Door {
  id: string;
  offsetFromLeft: number; // position on the wall (from left edge), in cm
  width: number; // cm
  height: number; // cm (typically 197-210)
}

export interface Geberit {
  id: string;
  // Position on the wall (from left edge), in cm
  offsetFromLeft: number;
  // Dimensions in cm
  width: number;
  height: number;
  depth: number; // how far it protrudes from wall
  tileConfig?: TileConfig;
}

export interface Niche {
  id: string;
  // Position on the wall (from left edge), in cm
  offsetFromLeft: number;
  // Position from the floor, in cm (0 = starts at floor level)
  offsetFromBottom: number;
  // Dimensions in cm
  width: number;
  height: number;
  depth: number; // how deep into the wall
  tileConfig?: TileConfig;
}

export interface Wall {
  id: string;
  label: string; // e.g. "A", "B", "C", "D"
  width: number; // cm
  height: number; // cm
  tileConfig?: TileConfig;
  geberits: Geberit[];
  niches: Niche[];
  doors: Door[];
  // For visual layout - which side of the room
  side: 'top' | 'right' | 'bottom' | 'left';
}

export interface ShowerCabin {
  id: string;
  // Which corner of the room the shower sits in
  corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  width: number; // cm — along horizontal wall (A or C)
  depth: number; // cm — along vertical wall (B or D)
  // Which wall the floor slopes toward for drainage
  slopeWall: 'A' | 'B' | 'C' | 'D';
  // Prefabricated shower tray — no tiling inside, acts as floor obstacle
  prefabricated?: boolean;
  // Separate tile config for the shower floor (e.g., mosaic for slope)
  floorTileConfig?: TileConfig;
}

export interface Room {
  id: string;
  name: string;
  // Room dimensions in cm (measured on empty room)
  width: number;
  depth: number;
  height: number; // wall height
  walls: Wall[];
  floorTileConfig?: TileConfig;
  showerCabins: ShowerCabin[];
  // Tile + adhesive thickness in cm (affects adjacent wall/floor dimensions)
  tileThickness: number; // default 1.5
}

export interface TileCalculation {
  wallId: string;
  wallLabel: string;
  totalArea: number; // sq m
  geberitAreas: { id: string; area: number }[];
  netArea: number; // sq m (total - geberit faces that don't need main tiles)
  tilesNeeded: number;
  tilesWithWaste: number; // +10% waste
  cuts: number; // estimated number of cuts
}

export interface RoomCalculation {
  roomName: string;
  wallCalculations: TileCalculation[];
  floorArea: number;
  floorTilesNeeded: number;
  floorTilesWithWaste: number;
  totalTileArea: number;
}
