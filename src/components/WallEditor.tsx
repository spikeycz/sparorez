import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import type { Wall, Geberit, Door, Niche } from '../types';
import type { CornerObstacle } from '../utils/tileLayout';
import {
  Box, Paper, Typography, Button, TextField, IconButton, Chip, Collapse, Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import TileSelector from './TileSelector';
import WallElevation from './WallElevation';

interface Props {
  wall: Wall;
  onUpdate: (wall: Wall) => void;
  effectiveWidth?: number;
  effectiveHeight?: number;
  cornerObstacles?: CornerObstacle[];
  tilePalette?: import('../types').TileConfig[];
}

const SIDE_LABELS: Record<string, string> = {
  top: 'horní', right: 'pravá', bottom: 'dolní', left: 'levá',
};

export default function WallEditor({ wall, onUpdate, effectiveWidth, effectiveHeight, cornerObstacles, tilePalette }: Props) {
  const [editingGeberit, setEditingGeberit] = useState<string | null>(null);
  const [editingNiche, setEditingNiche] = useState<string | null>(null);
  const [editingDoor, setEditingDoor] = useState<string | null>(null);

  const addGeberit = () => {
    const g: Geberit = { id: uuid(), offsetFromLeft: 20, width: 50, height: 112, depth: 20 };
    onUpdate({ ...wall, geberits: [...wall.geberits, g] });
    setEditingGeberit(g.id);
  };

  const updateGeberit = (id: string, updates: Partial<Geberit>) => {
    onUpdate({ ...wall, geberits: wall.geberits.map(g => g.id === id ? { ...g, ...updates } : g) });
  };

  const removeGeberit = (id: string) => {
    onUpdate({ ...wall, geberits: wall.geberits.filter(g => g.id !== id) });
    if (editingGeberit === id) setEditingGeberit(null);
  };

  const addNiche = () => {
    const n: Niche = { id: uuid(), offsetFromLeft: 20, offsetFromBottom: 0, width: 30, height: wall.height, depth: 30 };
    onUpdate({ ...wall, niches: [...(wall.niches ?? []), n] });
    setEditingNiche(n.id);
  };

  const updateNiche = (id: string, updates: Partial<Niche>) => {
    onUpdate({ ...wall, niches: (wall.niches ?? []).map(n => n.id === id ? { ...n, ...updates } : n) });
  };

  const removeNiche = (id: string) => {
    onUpdate({ ...wall, niches: (wall.niches ?? []).filter(n => n.id !== id) });
    if (editingNiche === id) setEditingNiche(null);
  };

  const addDoor = () => {
    const d: Door = { id: uuid(), offsetFromLeft: 30, width: 70, height: 197 };
    onUpdate({ ...wall, doors: [...wall.doors, d] });
    setEditingDoor(d.id);
  };

  const updateDoor = (id: string, updates: Partial<Door>) => {
    onUpdate({ ...wall, doors: wall.doors.map(d => d.id === id ? { ...d, ...updates } : d) });
  };

  const removeDoor = (id: string) => {
    onUpdate({ ...wall, doors: wall.doors.filter(d => d.id !== id) });
    if (editingDoor === id) setEditingDoor(null);
  };

  const showEffective =
    (effectiveWidth !== undefined && Math.abs(effectiveWidth - wall.width) > 0.01) ||
    (effectiveHeight !== undefined && Math.abs(effectiveHeight - wall.height) > 0.01);

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="h6">
          Stěna {wall.label}
          <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
            ({SIDE_LABELS[wall.side]})
          </Typography>
        </Typography>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {wall.width} × {wall.height} cm
        {showEffective && (
          <Chip
            label={`efektivní: ${effectiveWidth?.toFixed(1)} × ${effectiveHeight?.toFixed(1)} cm`}
            size="small"
            color="warning"
            variant="outlined"
            sx={{ ml: 1 }}
          />
        )}
      </Typography>

      {/* Wall elevation */}
      <WallElevation wall={wall} effectiveWidth={effectiveWidth} effectiveHeight={effectiveHeight} cornerObstacles={cornerObstacles} />

      {/* Tile config */}
      <Box sx={{ mt: 2 }}>
        <TileSelector
          label="Dlaždice na stěnu"
          current={wall.tileConfig}
          onChange={config => onUpdate({ ...wall, tileConfig: config })}
          palette={tilePalette}
        />
      </Box>

      {/* Geberits */}
      <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>WC moduly</Typography>
          <Button size="small" variant="outlined" color="secondary" startIcon={<AddIcon />} onClick={addGeberit}>
            Přidat WC modul
          </Button>
        </Box>

        {wall.geberits.map(g => (
          <Paper
            key={g.id} variant="outlined"
            sx={{
              p: 1.5, mb: 1,
              borderColor: editingGeberit === g.id ? 'secondary.main' : 'divider',
              bgcolor: editingGeberit === g.id ? 'action.hover' : 'transparent',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Chip label="WC modul" size="small" color="secondary" variant="outlined" />
              <Box>
                <IconButton size="small" onClick={() => setEditingGeberit(editingGeberit === g.id ? null : g.id)}>
                  {editingGeberit === g.id ? <CloseIcon fontSize="small" /> : <EditIcon fontSize="small" />}
                </IconButton>
                <IconButton size="small" color="error" onClick={() => removeGeberit(g.id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            <Collapse in={editingGeberit === g.id}>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1.5 }}>
                <TextField label="Od levého kraje (cm)" type="number" value={g.offsetFromLeft}
                  onChange={e => updateGeberit(g.id, { offsetFromLeft: Math.max(0, parseInt(e.target.value) || 0) })}
                  sx={{ width: 130 }} />
                <TextField label="Šířka (cm)" type="number" value={g.width}
                  onChange={e => updateGeberit(g.id, { width: Math.max(1, parseInt(e.target.value) || 0) })}
                  sx={{ width: 100 }} />
                <TextField label="Výška (cm)" type="number" value={g.height}
                  onChange={e => updateGeberit(g.id, { height: Math.max(1, parseInt(e.target.value) || 0) })}
                  sx={{ width: 100 }} />
                <TextField label="Hloubka (cm)" type="number" value={g.depth}
                  onChange={e => updateGeberit(g.id, { depth: Math.max(1, parseInt(e.target.value) || 0) })}
                  sx={{ width: 100 }} />
              </Stack>
              <TileSelector
                label="Dlaždice na WC modul"
                current={g.tileConfig}
                onChange={config => updateGeberit(g.id, { tileConfig: config })}
                palette={tilePalette}
              />
            </Collapse>

            {editingGeberit !== g.id && (
              <Typography variant="caption" color="text.secondary">
                {g.width}×{g.height}×{g.depth} cm, pozice: {g.offsetFromLeft} cm od levého kraje
                {g.tileConfig && <> | Dlaždice: {g.tileConfig.name}</>}
              </Typography>
            )}
          </Paper>
        ))}

        {wall.geberits.length === 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Žádné WC moduly na této stěně
          </Typography>
        )}
      </Box>

      {/* Niches */}
      <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Výklenky (do zdi)</Typography>
          <Button size="small" variant="outlined" color="primary" startIcon={<AddIcon />} onClick={addNiche}>
            Přidat výklenek
          </Button>
        </Box>

        {(wall.niches ?? []).map(n => (
          <Paper
            key={n.id} variant="outlined"
            sx={{
              p: 1.5, mb: 1,
              borderColor: editingNiche === n.id ? 'primary.main' : 'divider',
              bgcolor: editingNiche === n.id ? 'action.hover' : 'transparent',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Chip label="Výklenek" size="small" color="primary" variant="outlined" />
              <Box>
                <IconButton size="small" onClick={() => setEditingNiche(editingNiche === n.id ? null : n.id)}>
                  {editingNiche === n.id ? <CloseIcon fontSize="small" /> : <EditIcon fontSize="small" />}
                </IconButton>
                <IconButton size="small" color="error" onClick={() => removeNiche(n.id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            <Collapse in={editingNiche === n.id}>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1.5 }}>
                <TextField label="Od levého kraje (cm)" type="number" value={n.offsetFromLeft}
                  onChange={e => updateNiche(n.id, { offsetFromLeft: Math.max(0, parseInt(e.target.value) || 0) })}
                  sx={{ width: 130 }} />
                <TextField label="Od podlahy (cm)" type="number" value={n.offsetFromBottom}
                  onChange={e => updateNiche(n.id, { offsetFromBottom: Math.max(0, parseInt(e.target.value) || 0) })}
                  sx={{ width: 120 }} />
                <TextField label="Šířka (cm)" type="number" value={n.width}
                  onChange={e => updateNiche(n.id, { width: Math.max(1, parseInt(e.target.value) || 0) })}
                  sx={{ width: 100 }} />
                <TextField label="Výška (cm)" type="number" value={n.height}
                  onChange={e => updateNiche(n.id, { height: Math.max(1, parseInt(e.target.value) || 0) })}
                  sx={{ width: 100 }} />
                <TextField label="Hloubka (cm)" type="number" value={n.depth}
                  onChange={e => updateNiche(n.id, { depth: Math.max(1, parseInt(e.target.value) || 0) })}
                  sx={{ width: 100 }} />
              </Stack>
              <TileSelector
                label="Dlaždice výklenku"
                current={n.tileConfig}
                onChange={config => updateNiche(n.id, { tileConfig: config })}
                palette={tilePalette}
              />
            </Collapse>

            {editingNiche !== n.id && (
              <Typography variant="caption" color="text.secondary">
                {n.width}×{n.height}×{n.depth} cm, pozice: {n.offsetFromLeft} cm od kraje, {n.offsetFromBottom} cm od podlahy
                {n.tileConfig && <> | Dlaždice: {n.tileConfig.name}</>}
              </Typography>
            )}
          </Paper>
        ))}

        {(wall.niches ?? []).length === 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Žádné výklenky na této stěně
          </Typography>
        )}
      </Box>

      {/* Doors */}
      <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Dveře</Typography>
          <Button size="small" variant="outlined" color="primary" startIcon={<AddIcon />} onClick={addDoor}>
            Přidat dveře
          </Button>
        </Box>

        {wall.doors.map(d => (
          <Paper
            key={d.id} variant="outlined"
            sx={{
              p: 1.5, mb: 1,
              borderColor: editingDoor === d.id ? 'primary.main' : 'divider',
              bgcolor: editingDoor === d.id ? 'action.hover' : 'transparent',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Chip label="Dveře" size="small" color="primary" variant="outlined" />
              <Box>
                <IconButton size="small" onClick={() => setEditingDoor(editingDoor === d.id ? null : d.id)}>
                  {editingDoor === d.id ? <CloseIcon fontSize="small" /> : <EditIcon fontSize="small" />}
                </IconButton>
                <IconButton size="small" color="error" onClick={() => removeDoor(d.id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            <Collapse in={editingDoor === d.id}>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <TextField label="Od levého kraje (cm)" type="number" value={d.offsetFromLeft}
                  onChange={e => updateDoor(d.id, { offsetFromLeft: Math.max(0, parseInt(e.target.value) || 0) })}
                  sx={{ width: 130 }} />
                <TextField label="Šířka (cm)" type="number" value={d.width}
                  onChange={e => updateDoor(d.id, { width: Math.max(1, parseInt(e.target.value) || 0) })}
                  sx={{ width: 100 }} />
                <TextField label="Výška (cm)" type="number" value={d.height}
                  onChange={e => updateDoor(d.id, { height: Math.max(1, parseInt(e.target.value) || 0) })}
                  sx={{ width: 100 }} />
              </Stack>
            </Collapse>

            {editingDoor !== d.id && (
              <Typography variant="caption" color="text.secondary">
                {d.width}×{d.height} cm, pozice: {d.offsetFromLeft} cm od levého kraje
              </Typography>
            )}
          </Paper>
        ))}

        {wall.doors.length === 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Žádné dveře na této stěně
          </Typography>
        )}
      </Box>
    </Paper>
  );
}
