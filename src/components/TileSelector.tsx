import type { TileConfig } from '../types';
import { DEFAULT_TILE_PRESETS } from '../utils/defaults';
import { useState } from 'react';
import {
  Box, Typography, Chip, Button, TextField, Collapse,
} from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import ImageIcon from '@mui/icons-material/Image';
import DeleteIcon from '@mui/icons-material/Delete';

interface Props {
  label: string;
  current?: TileConfig;
  onChange: (config: TileConfig | undefined) => void;
}

export default function TileSelector({ label, current, onChange }: Props) {
  const [customW, setCustomW] = useState(current?.width.toString() || '');
  const [customH, setCustomH] = useState(current?.height.toString() || '');
  const [showCustom, setShowCustom] = useState(false);

  const handlePreset = (preset: TileConfig) => {
    onChange(preset);
    setShowCustom(false);
  };

  const handleCustom = () => {
    const w = parseInt(customW);
    const h = parseInt(customH);
    if (w > 0 && h > 0) {
      onChange({ width: w, height: h, name: `${w}×${h}`, color: '#94a3b8' });
    }
  };

  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
        {DEFAULT_TILE_PRESETS.map(preset => (
          <Chip
            key={preset.name}
            label={preset.name}
            onClick={() => handlePreset(preset)}
            variant={current?.name === preset.name ? 'filled' : 'outlined'}
            color={current?.name === preset.name ? 'primary' : 'default'}
            size="small"
            icon={
              <Box
                component="span"
                sx={{
                  width: 12, height: 12, bgcolor: preset.color,
                  borderRadius: 0.5, border: '1px solid rgba(0,0,0,0.15)',
                  display: 'inline-block', ml: 0.5,
                }}
              />
            }
          />
        ))}
        <Chip
          label="Bez dlaždic"
          onClick={() => onChange(undefined)}
          variant={!current ? 'filled' : 'outlined'}
          color={!current ? 'error' : 'default'}
          size="small"
          icon={<BlockIcon sx={{ fontSize: 14 }} />}
        />
      </Box>
      {/* Decor image upload */}
      {current && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Button
            component="label"
            size="small"
            variant="outlined"
            startIcon={<ImageIcon />}
            sx={{ fontSize: 12, textTransform: 'none' }}
          >
            {current.decorImage ? 'Změnit dekor' : 'Nahrát dekor'}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const img = new Image();
                img.onload = () => {
                  // Resize to max 256px to keep localStorage usage small
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
                  onChange({ ...current, decorImage: dataUrl });
                  URL.revokeObjectURL(img.src);
                };
                img.src = URL.createObjectURL(file);
                e.target.value = '';
              }}
            />
          </Button>
          {current.decorImage && (
            <>
              <Box
                component="img"
                src={current.decorImage}
                sx={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 0.5, border: '1px solid #ccc' }}
              />
              <Button
                size="small"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => onChange({ ...current, decorImage: undefined })}
                sx={{ fontSize: 12, textTransform: 'none', minWidth: 'auto' }}
              >
                Odstranit
              </Button>
            </>
          )}
        </Box>
      )}
      <Button
        size="small"
        variant="text"
        onClick={() => setShowCustom(!showCustom)}
        sx={{ fontSize: 12, p: 0, minWidth: 'auto' }}
      >
        Vlastní rozměr...
      </Button>
      <Collapse in={showCustom}>
        <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
          <TextField
            type="number"
            label="Šířka"
            value={customW}
            onChange={e => setCustomW(e.target.value)}
            sx={{ width: 80 }}
            size="small"
          />
          <Typography variant="body2">×</Typography>
          <TextField
            type="number"
            label="Výška"
            value={customH}
            onChange={e => setCustomH(e.target.value)}
            sx={{ width: 80 }}
            size="small"
          />
          <Typography variant="caption" color="text.secondary">cm</Typography>
          <Button variant="contained" size="small" onClick={handleCustom}>
            Nastavit
          </Button>
        </Box>
      </Collapse>
    </Box>
  );
}
