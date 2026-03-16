import {
  Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Box, Divider,
} from '@mui/material';
import type { Room } from '../types';
import { calculateRoom, formatArea } from '../utils/calculations';

interface Props {
  rooms: Room[];
}

export default function CalculationSummary({ rooms }: Props) {
  const results = rooms.map(room => ({
    room,
    calc: calculateRoom(room),
  }));

  // Group tiles by config name across all rooms
  const tileSummary: Record<string, { name: string; color: string; area: number; tiles: number; tilesWithWaste: number }> = {};

  results.forEach(({ room, calc }) => {
    calc.wallCalculations.forEach((wc, idx) => {
      const wall = room.walls[idx];
      if (wall.tileConfig) {
        const key = wall.tileConfig.name;
        if (!tileSummary[key]) {
          tileSummary[key] = { name: key, color: wall.tileConfig.color, area: 0, tiles: 0, tilesWithWaste: 0 };
        }
        tileSummary[key].area += wc.netArea;
        tileSummary[key].tiles += wc.tilesNeeded;
        tileSummary[key].tilesWithWaste += wc.tilesWithWaste;
      }

      wall.geberits.forEach(g => {
        if (g.tileConfig) {
          const gKey = g.tileConfig.name;
          const frontArea = (g.width * g.height) / 10000;
          const topArea = (g.width * g.depth) / 10000;
          const sideArea = (2 * g.depth * g.height) / 10000;
          const totalArea = frontArea + topArea + sideArea;
          const tileArea = (g.tileConfig.width * g.tileConfig.height) / 10000;
          const tiles = Math.ceil(totalArea / tileArea);
          const tilesWithWaste = Math.ceil(tiles * 1.1);

          if (!tileSummary[gKey]) {
            tileSummary[gKey] = { name: gKey, color: g.tileConfig.color, area: 0, tiles: 0, tilesWithWaste: 0 };
          }
          tileSummary[gKey].area += totalArea;
          tileSummary[gKey].tiles += tiles;
          tileSummary[gKey].tilesWithWaste += tilesWithWaste;
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
          const tilesWithWaste = Math.ceil(tiles * 1.1);

          if (!tileSummary[nKey]) {
            tileSummary[nKey] = { name: nKey, color: n.tileConfig.color, area: 0, tiles: 0, tilesWithWaste: 0 };
          }
          tileSummary[nKey].area += totalArea;
          tileSummary[nKey].tiles += tiles;
          tileSummary[nKey].tilesWithWaste += tilesWithWaste;
        }
      });
    });

    if (room.floorTileConfig) {
      const fKey = room.floorTileConfig.name;
      if (!tileSummary[fKey]) {
        tileSummary[fKey] = { name: fKey, color: room.floorTileConfig.color, area: 0, tiles: 0, tilesWithWaste: 0 };
      }
      tileSummary[fKey].area += calc.floorArea;
      tileSummary[fKey].tiles += calc.floorTilesNeeded;
      tileSummary[fKey].tilesWithWaste += calc.floorTilesWithWaste;
    }
  });

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>Souhrn výpočtu</Typography>

      {results.map(({ room, calc }) => (
        <Box key={room.id} sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>{room.name}</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Plocha</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Rozměr</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Dlaždice</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>m²</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Kusů</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>+10%</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {calc.wallCalculations.map((wc, idx) => {
                  const wall = room.walls[idx];
                  return (
                    <TableRow key={wc.wallId}>
                      <TableCell>Stěna {wc.wallLabel}</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary' }}>
                        {wall.width}×{wall.height}
                      </TableCell>
                      <TableCell align="right">
                        {wall.tileConfig ? (
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{
                              width: 10, height: 10, bgcolor: wall.tileConfig.color,
                              borderRadius: 0.5, display: 'inline-block',
                            }} />
                            {wall.tileConfig.name}
                          </Box>
                        ) : '—'}
                      </TableCell>
                      <TableCell align="right">{formatArea(wc.netArea)}</TableCell>
                      <TableCell align="right">{wc.tilesNeeded || '—'}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>{wc.tilesWithWaste || '—'}</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow>
                  <TableCell>Podlaha</TableCell>
                  <TableCell align="right" sx={{ color: 'text.secondary' }}>
                    {room.width}×{room.depth}
                  </TableCell>
                  <TableCell align="right">
                    {room.floorTileConfig ? (
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{
                          width: 10, height: 10, bgcolor: room.floorTileConfig.color,
                          borderRadius: 0.5, display: 'inline-block',
                        }} />
                        {room.floorTileConfig.name}
                      </Box>
                    ) : '—'}
                  </TableCell>
                  <TableCell align="right">{formatArea(calc.floorArea)}</TableCell>
                  <TableCell align="right">{calc.floorTilesNeeded || '—'}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{calc.floorTilesWithWaste || '—'}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ))}

      <Divider sx={{ my: 2 }} />

      {/* Grand total by tile type */}
      <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
        Celkový souhrn podle typu dlaždic
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Typ dlaždice</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Celkem m²</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Celkem kusů</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>+10% prořez</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.values(tileSummary).map(ts => (
              <TableRow key={ts.name}>
                <TableCell>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{
                      width: 12, height: 12, bgcolor: ts.color,
                      borderRadius: 0.5, display: 'inline-block',
                    }} />
                    {ts.name}
                  </Box>
                </TableCell>
                <TableCell align="right">{formatArea(ts.area)}</TableCell>
                <TableCell align="right">{ts.tiles}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {ts.tilesWithWaste}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
