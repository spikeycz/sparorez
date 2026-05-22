import {
  Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Chip, Box, Alert, Divider, Card, CardContent, Stack,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import type { Room } from '../types';
import { formatArea } from '../utils/calculations';
import { getEffectiveDimensions } from '../utils/effectiveDimensions';
import { calculateTileLayout, calculateFloorLayout, getCornerGeberitObstacles, type TileRect } from '../utils/tileLayout';

interface Props {
  rooms: Room[];
  purchasedTiles: Record<string, number>;
  onPurchasedChange: (tileName: string, qty: number) => void;
}

interface SurfaceEntry {
  roomName: string;
  surfaceName: string;
  areaSqm: number;
  /** Naive: ceil(area / tileArea) */
  simpleCount: number;
  /** From actual grid layout: fullTiles + cutTiles (each cut = 1 physical tile) */
  layoutCount: number;
  fullTiles: number;
  cutTiles: number;
  /** Tiles saved by reusing cut-off pieces (e.g. bottom+top edge from 1 tile) */
  reuseSavings: number;
}

interface TileUsage {
  tileName: string;
  tileColor: string;
  tileWidth: number;
  tileHeight: number;
  surfaces: SurfaceEntry[];
  totalArea: number;
  totalSimple: number;
  totalLayout: number;
  totalFull: number;
  totalCut: number;
  totalReuseSavings: number;
  /** Layout count minus reuse savings */
  totalWithReuse: number;
}

/**
 * Count how many cut tiles can be reused by pairing opposing edge cuts.
 * E.g. top+bottom rows in same column: one physical tile, cut once,
 * provides both the bottom piece and the leftover top piece.
 * In practice spáry (grout joints) + adhesive make this work even when
 * the math is tight.
 */
function calculateReuseSavings(tiles: TileRect[]): number {
  // Only consider real tiles (not over doors/geberits)
  const real = tiles.filter(t => !t.isOverDoor && !t.isOverGeberit);
  if (real.length === 0) return 0;

  // Find grid extents
  const eps = 0.5; // tolerance for float comparison
  const minY = Math.min(...real.map(t => t.y));
  const maxY = Math.max(...real.map(t => t.y));
  const minX = Math.min(...real.map(t => t.x));
  const maxX = Math.max(...real.map(t => t.x));

  // Y-axis pairing: top row + bottom row in same column
  // Top row = tiles at minY that are cut in Y; bottom row = tiles at maxY that are cut in Y
  const topRow = real.filter(t => Math.abs(t.y - minY) < eps && t.isCutY);
  const bottomRow = real.filter(t => Math.abs(t.y - maxY) < eps && t.isCutY);

  let ySavings = 0;
  const usedBottom = new Set<number>();
  for (const top of topRow) {
    // Find matching bottom tile in same X column
    const bi = bottomRow.findIndex((b, i) =>
      !usedBottom.has(i) && Math.abs(b.x - top.x) < eps && Math.abs(b.w - top.w) < eps
    );
    if (bi >= 0) {
      usedBottom.add(bi);
      ySavings++;
    }
  }

  // X-axis pairing: left column + right column in same row
  const leftCol = real.filter(t => Math.abs(t.x - minX) < eps && t.isCutX);
  const rightCol = real.filter(t => Math.abs(t.x - maxX) < eps && t.isCutX);

  let xSavings = 0;
  const usedRight = new Set<number>();
  for (const left of leftCol) {
    // Skip if this tile was already paired in Y (corner tile)
    const isCornerAlreadyPaired = topRow.some(t => Math.abs(t.x - left.x) < eps && Math.abs(t.y - left.y) < eps)
      || bottomRow.some(t => Math.abs(t.x - left.x) < eps && Math.abs(t.y - left.y) < eps);
    if (isCornerAlreadyPaired && (Math.abs(left.y - minY) < eps || Math.abs(left.y - maxY) < eps)) {
      // This corner tile was already counted in Y savings, skip for X
      continue;
    }
    const ri = rightCol.findIndex((r, i) =>
      !usedRight.has(i) && Math.abs(r.y - left.y) < eps && Math.abs(r.h - left.h) < eps
    );
    if (ri >= 0) {
      usedRight.add(ri);
      xSavings++;
    }
  }

  return ySavings + xSavings;
}

function buildTileUsage(rooms: Room[]): TileUsage[] {
  const usageMap: Record<string, TileUsage> = {};

  const getOrCreate = (name: string, color: string, w: number, h: number): TileUsage => {
    const key = `${name}|${w}x${h}`;
    if (!usageMap[key]) {
      usageMap[key] = {
        tileName: name, tileColor: color, tileWidth: w, tileHeight: h,
        surfaces: [], totalArea: 0, totalSimple: 0, totalLayout: 0, totalFull: 0, totalCut: 0,
        totalReuseSavings: 0, totalWithReuse: 0,
      };
    }
    return usageMap[key];
  };

  rooms.forEach(room => {
    const dims = getEffectiveDimensions(room);

    // Wall tiles
    room.walls.forEach((wall, idx) => {
      if (!wall.tileConfig) return;
      const tc = wall.tileConfig;
      const effW = dims.walls[idx]?.width ?? wall.width;
      const effH = dims.walls[idx]?.height ?? wall.height;
      const cornerObs = getCornerGeberitObstacles(room, idx, effW, effH);
      const layout = calculateTileLayout(wall, effW, effH, cornerObs);

      // Net area (wall minus doors minus geberits)
      const doorArea = wall.doors.reduce((s, d) => s + d.width * d.height, 0);
      const gebArea = wall.geberits.reduce((s, g) => s + g.width * g.height, 0);
      const netCm2 = effW * effH - doorArea - gebArea;
      const areaSqm = netCm2 / 10000;
      const tileAreaCm2 = tc.width * tc.height;
      const simpleCount = Math.ceil(netCm2 / tileAreaCm2);

      const layoutCount = layout ? layout.fullTiles + layout.cutTiles : simpleCount;
      const fullTiles = layout?.fullTiles ?? 0;
      const cutTiles = layout?.cutTiles ?? 0;
      const reuseSavings = layout ? calculateReuseSavings(layout.tiles) : 0;

      const usage = getOrCreate(tc.name, tc.color, tc.width, tc.height);
      usage.surfaces.push({
        roomName: room.name,
        surfaceName: `Stěna ${wall.label}`,
        areaSqm, simpleCount, layoutCount, fullTiles, cutTiles, reuseSavings,
      });
      usage.totalArea += areaSqm;
      usage.totalSimple += simpleCount;
      usage.totalLayout += layoutCount;
      usage.totalFull += fullTiles;
      usage.totalCut += cutTiles;
      usage.totalReuseSavings += reuseSavings;

      // Geberit face tiles (separate tile type potentially)
      wall.geberits.forEach(g => {
        if (!g.tileConfig) return;
        const gtc = g.tileConfig;
        const frontArea = g.width * g.height;
        const topArea = g.width * g.depth;
        const sideArea = 2 * g.depth * g.height;
        const totalCm2 = frontArea + topArea + sideArea;
        const gAreaSqm = totalCm2 / 10000;
        const gTileArea = gtc.width * gtc.height;
        const gSimple = Math.ceil(totalCm2 / gTileArea);
        // Geberit face layout is also computed in tileLayout — find it
        const gLayout = layout?.geberitLayouts.find(gl => gl.geberitId === g.id);
        const gLayoutCount = gLayout ? gLayout.fullTiles + gLayout.cutTiles : gSimple;
        const gFull = gLayout?.fullTiles ?? 0;
        const gCut = gLayout?.cutTiles ?? 0;

        const gReuse = gLayout ? calculateReuseSavings(gLayout.tiles) : 0;
        const gUsage = getOrCreate(gtc.name, gtc.color, gtc.width, gtc.height);
        gUsage.surfaces.push({
          roomName: room.name,
          surfaceName: `WC modul (stěna ${wall.label})`,
          areaSqm: gAreaSqm, simpleCount: gSimple, layoutCount: gLayoutCount,
          fullTiles: gFull, cutTiles: gCut, reuseSavings: gReuse,
        });
        gUsage.totalArea += gAreaSqm;
        gUsage.totalSimple += gSimple;
        gUsage.totalLayout += gLayoutCount;
        gUsage.totalFull += gFull;
        gUsage.totalCut += gCut;
        gUsage.totalReuseSavings += gReuse;
      });

      // Niche interior tiles
      (wall.niches ?? []).forEach(n => {
        if (!n.tileConfig) return;
        const ntc = n.tileConfig;
        // Interior surfaces: back wall + two sides + top (+ bottom if not at floor)
        const backArea = n.width * n.height;
        const sideArea = 2 * n.depth * n.height;
        const topArea = n.width * n.depth;
        const bottomArea = n.offsetFromBottom > 0 ? n.width * n.depth : 0;
        const totalCm2 = backArea + sideArea + topArea + bottomArea;
        const nAreaSqm = totalCm2 / 10000;
        const nTileArea = ntc.width * ntc.height;
        const nSimple = Math.ceil(totalCm2 / nTileArea);

        const nUsage = getOrCreate(ntc.name, ntc.color, ntc.width, ntc.height);
        nUsage.surfaces.push({
          roomName: room.name,
          surfaceName: `Výklenek (stěna ${wall.label})`,
          areaSqm: nAreaSqm, simpleCount: nSimple, layoutCount: nSimple,
          fullTiles: nSimple, cutTiles: 0, reuseSavings: 0,
        });
        nUsage.totalArea += nAreaSqm;
        nUsage.totalSimple += nSimple;
        nUsage.totalLayout += nSimple;
        nUsage.totalFull += nSimple;
      });
    });

    // Floor tiles
    if (room.floorTileConfig) {
      const tc = room.floorTileConfig;
      const effW = dims.floor.width;
      const effD = dims.floor.depth;
      const floorResult = calculateFloorLayout(room, effW, effD);

      const areaSqm = (effW * effD) / 10000;
      const tileAreaCm2 = tc.width * tc.height;
      const simpleCount = Math.ceil((effW * effD) / tileAreaCm2);

      const layoutCount = floorResult ? floorResult.layout.fullTiles + floorResult.layout.cutTiles : simpleCount;
      const fullTiles = floorResult?.layout.fullTiles ?? 0;
      const cutTiles = floorResult?.layout.cutTiles ?? 0;

      const floorReuse = floorResult ? calculateReuseSavings(floorResult.layout.tiles) : 0;
      const usage = getOrCreate(tc.name, tc.color, tc.width, tc.height);
      usage.surfaces.push({
        roomName: room.name, surfaceName: 'Podlaha',
        areaSqm, simpleCount, layoutCount, fullTiles, cutTiles, reuseSavings: floorReuse,
      });
      usage.totalArea += areaSqm;
      usage.totalSimple += simpleCount;
      usage.totalLayout += layoutCount;
      usage.totalFull += fullTiles;
      usage.totalCut += cutTiles;
      usage.totalReuseSavings += floorReuse;
    }

    // Shower floor tiles
    (room.showerCabins ?? []).forEach(sc => {
      if (sc.prefabricated || !sc.floorTileConfig) return;
      const tc = sc.floorTileConfig;
      const areaSqm = (sc.width * sc.depth) / 10000;
      const tileAreaCm2 = tc.width * tc.height;
      const simpleCount = Math.ceil((sc.width * sc.depth) / tileAreaCm2);
      // Shower floors are small; layout ~ simple for now
      const usage = getOrCreate(tc.name, tc.color, tc.width, tc.height);
      usage.surfaces.push({
        roomName: room.name, surfaceName: 'Sprchový kout',
        areaSqm, simpleCount, layoutCount: simpleCount,
        fullTiles: simpleCount, cutTiles: 0, reuseSavings: 0,
      });
      usage.totalArea += areaSqm;
      usage.totalSimple += simpleCount;
      usage.totalLayout += simpleCount;
      usage.totalFull += simpleCount;
      usage.totalCut += 0;
    });
  });

  const result = Object.values(usageMap);
  for (const u of result) {
    u.totalWithReuse = u.totalLayout - u.totalReuseSavings;
  }
  return result;
}

export default function TileInventoryCheck({ rooms, purchasedTiles, onPurchasedChange }: Props) {
  const tileUsages = buildTileUsage(rooms);

  if (tileUsages.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        Zatím nejsou přiřazeny žádné dlaždice. Vyberte dlaždice u jednotlivých stěn a podlah v editoru.
      </Alert>
    );
  }

  const anyEntered = tileUsages.some(u => (purchasedTiles[u.tileName] ?? 0) > 0);
  const allOk = anyEntered && tileUsages.every(u => {
    const purchased = purchasedTiles[u.tileName] ?? 0;
    return purchased === 0 || purchased >= u.totalWithReuse;
  });

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>
        Kontrola nakoupených dlaždic
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Porovnání skutečného počtu dlaždic z rozložení (včetně všech řezů, rohů a výřezů)
        s počtem, který jste nakoupili. Každá řezaná dlaždice = 1 fyzický kus.
      </Typography>

      {anyEntered && (
        <Alert
          severity={allOk ? 'success' : 'warning'}
          icon={allOk ? <CheckCircleIcon /> : <WarningIcon />}
          sx={{ mb: 3 }}
        >
          {allOk
            ? 'Všech dlaždic máte dostatek! Nakoupené množství pokrývá skutečnou potřebu z rozložení.'
            : 'Některých dlaždic nemáte dostatek oproti skutečnému rozložení. Zkontrolujte červeně/oranžově označené typy.'
          }
        </Alert>
      )}

      <Stack spacing={3}>
        {tileUsages.map(usage => {
          const purchased = purchasedTiles[usage.tileName] ?? 0;
          const hasInput = purchased > 0;

          // The key comparison: with-reuse count vs purchased
          const delta = purchased - usage.totalWithReuse;
          // How much waste does the layout produce vs simple area calc
          const wasteFromLayout = usage.totalLayout - usage.totalSimple;
          const wastePercent = usage.totalSimple > 0
            ? ((wasteFromLayout / usage.totalSimple) * 100) : 0;
          // The naive +10% count
          const naivePlusTen = Math.ceil(usage.totalSimple * 1.1);
          // Is the naive +10% enough for the actual layout?
          const tenPercentCovers = naivePlusTen >= usage.totalWithReuse;

          let statusColor: 'success' | 'warning' | 'error' = 'success';
          let statusLabel = '';
          let statusIcon = <CheckCircleIcon />;

          if (!hasInput) {
            // Show layout vs +10% status even without purchased input
            if (tenPercentCovers) {
              statusColor = 'success';
              statusLabel = `10% rezerva stačí (${naivePlusTen} ≥ ${usage.totalWithReuse})`;
              statusIcon = <CheckCircleIcon />;
            } else {
              statusColor = 'error';
              statusLabel = `10% rezerva NESTAČÍ! (${naivePlusTen} < ${usage.totalWithReuse})`;
              statusIcon = <ErrorIcon />;
            }
          } else if (delta >= 0) {
            statusColor = 'success';
            statusLabel = `OK (+${delta} navíc)`;
            statusIcon = <CheckCircleIcon />;
          } else {
            statusColor = 'error';
            statusLabel = `Chybí ${Math.abs(delta)} ks!`;
            statusIcon = <ErrorIcon />;
          }

          return (
            <Card key={usage.tileName} variant="outlined" sx={{
              borderColor: hasInput
                ? `${statusColor}.main`
                : (tenPercentCovers ? 'success.main' : 'error.main'),
              borderWidth: 2,
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{
                      width: 24, height: 24, bgcolor: usage.tileColor,
                      borderRadius: 1, border: '1px solid rgba(0,0,0,0.12)',
                    }} />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                        {usage.tileName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {usage.tileWidth} × {usage.tileHeight} cm
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    icon={statusIcon}
                    label={statusLabel}
                    color={statusColor}
                    variant="filled"
                    size="medium"
                  />
                </Box>

                <Divider sx={{ mb: 2 }} />

                {/* Per-room breakdown */}
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Místnost</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Plocha</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>m²</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Celé</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Řezané</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Bez reuse</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: 'success.main' }}>
                          Reuse ↓
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: 'primary.main' }}>
                          Potřeba
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {usage.surfaces.map((s, i) => (
                        <TableRow key={i}>
                          <TableCell sx={{ fontWeight: 500 }}>{s.roomName}</TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {s.surfaceName}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">{formatArea(s.areaSqm)}</TableCell>
                          <TableCell align="right">{s.fullTiles}</TableCell>
                          <TableCell align="right" sx={{ color: s.cutTiles > 0 ? 'warning.main' : undefined, fontWeight: s.cutTiles > 0 ? 600 : undefined }}>
                            {s.cutTiles}
                          </TableCell>
                          <TableCell align="right">
                            {s.layoutCount}
                          </TableCell>
                          <TableCell align="right" sx={{ color: s.reuseSavings > 0 ? 'success.main' : 'text.secondary', fontWeight: s.reuseSavings > 0 ? 700 : undefined }}>
                            {s.reuseSavings > 0 ? `−${s.reuseSavings}` : '–'}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main' }}>
                            {s.layoutCount - s.reuseSavings}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Totals row */}
                      <TableRow sx={{ '& td': { borderTop: 2, borderColor: 'divider', fontWeight: 700 } }}>
                        <TableCell>Celkem</TableCell>
                        <TableCell></TableCell>
                        <TableCell align="right">{formatArea(usage.totalArea)}</TableCell>
                        <TableCell align="right">{usage.totalFull}</TableCell>
                        <TableCell align="right" sx={{ color: 'warning.main' }}>{usage.totalCut}</TableCell>
                        <TableCell align="right">{usage.totalLayout}</TableCell>
                        <TableCell align="right" sx={{ color: 'success.main' }}>
                          {usage.totalReuseSavings > 0 ? `−${usage.totalReuseSavings}` : '–'}
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'primary.main', fontSize: '1rem' }}>
                          {usage.totalWithReuse}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Waste analysis */}
                <Paper variant="outlined" sx={{ mt: 2, p: 1.5, bgcolor: 'grey.50' }}>
                  <Stack direction="row" spacing={3} flexWrap="wrap" alignItems="center">
                    <Box>
                      <Typography variant="caption" color="text.secondary">Podle plochy (naivní)</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{usage.totalSimple} ks</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Rozložení (bez reuse)</Typography>
                      <Typography variant="body2">{usage.totalLayout} ks</Typography>
                    </Box>
                    {usage.totalReuseSavings > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">Reuse úspora</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>
                          −{usage.totalReuseSavings} ks
                        </Typography>
                      </Box>
                    )}
                    <Box>
                      <Typography variant="caption" color="text.secondary">Skutečná potřeba</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>{usage.totalWithReuse} ks</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Prořez z rozložení</Typography>
                      <Typography variant="body2" sx={{
                        fontWeight: 600,
                        color: wastePercent > 10 ? 'error.main' : wastePercent > 5 ? 'warning.main' : 'success.main',
                      }}>
                        +{wasteFromLayout} ks ({wastePercent.toFixed(1)}%)
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Naivní + 10%</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{naivePlusTen} ks</Typography>
                    </Box>
                    <Chip
                      size="small"
                      variant="filled"
                      color={tenPercentCovers ? 'success' : 'error'}
                      label={tenPercentCovers
                        ? `10% stačí (${naivePlusTen - usage.totalWithReuse} ks rezerva)`
                        : `10% NESTAČÍ! (chybí ${usage.totalWithReuse - naivePlusTen} ks)`
                      }
                    />
                  </Stack>
                </Paper>

                <Divider sx={{ my: 2 }} />

                {/* Purchase input */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                  <TextField
                    label="Nakoupeno (ks)"
                    type="number"
                    value={purchased || ''}
                    onChange={e => onPurchasedChange(usage.tileName, Math.max(0, parseInt(e.target.value) || 0))}
                    sx={{ width: 160 }}
                    slotProps={{ htmlInput: { min: 0 } }}
                    color={hasInput ? (delta >= 0 ? 'success' : 'error') : undefined}
                    focused={hasInput}
                  />
                  {hasInput && (
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Skutečná potřeba: <strong>{usage.totalWithReuse} ks</strong>
                        {usage.totalReuseSavings > 0 && ` (−${usage.totalReuseSavings} reuse)`}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 700, color: delta >= 0 ? 'success.main' : 'error.main' }}
                      >
                        {delta >= 0
                          ? `Přebytek: +${delta} ks`
                          : `Chybí: ${Math.abs(delta)} ks!`
                        }
                      </Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    </Box>
  );
}
