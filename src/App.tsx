import { useState, useCallback, useEffect } from 'react';
import {
  AppBar, Toolbar, Typography, Button, Box, Tabs, Tab, Container, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  IconButton, Tooltip, Divider, Chip, CircularProgress, Menu, MenuItem,
  ListItemIcon, ListItemText, TextField,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PrintIcon from '@mui/icons-material/Print';
import HomeIcon from '@mui/icons-material/Home';
import CalculateIcon from '@mui/icons-material/Calculate';
import InventoryIcon from '@mui/icons-material/Inventory';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import FolderIcon from '@mui/icons-material/Folder';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { v4 as uuid } from 'uuid';
import type { Room, TileConfig } from './types';
import { createDefaultRooms } from './utils/defaults';
import UploadIcon from '@mui/icons-material/Upload';
import { api, type Project } from './utils/api';
import { useUser } from './contexts/UserContext';
import AuthScreen from './components/AuthScreen';
import ProjectSelector from './components/ProjectSelector';
import RoomEditor from './components/RoomEditor';
import TilePaletteEditor from './components/TilePaletteEditor';
import CalculationSummary from './components/CalculationSummary';
import TileInventoryCheck from './components/TileInventoryCheck';
import PrintView from './components/PrintView';
import Room3DView from './components/Room3DView';
import AdminPanel from './components/AdminPanel';
import LandingPage from './components/LandingPage';

function normalizeRooms(rooms: Room[]): Room[] {
  return rooms.map(r => ({
    ...r,
    tileThickness: r.tileThickness ?? 1.5,
    showerCabins: r.showerCabins ?? [],
    walls: r.walls.map(w => ({ ...w, niches: w.niches ?? [] })),
  }));
}

type ViewMode = 'editor' | 'summary' | 'inventory' | 'print' | '3d';

const VIEW_TAB_INDEX: Record<Exclude<ViewMode, 'print'>, number> = {
  editor: 0, summary: 1, inventory: 2, '3d': 3,
};

function AppContent({ project, onBackToProjects }: { project: Project; onBackToProjects: () => void }) {
  const { user, logout } = useUser();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tilePalette, setTilePalette] = useState<TileConfig[]>([]);
  const [purchasedTiles, setPurchasedTiles] = useState<Record<string, number>>({});
  const [activeRoomIdx, setActiveRoomIdx] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [dirty, setDirty] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [addRoomName, setAddRoomName] = useState('');
  const [addRoomOpen, setAddRoomOpen] = useState(false);
  const [deleteRoomIdx, setDeleteRoomIdx] = useState<number | null>(null);
  const [hasLocalData, setHasLocalData] = useState(false);

  // Check for old localStorage data to migrate
  useEffect(() => {
    const keys = Object.keys(localStorage);
    const hasRooms = keys.some(k => k.startsWith('sparorez-rooms'));
    setHasLocalData(hasRooms);
  }, []);

  const handleImportLocal = async () => {
    // Find the most complete rooms data (largest JSON = most customization)
    const keys = Object.keys(localStorage).filter(k => k.startsWith('sparorez-rooms'));
    let importedRooms: Room[] = [];
    let bestKey = '';
    let bestSize = 0;

    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key) || '';
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0 && raw.length > bestSize) {
          importedRooms = normalizeRooms(parsed);
          bestKey = key;
          bestSize = raw.length;
        }
      } catch { /* skip */ }
    }

    console.log(`[Import] Found ${keys.length} room keys, using "${bestKey}" (${bestSize} bytes, ${importedRooms.length} rooms)`);
    console.log('[Import] Rooms:', importedRooms.map(r => ({
      name: r.name,
      walls: r.walls.map(w => ({
        label: w.label,
        hasTiles: !!w.tileConfig,
        geberits: w.geberits.length,
        doors: w.doors.length,
        niches: (w.niches ?? []).length,
      })),
    })));

    let importedPurchased: Record<string, number> = {};
    const purchasedKeys = Object.keys(localStorage).filter(k => k.startsWith('sparorez-purchased'));
    let bestPSize = 0;
    for (const key of purchasedKeys) {
      try {
        const raw = localStorage.getItem(key) || '';
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'object' && parsed !== null && raw.length > bestPSize) {
          importedPurchased = parsed;
          bestPSize = raw.length;
        }
      } catch { /* skip */ }
    }

    if (importedRooms.length === 0) {
      setSaveError('Žádná data k importu nenalezena.');
      return;
    }

    try {
      await api.saveRooms(project.id, importedRooms);
      if (Object.keys(importedPurchased).length > 0) {
        await api.savePurchased(project.id, importedPurchased);
      }
      const importedPalette = importedRooms.find(r => r.tilePalette && r.tilePalette.length > 0)?.tilePalette ?? [];
      setTilePalette(importedPalette);
      setRooms(importedRooms);
      setPurchasedTiles(importedPurchased);
      setHasLocalData(false);
      setDirty(false);
      setSaveFlash(true);
    } catch {
      setSaveError('Import selhal.');
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getRooms(project.id),
      api.getPurchased(project.id),
    ])
      .then(([loadedRooms, purchased]) => {
        const normalized = loadedRooms.length > 0 ? normalizeRooms(loadedRooms) : createDefaultRooms();
        // Extract project-level palette from first room that has one
        const existingPalette = normalized.find(r => r.tilePalette && r.tilePalette.length > 0)?.tilePalette ?? [];
        setTilePalette(existingPalette);
        setRooms(normalized);
        setPurchasedTiles(purchased);
        setActiveRoomIdx(0);
        setViewMode('editor');
        setDirty(false);
      })
      .catch(err => {
        console.error('Failed to load data:', err);
        setRooms(createDefaultRooms());
        setPurchasedTiles({});
      })
      .finally(() => setLoading(false));
  }, [project.id]);

  const updateRoom = (updated: Room) => {
    setRooms(prev => prev.map((r, i) => i === activeRoomIdx ? updated : r));
    setDirty(true);
  };

  const handleSave = useCallback(async () => {
    try {
      // Embed shared palette into each room for storage
      const roomsToSave = rooms.map(r => ({ ...r, tilePalette: tilePalette }));
      await Promise.all([
        api.saveRooms(project.id, roomsToSave),
        api.savePurchased(project.id, purchasedTiles),
      ]);
      setDirty(false);
      setSaveFlash(true);
      setSaveError(null);
    } catch {
      setSaveError('Nelze uložit — chyba serveru.');
    }
  }, [rooms, tilePalette, purchasedTiles, project.id]);

  const handleReset = useCallback(() => {
    setRooms(createDefaultRooms());
    setTilePalette([]);
    setPurchasedTiles({});
    setActiveRoomIdx(0);
    setConfirmReset(false);
    setDirty(true);
  }, []);

  const handleAddRoom = () => {
    const name = addRoomName.trim() || `Místnost ${rooms.length + 1}`;
    const newRoom: Room = {
      id: uuid(),
      name,
      width: 200,
      depth: 180,
      height: 260,
      walls: [
        { id: uuid(), label: 'A', width: 200, height: 260, side: 'top' as const, tileConfig: undefined, geberits: [], niches: [], doors: [] },
        { id: uuid(), label: 'B', width: 180, height: 260, side: 'right' as const, tileConfig: undefined, geberits: [], niches: [], doors: [] },
        { id: uuid(), label: 'C', width: 200, height: 260, side: 'bottom' as const, tileConfig: undefined, geberits: [], niches: [], doors: [] },
        { id: uuid(), label: 'D', width: 180, height: 260, side: 'left' as const, tileConfig: undefined, geberits: [], niches: [], doors: [] },
      ],
      showerCabins: [],
      tileThickness: 1.5,
    };
    setRooms(prev => [...prev, newRoom]);
    setActiveRoomIdx(rooms.length);
    setAddRoomName('');
    setAddRoomOpen(false);
    setDirty(true);
  };

  const handleDeleteRoom = (idx: number) => {
    setRooms(prev => prev.filter((_, i) => i !== idx));
    if (activeRoomIdx >= rooms.length - 1) setActiveRoomIdx(Math.max(0, rooms.length - 2));
    setDeleteRoomIdx(null);
    setDirty(true);
  };

  const handlePurchasedChange = useCallback((tileName: string, qty: number) => {
    setPurchasedTiles(prev => ({ ...prev, [tileName]: qty }));
    setDirty(true);
  }, []);

  const handleNavChange = (_: React.SyntheticEvent, newValue: number) => {
    const modes: Exclude<ViewMode, 'print'>[] = ['editor', 'summary', 'inventory', '3d'];
    setViewMode(modes[newValue]);
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (viewMode === 'print') {
    return <PrintView rooms={rooms} onBack={() => setViewMode('editor')} />;
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default', overflow: 'hidden' }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: '#1e293b' }}>
        <Toolbar variant="dense" sx={{ gap: 1 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700, cursor: 'pointer', '&:hover': { opacity: 0.85 },
              userSelect: 'none', fontFamily: '"Ubuntu", sans-serif', letterSpacing: 0.5,
            }}
            onClick={() => setViewMode('editor')}
          >
            Sparořez
          </Typography>

          <Chip
            icon={<FolderIcon />}
            label={project.name}
            variant="outlined"
            size="small"
            onClick={onBackToProjects}
            sx={{ color: 'inherit', borderColor: 'rgba(255,255,255,0.3)', cursor: 'pointer', '& .MuiChip-icon': { color: 'inherit' } }}
          />

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
            <IconButton color="inherit" size="small" onClick={() => { handleSave(); setViewMode('print'); }}>
              <PrintIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: 'rgba(255,255,255,0.3)' }} />

          <Chip
            icon={<AccountCircleIcon />}
            label={user?.name}
            variant="outlined"
            size="small"
            onClick={e => setUserMenuAnchor(e.currentTarget)}
            sx={{ color: 'inherit', borderColor: 'rgba(255,255,255,0.4)', cursor: 'pointer', '& .MuiChip-icon': { color: 'inherit' } }}
          />
          <Menu anchorEl={userMenuAnchor} open={!!userMenuAnchor} onClose={() => setUserMenuAnchor(null)}>
            <MenuItem disabled>
              <ListItemText primary={user?.name} secondary={user?.email} />
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { setUserMenuAnchor(null); onBackToProjects(); }}>
              <ListItemIcon><FolderIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Projekty" />
            </MenuItem>
            {user?.is_admin && (
              <MenuItem onClick={() => { setUserMenuAnchor(null); onBackToProjects(); }}>
                <ListItemIcon><AdminPanelSettingsIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary="Administrace" />
              </MenuItem>
            )}
            <MenuItem onClick={() => { setUserMenuAnchor(null); logout(); }}>
              <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Odhlásit se" />
            </MenuItem>
          </Menu>
        </Toolbar>

        <Tabs
          value={VIEW_TAB_INDEX[viewMode]}
          onChange={handleNavChange}
          textColor="inherit"
          sx={{
            px: 2, minHeight: 40,
            '& .MuiTab-root': { minHeight: 40, py: 0.5, textTransform: 'none', fontWeight: 500 },
            '& .MuiTabs-indicator': { backgroundColor: '#f97316', height: 3 },
          }}
        >
          <Tab icon={<HomeIcon fontSize="small" />} iconPosition="start" label="Místnosti" />
          <Tab icon={<CalculateIcon fontSize="small" />} iconPosition="start" label="Souhrn" />
          <Tab icon={<InventoryIcon fontSize="small" />} iconPosition="start" label="Kontrola dlaždic" />
          <Tab icon={<ViewInArIcon fontSize="small" />} iconPosition="start" label="3D vizualizace" />
        </Tabs>
      </AppBar>

      {hasLocalData && (
        <Alert
          severity="info"
          sx={{ mx: 2, mt: 2 }}
          icon={<UploadIcon />}
          action={
            <Button color="inherit" size="small" variant="outlined" onClick={handleImportLocal}>
              Importovat do projektu
            </Button>
          }
        >
          Nalezeny starší návrhy v prohlížeči. Chcete je importovat do tohoto projektu?
        </Alert>
      )}

      {viewMode === '3d' ? (
        <Box sx={{ px: 2, py: 1, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Tabs value={activeRoomIdx} onChange={(_, v) => setActiveRoomIdx(v)} variant="scrollable" scrollButtons="auto"
              sx={{ flex: 1, borderBottom: 1, borderColor: 'divider' }}>
              {rooms.map(room => <Tab key={room.id} label={room.name} />)}
            </Tabs>
          </Box>
          <Room3DView room={rooms[activeRoomIdx]} onClose={() => setViewMode('editor')} tilePalette={tilePalette} onUpdate={updateRoom} />
        </Box>
      ) : (
        <Container maxWidth="lg" sx={{ py: 3, flex: 1, overflowY: 'auto' }}>
          {viewMode === 'summary' ? (
            <CalculationSummary rooms={rooms} />
          ) : viewMode === 'inventory' ? (
            <TileInventoryCheck rooms={rooms} purchasedTiles={purchasedTiles} onPurchasedChange={handlePurchasedChange} />
          ) : (
            <>
              {/* Project-level tile palette */}
              <TilePaletteEditor
                palette={tilePalette}
                onChange={p => { setTilePalette(p); setDirty(true); }}
              />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Tabs value={activeRoomIdx} onChange={(_, v) => setActiveRoomIdx(v)} variant="scrollable" scrollButtons="auto"
                  sx={{ flex: 1, borderBottom: 1, borderColor: 'divider' }}>
                  {rooms.map((room, idx) => (
                    <Tab
                      key={room.id}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {room.name}
                          {rooms.length > 1 && (
                            <IconButton size="small" onClick={e => { e.stopPropagation(); setDeleteRoomIdx(idx); }}
                              sx={{ p: 0.25, ml: 0.5 }}>
                              <DeleteIcon sx={{ fontSize: 14, opacity: 0.5 }} />
                            </IconButton>
                          )}
                        </Box>
                      }
                    />
                  ))}
                </Tabs>
                <Tooltip title="Přidat místnost">
                  <IconButton color="primary" onClick={() => setAddRoomOpen(true)}>
                    <AddIcon />
                  </IconButton>
                </Tooltip>
              </Box>
              <RoomEditor room={rooms[activeRoomIdx]} onUpdate={updateRoom} tilePalette={tilePalette} />
            </>
          )}
        </Container>
      )}

      {/* Add room dialog */}
      <Dialog open={addRoomOpen} onClose={() => setAddRoomOpen(false)}>
        <DialogTitle>Přidat místnost</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus fullWidth label="Název místnosti" value={addRoomName}
            onChange={e => setAddRoomName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddRoom(); }}
            placeholder="např. Koupelna, WC, Předsíň..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddRoomOpen(false)}>Zrušit</Button>
          <Button variant="contained" onClick={handleAddRoom}>Přidat</Button>
        </DialogActions>
      </Dialog>

      {/* Delete room dialog */}
      <Dialog open={deleteRoomIdx !== null} onClose={() => setDeleteRoomIdx(null)}>
        <DialogTitle>Smazat místnost?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Opravdu chcete smazat místnost <strong>{deleteRoomIdx !== null ? rooms[deleteRoomIdx]?.name : ''}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteRoomIdx(null)}>Zrušit</Button>
          <Button color="error" variant="contained" onClick={() => { if (deleteRoomIdx !== null) handleDeleteRoom(deleteRoomIdx); }}>
            Smazat
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset dialog */}
      <Dialog open={confirmReset} onClose={() => setConfirmReset(false)}>
        <DialogTitle>Resetovat vše?</DialogTitle>
        <DialogContent>
          <DialogContentText>Opravdu chcete smazat všechna data a začít znovu?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmReset(false)}>Zrušit</Button>
          <Button onClick={handleReset} color="error" variant="contained">Resetovat</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={saveFlash} autoHideDuration={1500} onClose={() => setSaveFlash(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setSaveFlash(false)}>Uloženo!</Alert>
      </Snackbar>
      <Snackbar open={!!saveError} autoHideDuration={5000} onClose={() => setSaveError(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="error" variant="filled" onClose={() => setSaveError(null)}>{saveError}</Alert>
      </Snackbar>
    </Box>
  );
}

export default function App() {
  const { user, loading } = useUser();
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#faf8f5' }}>
        <CircularProgress sx={{ color: '#c2704e' }} />
      </Box>
    );
  }

  if (!user) {
    if (showAuth) return <AuthScreen onBack={() => setShowAuth(false)} />;
    return <LandingPage onGetStarted={() => setShowAuth(true)} />;
  }
  if (showAdmin && user.is_admin) return <AdminPanel onBack={() => setShowAdmin(false)} />;
  if (!activeProject) return <ProjectSelector onSelect={setActiveProject} onAdmin={user.is_admin ? () => setShowAdmin(true) : undefined} />;
  return <AppContent project={activeProject} onBackToProjects={() => setActiveProject(null)} />;
}
