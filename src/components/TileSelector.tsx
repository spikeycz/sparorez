import type { TileConfig } from '../types';
import { DEFAULT_TILE_PRESETS } from '../utils/defaults';
import { useState } from 'react';
import {
  Box, Typography, Chip, Button, TextField, Collapse,
} from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';

interface Props {
  label: string;
  current?: TileConfig;
  onChange: (config: TileConfig | undefined) => void;
  /** Room-level tile palette. When provided, shown instead of default presets. */
  palette?: TileConfig[];
}

export default function TileSelector({ label, current, onChange, palette }: Props) {
  const [customW, setCustomW] = useState(current?.width.toString() || '');
  const [customH, setCustomH] = useState(current?.height.toString() || '');
  const [showCustom, setShowCustom] = useState(false);

  const presets = palette && palette.length > 0 ? palette : DEFAULT_TILE_PRESETS;

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

  const isSelected = (preset: TileConfig) =>
    current?.name === preset.name && current?.width === preset.width && current?.height === preset.height;

  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
        {presets.map((preset, idx) => (
          <Chip
            key={`${preset.name}-${idx}`}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {preset.name}
                {preset.decorImage && (
                  <Box
                    component="img"
                    src={preset.decorImage}
                    sx={{ width: 14, height: 14, objectFit: 'cover', borderRadius: 0.3 }}
                  />
                )}
              </Box>
            }
            onClick={() => handlePreset(preset)}
            variant={isSelected(preset) ? 'filled' : 'outlined'}
            color={isSelected(preset) ? 'primary' : 'default'}
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
      {!palette?.length && (
        <>
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
        </>
      )}
    </Box>
  );
}
