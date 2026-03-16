import { useState, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import type { Room, Wall, ShowerCabin } from '../types';
import {
  Box, Paper, TextField, Typography, Button, Select, MenuItem, FormControlLabel, Checkbox,
  Chip, Collapse, IconButton, Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import ShowerIcon from '@mui/icons-material/Shower';
import RoomFloorPlan from './RoomFloorPlan';
import WallEditor from './WallEditor';
import TileSelector from './TileSelector';
import FloorElevation from './FloorElevation';
import { getEffectiveDimensions } from '../utils/effectiveDimensions';
import { getCornerGeberitObstacles } from '../utils/tileLayout';

interface Props {
  room: Room;
  onUpdate: (room: Room) => void;
}

export default function RoomEditor({ room, onUpdate }: Props) {
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const [editingShower, setEditingShower] = useState<string | null>(null);
  const selectedWall = room.walls.find(w => w.id === selectedWallId);
  const selectedWallIdx = room.walls.findIndex(w => w.id === selectedWallId);

  const effectiveDims = useMemo(() => getEffectiveDimensions(room), [room]);

  const updateWall = (updated: Wall) => {
    onUpdate({
      ...room,
      walls: room.walls.map(w => w.id === updated.id ? updated : w),
    });
  };

  const updateRoomDimensions = (field: 'width' | 'depth' | 'height', value: number) => {
    const updated = { ...room, [field]: Math.max(1, value) };
    updated.walls = updated.walls.map(w => {
      if (w.side === 'top' || w.side === 'bottom') {
        return { ...w, width: updated.width, height: updated.height };
      } else {
        return { ...w, width: updated.depth, height: updated.height };
      }
    });
    onUpdate(updated);
  };

  return (
    <Box>
      {/* Room dimensions */}
      <Paper sx={{ p: 2, mb: 2 }} variant="outlined">
        <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
          <TextField
            label="Název"
            value={room.name}
            onChange={e => onUpdate({ ...room, name: e.target.value })}
            sx={{ width: 150 }}
          />
          <TextField
            label="Šířka (cm)"
            type="number"
            value={room.width}
            onChange={e => updateRoomDimensions('width', parseInt(e.target.value) || 0)}
            sx={{ width: 110 }}
          />
          <TextField
            label="Hloubka (cm)"
            type="number"
            value={room.depth}
            onChange={e => updateRoomDimensions('depth', parseInt(e.target.value) || 0)}
            sx={{ width: 110 }}
          />
          <TextField
            label="Výška (cm)"
            type="number"
            value={room.height}
            onChange={e => updateRoomDimensions('height', parseInt(e.target.value) || 0)}
            sx={{ width: 110 }}
          />
          <TextField
            label="Obklad+lepidlo (cm)"
            type="number"
            value={room.tileThickness ?? 1.5}
            slotProps={{ htmlInput: { step: 0.1, min: 0 } }}
            onChange={e => onUpdate({ ...room, tileThickness: Math.max(0, parseFloat(e.target.value) || 0) })}
            sx={{ width: 130 }}
          />
        </Stack>
      </Paper>

      <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>
        {/* Left column: floor plan + floor tile config + showers */}
        <Box sx={{ flex: '0 0 auto' }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
            Půdorys — klikni na stěnu
          </Typography>
          <RoomFloorPlan
            room={room}
            selectedWallId={selectedWallId}
            onSelectWall={setSelectedWallId}
          />

          {/* Floor tile config */}
          <Paper variant="outlined" sx={{ mt: 1.5, p: 1.5 }}>
            <TileSelector
              label="Podlahové dlaždice"
              current={room.floorTileConfig}
              onChange={config => onUpdate({ ...room, floorTileConfig: config })}
            />
          </Paper>

          {/* Shower cabins */}
          <Paper variant="outlined" sx={{ mt: 1.5, p: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ShowerIcon fontSize="small" /> Sprchový kout
              </Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => {
                  const sc: ShowerCabin = {
                    id: uuid(), corner: 'top-left', width: 100, depth: 100, slopeWall: 'D',
                  };
                  onUpdate({ ...room, showerCabins: [...(room.showerCabins ?? []), sc] });
                  setEditingShower(sc.id);
                }}
              >
                Přidat
              </Button>
            </Box>

            {(room.showerCabins ?? []).map(sc => (
              <Paper
                key={sc.id}
                variant="outlined"
                sx={{
                  p: 1.5, mb: 1,
                  borderColor: editingShower === sc.id ? 'info.main' : 'divider',
                  bgcolor: editingShower === sc.id ? 'action.hover' : 'transparent',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Chip label="Sprcha" size="small" color="info" variant="outlined" />
                  <Box>
                    <IconButton size="small" onClick={() => setEditingShower(editingShower === sc.id ? null : sc.id)}>
                      {editingShower === sc.id ? <CloseIcon fontSize="small" /> : <EditIcon fontSize="small" />}
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => {
                      onUpdate({ ...room, showerCabins: room.showerCabins.filter(s => s.id !== sc.id) });
                      if (editingShower === sc.id) setEditingShower(null);
                    }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                <Collapse in={editingShower === sc.id}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
                    <Select
                      size="small"
                      value={sc.corner}
                      onChange={e => onUpdate({
                        ...room,
                        showerCabins: room.showerCabins.map(s => s.id === sc.id ? { ...s, corner: e.target.value as ShowerCabin['corner'] } : s),
                      })}
                      sx={{ minWidth: 180, fontSize: 13 }}
                    >
                      <MenuItem value="top-left">A+D (vlevo nahoře)</MenuItem>
                      <MenuItem value="top-right">A+B (vpravo nahoře)</MenuItem>
                      <MenuItem value="bottom-left">C+D (vlevo dole)</MenuItem>
                      <MenuItem value="bottom-right">B+C (vpravo dole)</MenuItem>
                    </Select>
                    <TextField
                      label="Šířka (cm)" type="number" value={sc.width}
                      onChange={e => onUpdate({
                        ...room,
                        showerCabins: room.showerCabins.map(s => s.id === sc.id ? { ...s, width: Math.max(1, parseInt(e.target.value) || 0) } : s),
                      })}
                      sx={{ width: 100 }}
                    />
                    <TextField
                      label="Hloubka (cm)" type="number" value={sc.depth}
                      onChange={e => onUpdate({
                        ...room,
                        showerCabins: room.showerCabins.map(s => s.id === sc.id ? { ...s, depth: Math.max(1, parseInt(e.target.value) || 0) } : s),
                      })}
                      sx={{ width: 100 }}
                    />
                    <Select
                      size="small"
                      value={sc.slopeWall}
                      onChange={e => onUpdate({
                        ...room,
                        showerCabins: room.showerCabins.map(s => s.id === sc.id ? { ...s, slopeWall: e.target.value as ShowerCabin['slopeWall'] } : s),
                      })}
                      sx={{ minWidth: 80, fontSize: 13 }}
                    >
                      <MenuItem value="A">Spád A</MenuItem>
                      <MenuItem value="B">Spád B</MenuItem>
                      <MenuItem value="C">Spád C</MenuItem>
                      <MenuItem value="D">Spád D</MenuItem>
                    </Select>
                  </Stack>
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={sc.prefabricated ?? false}
                        onChange={e => onUpdate({
                          ...room,
                          showerCabins: room.showerCabins.map(s => s.id === sc.id ? { ...s, prefabricated: e.target.checked } : s),
                        })}
                      />
                    }
                    label={<Typography variant="body2">Prefabrikovaná vanička (bez obkladů)</Typography>}
                  />
                  {!sc.prefabricated && (
                    <Box sx={{ mt: 1 }}>
                      <TileSelector
                        label="Dlaždice sprchového koutu"
                        current={sc.floorTileConfig}
                        onChange={config => onUpdate({
                          ...room,
                          showerCabins: room.showerCabins.map(s => s.id === sc.id ? { ...s, floorTileConfig: config } : s),
                        })}
                      />
                    </Box>
                  )}
                </Collapse>

                {editingShower !== sc.id && (
                  <Typography variant="caption" color="text.secondary">
                    {sc.width}×{sc.depth} cm, roh: {sc.corner}{sc.prefabricated ? ', prefabrikovaná' : `, spád: ${sc.slopeWall}`}
                    {sc.floorTileConfig && !sc.prefabricated && <> | Dlaždice: {sc.floorTileConfig.name}</>}
                  </Typography>
                )}
              </Paper>
            ))}

            {(room.showerCabins ?? []).length === 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                Žádný sprchový kout
              </Typography>
            )}
          </Paper>

          {/* Floor tile layout */}
          {room.floorTileConfig && (
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                Podlaha — rozložení dlaždic
              </Typography>
              <FloorElevation
                room={room}
                effectiveWidth={effectiveDims.floor.width}
                effectiveDepth={effectiveDims.floor.depth}
              />
            </Box>
          )}
        </Box>

        {/* Right column: wall detail */}
        <Box sx={{ flex: 1, minWidth: 400 }}>
          {selectedWall && selectedWallIdx >= 0 ? (
            <WallEditor
              wall={selectedWall}
              onUpdate={updateWall}
              effectiveWidth={effectiveDims.walls[selectedWallIdx]?.width}
              effectiveHeight={effectiveDims.walls[selectedWallIdx]?.height}
              cornerObstacles={getCornerGeberitObstacles(
                room, selectedWallIdx,
                effectiveDims.walls[selectedWallIdx]?.width ?? selectedWall.width,
                effectiveDims.walls[selectedWallIdx]?.height ?? selectedWall.height,
              )}
            />
          ) : (
            <Paper
              variant="outlined"
              sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: 200, color: 'text.secondary', fontStyle: 'italic',
              }}
            >
              <Typography variant="body2">Vyber stěnu v půdorysu pro úpravu</Typography>
            </Paper>
          )}
        </Box>
      </Box>
    </Box>
  );
}
