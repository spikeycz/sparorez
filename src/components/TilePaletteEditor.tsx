import { useState } from 'react';
import type { TileConfig } from '../types';
import {
  Box, Paper, Typography, Button, TextField, IconButton, Stack, Collapse, Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import ImageIcon from '@mui/icons-material/Image';
import PaletteIcon from '@mui/icons-material/Palette';

const PALETTE_COLORS = ['#64748b', '#3b82f6', '#cbd5e1', '#e2e8f0', '#1e293b', '#f59e0b', '#94a3b8', '#d4a574'];

interface Props {
  palette: TileConfig[];
  onChange: (palette: TileConfig[]) => void;
}

export default function TilePaletteEditor({ palette, onChange }: Props) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newW, setNewW] = useState('30');
  const [newH, setNewH] = useState('60');
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PALETTE_COLORS[0]);
  const [newDecorImage, setNewDecorImage] = useState<string | undefined>(undefined);

  const handleAdd = () => {
    const w = parseInt(newW);
    const h = parseInt(newH);
    if (w <= 0 || h <= 0) return;
    const name = newName.trim() || `${w}×${h}`;
    onChange([...palette, { width: w, height: h, name, color: newColor, decorImage: newDecorImage }]);
    setNewName('');
    setNewW('30');
    setNewH('60');
    setNewColor(PALETTE_COLORS[0]);
    setNewDecorImage(undefined);
    setAddOpen(false);
  };

  const handleRemove = (idx: number) => {
    onChange(palette.filter((_, i) => i !== idx));
    if (editingIdx === idx) setEditingIdx(null);
  };

  const handleUpdate = (idx: number, updates: Partial<TileConfig>) => {
    onChange(palette.map((t, i) => i === idx ? { ...t, ...updates } : t));
  };

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 256;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          const scale = MAX / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        URL.revokeObjectURL(img.src);
        resolve(dataUrl);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleDecorUpload = async (idx: number, file: File) => {
    const dataUrl = await resizeImage(file);
    handleUpdate(idx, { decorImage: dataUrl });
  };

  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <PaletteIcon fontSize="small" /> Paleta dlaždic
        </Typography>
        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setAddOpen(!addOpen)}>
          Přidat typ
        </Button>
      </Box>

      {palette.length === 0 && !addOpen && (
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          Zatím žádné dlaždice. Přidejte typy dlaždic, ze kterých pak vyberete na každou plochu.
        </Typography>
      )}

      {/* Existing tiles */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: palette.length > 0 ? 1 : 0 }}>
        {palette.map((tile, idx) => (
          <Box key={idx}>
            <Chip
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {tile.name} ({tile.width}×{tile.height})
                  {tile.decorImage && (
                    <Box
                      component="img"
                      src={tile.decorImage}
                      sx={{ width: 14, height: 14, objectFit: 'cover', borderRadius: 0.3 }}
                    />
                  )}
                </Box>
              }
              onClick={() => setEditingIdx(editingIdx === idx ? null : idx)}
              variant="outlined"
              size="small"
              onDelete={() => handleRemove(idx)}
              deleteIcon={<DeleteIcon sx={{ fontSize: 14 }} />}
              icon={
                <Box
                  component="span"
                  sx={{
                    width: 12, height: 12, bgcolor: tile.color,
                    borderRadius: 0.5, border: '1px solid rgba(0,0,0,0.15)',
                    display: 'inline-block', ml: 0.5,
                  }}
                />
              }
            />
          </Box>
        ))}
      </Box>

      {/* Edit existing tile */}
      {editingIdx !== null && editingIdx < palette.length && (
        <Paper variant="outlined" sx={{ p: 1.5, mb: 1, bgcolor: 'action.hover' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="caption" fontWeight={600}>Upravit: {palette[editingIdx].name}</Typography>
            <IconButton size="small" onClick={() => setEditingIdx(null)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" sx={{ mb: 1 }}>
            <TextField label="Název" value={palette[editingIdx].name} size="small"
              onChange={e => handleUpdate(editingIdx, { name: e.target.value })} sx={{ width: 130 }} />
            <TextField label="Šířka (cm)" type="number" value={palette[editingIdx].width} size="small"
              onChange={e => handleUpdate(editingIdx, { width: Math.max(1, parseInt(e.target.value) || 0) })} sx={{ width: 90 }} />
            <TextField label="Výška (cm)" type="number" value={palette[editingIdx].height} size="small"
              onChange={e => handleUpdate(editingIdx, { height: Math.max(1, parseInt(e.target.value) || 0) })} sx={{ width: 90 }} />
          </Stack>
          <Box sx={{ display: 'flex', gap: 0.5, mb: 1, alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>Barva:</Typography>
            {PALETTE_COLORS.map(c => (
              <Box
                key={c}
                onClick={() => handleUpdate(editingIdx, { color: c })}
                sx={{
                  width: 20, height: 20, bgcolor: c, borderRadius: 0.5, cursor: 'pointer',
                  border: palette[editingIdx].color === c ? '2px solid #1e293b' : '1px solid rgba(0,0,0,0.15)',
                }}
              />
            ))}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button component="label" size="small" variant="outlined" startIcon={<ImageIcon />}
              sx={{ fontSize: 12, textTransform: 'none' }}>
              {palette[editingIdx].decorImage ? 'Změnit dekor' : 'Nahrát dekor'}
              <input type="file" accept="image/*" hidden
                onChange={e => { const f = e.target.files?.[0]; if (f) handleDecorUpload(editingIdx, f); e.target.value = ''; }} />
            </Button>
            {palette[editingIdx].decorImage && (
              <>
                <Box component="img" src={palette[editingIdx].decorImage}
                  sx={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 0.5, border: '1px solid #ccc' }} />
                <Button size="small" color="error" onClick={() => handleUpdate(editingIdx, { decorImage: undefined })}
                  sx={{ fontSize: 12, textTransform: 'none', minWidth: 'auto' }}>
                  Odstranit
                </Button>
              </>
            )}
          </Box>
        </Paper>
      )}

      {/* Add new tile form */}
      <Collapse in={addOpen}>
        <Paper variant="outlined" sx={{ p: 1.5, mt: 1 }}>
          <Typography variant="caption" fontWeight={600} sx={{ mb: 1, display: 'block' }}>Nový typ dlaždice</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" sx={{ mb: 1 }}>
            <TextField label="Název" value={newName} placeholder="např. Hlavní obklad" size="small"
              onChange={e => setNewName(e.target.value)} sx={{ width: 160 }} />
            <TextField label="Šířka (cm)" type="number" value={newW} size="small"
              onChange={e => setNewW(e.target.value)} sx={{ width: 90 }} />
            <TextField label="Výška (cm)" type="number" value={newH} size="small"
              onChange={e => setNewH(e.target.value)} sx={{ width: 90 }} />
          </Stack>
          <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5, alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>Barva:</Typography>
            {PALETTE_COLORS.map(c => (
              <Box
                key={c}
                onClick={() => setNewColor(c)}
                sx={{
                  width: 20, height: 20, bgcolor: c, borderRadius: 0.5, cursor: 'pointer',
                  border: newColor === c ? '2px solid #1e293b' : '1px solid rgba(0,0,0,0.15)',
                }}
              />
            ))}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Button component="label" size="small" variant="outlined" startIcon={<ImageIcon />}
              sx={{ fontSize: 12, textTransform: 'none' }}>
              {newDecorImage ? 'Změnit dekor' : 'Nahrát dekor'}
              <input type="file" accept="image/*" hidden
                onChange={async e => { const f = e.target.files?.[0]; if (f) setNewDecorImage(await resizeImage(f)); e.target.value = ''; }} />
            </Button>
            {newDecorImage && (
              <>
                <Box component="img" src={newDecorImage}
                  sx={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 0.5, border: '1px solid #ccc' }} />
                <Button size="small" color="error" onClick={() => setNewDecorImage(undefined)}
                  sx={{ fontSize: 12, textTransform: 'none', minWidth: 'auto' }}>
                  Odstranit
                </Button>
              </>
            )}
          </Box>
          <Button variant="contained" size="small" onClick={handleAdd} startIcon={<AddIcon />}>
            Přidat do palety
          </Button>
        </Paper>
      </Collapse>
    </Paper>
  );
}
