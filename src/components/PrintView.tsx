import { useMemo, useEffect } from 'react';
import { Box, Button, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import type { Room } from '../types';
import { calculateRoom, formatArea } from '../utils/calculations';
import { getEffectiveDimensions } from '../utils/effectiveDimensions';
import WallElevation from './WallElevation';
import FloorElevation from './FloorElevation';
import { getCornerGeberitObstacles } from '../utils/tileLayout';

interface Props {
  rooms: Room[];
  onBack: () => void;
}

export default function PrintView({ rooms, onBack }: Props) {
  const results = useMemo(() => rooms.map(room => ({
    room,
    calc: calculateRoom(room),
    dims: getEffectiveDimensions(room),
  })), [rooms]);

  const tileSummary = useMemo(() => {
    const summary: Record<string, { name: string; color: string; area: number; tiles: number; tilesWithWaste: number }> = {};
    results.forEach(({ room, calc }) => {
      calc.wallCalculations.forEach((wc, idx) => {
        const wall = room.walls[idx];
        if (wall.tileConfig) {
          const key = wall.tileConfig.name;
          if (!summary[key]) summary[key] = { name: key, color: wall.tileConfig.color, area: 0, tiles: 0, tilesWithWaste: 0 };
          summary[key].area += wc.netArea;
          summary[key].tiles += wc.tilesNeeded;
          summary[key].tilesWithWaste += wc.tilesWithWaste;
        }
        wall.geberits.forEach(g => {
          if (g.tileConfig) {
            const gKey = g.tileConfig.name;
            const totalArea = ((g.width * g.height) + (g.width * g.depth) + (2 * g.depth * g.height)) / 10000;
            const tileArea = (g.tileConfig.width * g.tileConfig.height) / 10000;
            const tiles = Math.ceil(totalArea / tileArea);
            if (!summary[gKey]) summary[gKey] = { name: gKey, color: g.tileConfig.color, area: 0, tiles: 0, tilesWithWaste: 0 };
            summary[gKey].area += totalArea;
            summary[gKey].tiles += tiles;
            summary[gKey].tilesWithWaste += Math.ceil(tiles * 1.1);
          }
        });

        (wall.niches ?? []).forEach(n => {
          if (n.tileConfig) {
            const nKey = n.tileConfig.name;
            const backArea = (n.width * n.height) / 10000;
            const sideArea = (2 * n.depth * n.height) / 10000;
            const topArea = (n.width * n.depth) / 10000;
            const bottomArea = n.offsetFromBottom > 0 ? (n.width * n.depth) / 10000 : 0;
            const totalArea = backArea + sideArea + topArea + bottomArea;
            const tileArea = (n.tileConfig.width * n.tileConfig.height) / 10000;
            const tiles = Math.ceil(totalArea / tileArea);
            if (!summary[nKey]) summary[nKey] = { name: nKey, color: n.tileConfig.color, area: 0, tiles: 0, tilesWithWaste: 0 };
            summary[nKey].area += totalArea;
            summary[nKey].tiles += tiles;
            summary[nKey].tilesWithWaste += Math.ceil(tiles * 1.1);
          }
        });
      });
      if (room.floorTileConfig) {
        const fKey = room.floorTileConfig.name;
        if (!summary[fKey]) summary[fKey] = { name: fKey, color: room.floorTileConfig.color, area: 0, tiles: 0, tilesWithWaste: 0 };
        summary[fKey].area += calc.floorArea;
        summary[fKey].tiles += calc.floorTilesNeeded;
        summary[fKey].tilesWithWaste += calc.floorTilesWithWaste;
      }
    });
    return summary;
  }, [results]);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const cellSx = { fontSize: 11, py: 0.5, px: 1 };
  const headerSx = { ...cellSx, fontWeight: 600, color: 'text.secondary' };

  return (
    <Box className="print-view" sx={{ fontFamily: '"Open Sans", sans-serif', bgcolor: '#fff', p: 2.5 }}>
      {/* Screen controls */}
      <Box className="no-print" sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={onBack}>
          Zpět na editor
        </Button>
        <Button variant="contained" startIcon={<PrintIcon />} onClick={() => window.print()}>
          Tisk / Uložit PDF
        </Button>
      </Box>

      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5, fontFamily: '"Ubuntu", sans-serif' }}>
        <Box component="span" sx={{ color: '#1e293b' }}>Sparořez</Box>
        {' — rozpis obkladů a dlažby'}
      </Typography>

      {results.map(({ room, calc, dims }, roomIdx) => (
        <Box key={room.id} sx={{ pageBreakBefore: roomIdx > 0 ? 'always' : undefined, mb: 3 }}>
          <Typography variant="h6" sx={{ borderBottom: 2, borderColor: 'text.primary', pb: 0.5, mb: 1 }}>
            {room.name} — {room.width} × {room.depth} cm, výška {room.height} cm
          </Typography>

          {(room.showerCabins ?? []).length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              {room.showerCabins.map(sc => (
                <span key={sc.id}>
                  Sprchový kout: {sc.width}×{sc.depth} cm, roh: {sc.corner}
                  {sc.prefabricated ? ' (prefabrikovaná vanička)' : `, spád: ${sc.slopeWall}`}{' '}
                </span>
              ))}
            </Typography>
          )}

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={headerSx}>Plocha</TableCell>
                  <TableCell align="right" sx={headerSx}>Rozměr</TableCell>
                  <TableCell align="right" sx={headerSx}>Efektivní</TableCell>
                  <TableCell align="right" sx={headerSx}>Dlaždice</TableCell>
                  <TableCell align="right" sx={headerSx}>m²</TableCell>
                  <TableCell align="right" sx={headerSx}>Kusů</TableCell>
                  <TableCell align="right" sx={headerSx}>+10%</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {calc.wallCalculations.map((wc, idx) => {
                  const wall = room.walls[idx];
                  const eff = dims.walls[idx];
                  return (
                    <TableRow key={wc.wallId}>
                      <TableCell sx={cellSx}>Stěna {wc.wallLabel}</TableCell>
                      <TableCell align="right" sx={cellSx}>{wall.width}×{wall.height}</TableCell>
                      <TableCell align="right" sx={cellSx}>{Math.round(eff.width * 10) / 10}×{Math.round(eff.height * 10) / 10}</TableCell>
                      <TableCell align="right" sx={cellSx}>{wall.tileConfig?.name || '—'}</TableCell>
                      <TableCell align="right" sx={cellSx}>{formatArea(wc.netArea)}</TableCell>
                      <TableCell align="right" sx={cellSx}>{wc.tilesNeeded || '—'}</TableCell>
                      <TableCell align="right" sx={{ ...cellSx, fontWeight: 600 }}>{wc.tilesWithWaste || '—'}</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow>
                  <TableCell sx={cellSx}>Podlaha</TableCell>
                  <TableCell align="right" sx={cellSx}>{room.width}×{room.depth}</TableCell>
                  <TableCell align="right" sx={cellSx}>{Math.round(dims.floor.width * 10) / 10}×{Math.round(dims.floor.depth * 10) / 10}</TableCell>
                  <TableCell align="right" sx={cellSx}>{room.floorTileConfig?.name || '—'}</TableCell>
                  <TableCell align="right" sx={cellSx}>{formatArea(calc.floorArea)}</TableCell>
                  <TableCell align="right" sx={cellSx}>{calc.floorTilesNeeded || '—'}</TableCell>
                  <TableCell align="right" sx={{ ...cellSx, fontWeight: 600 }}>{calc.floorTilesWithWaste || '—'}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {room.floorTileConfig && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                Podlaha — rozložení dlaždic
              </Typography>
              <FloorElevation room={room} effectiveWidth={dims.floor.width} effectiveDepth={dims.floor.depth} />
            </Box>
          )}

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {room.walls.map((wall, idx) => {
              if (!wall.tileConfig) return null;
              return (
                <Box key={wall.id} sx={{ flex: '0 0 auto', pageBreakInside: 'avoid' }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    Stěna {wall.label}
                  </Typography>
                  <WallElevation
                    wall={wall}
                    effectiveWidth={dims.walls[idx]?.width}
                    effectiveHeight={dims.walls[idx]?.height}
                    cornerObstacles={getCornerGeberitObstacles(
                      room, idx,
                      dims.walls[idx]?.width ?? wall.width,
                      dims.walls[idx]?.height ?? wall.height,
                    )}
                  />
                </Box>
              );
            })}
          </Box>
        </Box>
      ))}

      {/* Grand total */}
      <Box sx={{ pageBreakBefore: 'always' }}>
        <Typography variant="h6" color="primary" sx={{ borderBottom: 2, borderColor: 'primary.main', pb: 0.5, mb: 1 }}>
          Celkový souhrn — nákupní seznam
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headerSx}>Typ dlaždice</TableCell>
                <TableCell align="right" sx={headerSx}>Celkem m²</TableCell>
                <TableCell align="right" sx={headerSx}>Celkem kusů</TableCell>
                <TableCell align="right" sx={headerSx}>+10% prořez</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.values(tileSummary).map(ts => (
                <TableRow key={ts.name}>
                  <TableCell sx={cellSx}>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 10, height: 10, bgcolor: ts.color, borderRadius: 0.5, display: 'inline-block' }} />
                      {ts.name}
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={cellSx}>{formatArea(ts.area)}</TableCell>
                  <TableCell align="right" sx={cellSx}>{ts.tiles}</TableCell>
                  <TableCell align="right" sx={{ ...cellSx, fontWeight: 700, color: 'primary.main' }}>{ts.tilesWithWaste}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-view { padding: 0 !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 12mm; size: A4; }
        }
      `}</style>
    </Box>
  );
}
