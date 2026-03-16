import { useState, useCallback, useEffect } from 'react';
import {
  AppBar, Toolbar, Typography, Button, Box, Tabs, Tab, Container, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  IconButton, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText, Divider, Chip,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PrintIcon from '@mui/icons-material/Print';
import HomeIcon from '@mui/icons-material/Home';
import CalculateIcon from '@mui/icons-material/Calculate';
import InventoryIcon from '@mui/icons-material/Inventory';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import PeopleIcon from '@mui/icons-material/People';
import type { Room } from './types';
import { createDefaultRooms } from './utils/defaults';
import { useUser } from './contexts/UserContext';
import UserSelector from './components/UserSelector';
import RoomEditor from './components/RoomEditor';
import CalculationSummary from './components/CalculationSummary';
import TileInventoryCheck from './components/TileInventoryCheck';
import PrintView from './components/PrintView';
import Room3DView from './components/Room3DView';
import ViewInArIcon from '@mui/icons-material/ViewInAr';

const STORAGE_KEY = 'sparorez-rooms';
const PURCHASED_KEY = 'sparorez-purchased';

function loadRooms(storageKey: (base: string) => string): Room[] {
  try {
    const raw = localStorage.getItem(storageKey(STORAGE_KEY));
    if (raw) {
      const parsed = JSON.parse(raw) as Room[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(r => ({
          ...r,
          tileThickness: r.tileThickness ?? 1.5,
          showerCabins: r.showerCabins ?? [],
          walls: r.walls.map(w => ({ ...w, niches: w.niches ?? [] })),
        }));
      }
    }
  } catch { /* ignore */ }
  return createDefaultRooms();
}

function loadPurchased(storageKey: (base: string) => string): Record<string, number> {
  try {
    const raw = localStorage.getItem(storageKey(PURCHASED_KEY));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

type ViewMode = 'editor' | 'summary' | 'inventory' | 'print' | '3d';

const VIEW_TAB_INDEX: Record<Exclude<ViewMode, 'print'>, number> = {
  editor: 0,
  summary: 1,
  inventory: 2,
  '3d': 3,
};

function AppContent() {
  const { activeUser, logout, storageKey, users, switchUser } = useUser();
  const [rooms, setRooms] = useState<Room[]>(() => loadRooms(storageKey));
  const [purchasedTiles, setPurchasedTiles] = useState<Record<string, number>>(() => loadPurchased(storageKey));
  const [activeRoomIdx, setActiveRoomIdx] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [dirty, setDirty] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  // Reload data when user changes
  useEffect(() => {
    setRooms(loadRooms(storageKey));
    setPurchasedTiles(loadPurchased(storageKey));
    setActiveRoomIdx(0);
    setViewMode('editor');
    setDirty(false);
  }, [activeUser?.id, storageKey]);

  const updateRoom = (updated: Room) => {
    setRooms(prev => prev.map((r, i) => i === activeRoomIdx ? updated : r));
    setDirty(true);
  };

  const handleSave = useCallback(() => {
    try {
      localStorage.setItem(storageKey(STORAGE_KEY), JSON.stringify(rooms));
      localStorage.setItem(storageKey(PURCHASED_KEY), JSON.stringify(purchasedTiles));
      setDirty(false);
      setSaveFlash(true);
      setSaveError(null);
    } catch (e) {
      setSaveError('Nelze uložit — úložiště je plné. Zkuste odstranit některé dekorové obrázky.');
    }
  }, [rooms, purchasedTiles, storageKey]);

  const handleReset = useCallback(() => {
    const fresh = createDefaultRooms();
    setRooms(fresh);
    setPurchasedTiles({});
    setActiveRoomIdx(0);
    setConfirmReset(false);
    setDirty(true);
  }, []);

  const handlePurchasedChange = useCallback((tileName: string, qty: number) => {
    setPurchasedTiles(prev => ({ ...prev, [tileName]: qty }));
    setDirty(true);
  }, []);

  const handleNavChange = (_: React.SyntheticEvent, newValue: number) => {
    const modes: Exclude<ViewMode, 'print'>[] = ['editor', 'summary', 'inventory', '3d'];
    setViewMode(modes[newValue]);
  };

  if (viewMode === 'print') {
    return <PrintView rooms={rooms} onBack={() => setViewMode('editor')} />;
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: '#193137' }}>
        {/* Top row: title + actions + user */}
        <Toolbar variant="dense" sx={{ gap: 1 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              cursor: 'pointer',
              '&:hover': { opacity: 0.85 },
              userSelect: 'none',
              fontFamily: '"Ubuntu", sans-serif',
              letterSpacing: 0.5,
            }}
            onClick={() => setViewMode('editor')}
          >
            SIKO <Box component="span" sx={{ fontWeight: 400, opacity: 0.7, fontSize: '0.8em' }}>Sparořez</Box>
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          <Button
            variant={dirty ? 'contained' : 'text'}
            color={dirty ? 'success' : 'inherit'}
            startIcon={<SaveIcon />}
            onClick={handleSave}
            size="small"
          >
            {dirty ? 'Uložit *' : 'Uloženo'}
          </Button>
          <Tooltip title="Reset všech dat">
            <IconButton color="inherit" size="small" onClick={() => setConfirmReset(true)}>
              <RestartAltIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Tisk / PDF">
            <IconButton
              color="inherit"
              size="small"
              onClick={() => { handleSave(); setViewMode('print'); }}
            >
              <PrintIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: 'rgba(255,255,255,0.3)' }} />

          <Chip
            icon={<AccountCircleIcon />}
            label={activeUser?.name}
            variant="outlined"
            size="small"
            onClick={(e) => setUserMenuAnchor(e.currentTarget)}
            sx={{
              color: 'inherit',
              borderColor: 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              '& .MuiChip-icon': { color: 'inherit' },
            }}
          />
          <Menu
            anchorEl={userMenuAnchor}
            open={!!userMenuAnchor}
            onClose={() => setUserMenuAnchor(null)}
          >
            <MenuItem disabled>
              <ListItemText
                primary={activeUser?.name}
                secondary="Přihlášený uživatel"
              />
            </MenuItem>
            <Divider />
            {users.filter(u => u.id !== activeUser?.id).map(u => (
              <MenuItem key={u.id} onClick={() => { switchUser(u.id); setUserMenuAnchor(null); }}>
                <ListItemIcon><PeopleIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary={u.name} />
              </MenuItem>
            ))}
            {users.filter(u => u.id !== activeUser?.id).length > 0 && <Divider />}
            <MenuItem onClick={() => { setUserMenuAnchor(null); logout(); }}>
              <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Odhlásit se" />
            </MenuItem>
          </Menu>
        </Toolbar>

        {/* Navigation tabs */}
        <Tabs
          value={VIEW_TAB_INDEX[viewMode]}
          onChange={handleNavChange}
          textColor="inherit"
          sx={{
            px: 2,
            minHeight: 40,
            '& .MuiTab-root': { minHeight: 40, py: 0.5, textTransform: 'none', fontWeight: 500 },
            '& .MuiTabs-indicator': { backgroundColor: '#ffcc00', height: 3 },
          }}
        >
          <Tab icon={<HomeIcon fontSize="small" />} iconPosition="start" label="Místnosti" />
          <Tab icon={<CalculateIcon fontSize="small" />} iconPosition="start" label="Souhrn" />
          <Tab icon={<InventoryIcon fontSize="small" />} iconPosition="start" label="Kontrola dlaždic" />
          <Tab icon={<ViewInArIcon fontSize="small" />} iconPosition="start" label="3D vizualizace" />
        </Tabs>
      </AppBar>

      {viewMode === '3d' ? (
        <Box sx={{ px: 2, py: 1 }}>
          <Tabs
            value={activeRoomIdx}
            onChange={(_, v) => setActiveRoomIdx(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mb: 1, borderBottom: 1, borderColor: 'divider' }}
          >
            {rooms.map((room) => (
              <Tab key={room.id} label={room.name} />
            ))}
          </Tabs>
          <Room3DView
            room={rooms[activeRoomIdx]}
            onClose={() => setViewMode('editor')}
          />
        </Box>
      ) : (
        <Container maxWidth="lg" sx={{ py: 3 }}>
          {viewMode === 'summary' ? (
            <CalculationSummary rooms={rooms} />
          ) : viewMode === 'inventory' ? (
            <TileInventoryCheck
              rooms={rooms}
              purchasedTiles={purchasedTiles}
              onPurchasedChange={handlePurchasedChange}
            />
          ) : (
            <>
              <Tabs
                value={activeRoomIdx}
                onChange={(_, v) => setActiveRoomIdx(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
              >
                {rooms.map((room) => (
                  <Tab key={room.id} label={room.name} />
                ))}
              </Tabs>
              <RoomEditor room={rooms[activeRoomIdx]} onUpdate={updateRoom} />
            </>
          )}
        </Container>
      )}

      <Snackbar
        open={saveFlash}
        autoHideDuration={1500}
        onClose={() => setSaveFlash(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setSaveFlash(false)}>
          Uloženo!
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!saveError}
        autoHideDuration={5000}
        onClose={() => setSaveError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" variant="filled" onClose={() => setSaveError(null)}>
          {saveError}
        </Alert>
      </Snackbar>

      <Dialog open={confirmReset} onClose={() => setConfirmReset(false)}>
        <DialogTitle>Resetovat vše?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Opravdu chcete smazat všechna data a začít znovu? Tato akce je nevratná.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmReset(false)}>Zrušit</Button>
          <Button onClick={handleReset} color="error" variant="contained">
            Resetovat
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function App() {
  const { activeUser } = useUser();

  if (!activeUser) {
    return <UserSelector />;
  }

  return <AppContent />;
}
