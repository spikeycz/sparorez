import { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, TextField, List, ListItemButton, ListItemText,
  ListItemIcon, IconButton, Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, Chip, CircularProgress,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { api, type Project } from '../utils/api';
import { useUser } from '../contexts/UserContext';

interface Props {
  onSelect: (project: Project) => void;
  onAdmin?: () => void;
}

export default function ProjectSelector({ onSelect, onAdmin }: Props) {
  const { user, logout } = useUser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    api.getProjects()
      .then(setProjects)
      .catch(err => console.error('Failed to load projects:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const project = await api.createProject(trimmed);
    setProjects(prev => [...prev, project]);
    setNewName('');
  };

  const handleRename = async (id: string) => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    const updated = await api.updateProject(id, trimmed);
    setProjects(prev => prev.map(p => p.id === id ? updated : p));
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    await api.deleteProject(id);
    setProjects(prev => prev.filter(p => p.id !== id));
    setDeleteId(null);
  };

  const projectToDelete = projects.find(p => p.id === deleteId);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#1e293b' }}>
      <Paper elevation={8} sx={{ p: 4, maxWidth: 500, width: '100%', mx: 2, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, fontFamily: '"Ubuntu", sans-serif', color: '#1e293b' }}
          >
            Sparořez
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {onAdmin && (
              <IconButton size="small" onClick={onAdmin} title="Administrace">
                <AdminPanelSettingsIcon fontSize="small" />
              </IconButton>
            )}
            <Chip
              label={user?.name}
              onDelete={logout}
              deleteIcon={<LogoutIcon />}
              variant="outlined"
              size="small"
            />
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Vyberte projekt nebo vytvořte nový
        </Typography>

        {projects.length > 0 && (
          <List sx={{ mb: 2 }}>
            {projects.map(project => (
              <ListItemButton
                key={project.id}
                onClick={() => onSelect(project)}
                sx={{ borderRadius: 1, mb: 0.5 }}
              >
                <ListItemIcon>
                  <FolderIcon color="primary" />
                </ListItemIcon>
                {editingId === project.id ? (
                  <TextField
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRename(project.id); e.stopPropagation(); }}
                    onBlur={() => handleRename(project.id)}
                    onClick={e => e.stopPropagation()}
                    size="small"
                    autoFocus
                    fullWidth
                  />
                ) : (
                  <ListItemText
                    primary={project.name}
                    secondary={new Date(project.updated_at).toLocaleDateString('cs-CZ')}
                  />
                )}
                <IconButton size="small" onClick={e => {
                  e.stopPropagation();
                  setEditingId(project.id);
                  setEditName(project.name);
                }}>
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={e => { e.stopPropagation(); setDeleteId(project.id); }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </ListItemButton>
            ))}
          </List>
        )}

        {projects.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic', textAlign: 'center' }}>
            Zatím nemáte žádné projekty. Vytvořte svůj první!
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            placeholder="Název nového projektu"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
          />
          <Button variant="contained" onClick={handleCreate} disabled={!newName.trim()} startIcon={<AddIcon />}
            sx={{ whiteSpace: 'nowrap' }}>
            Vytvořit
          </Button>
        </Box>

        <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
          <DialogTitle>Smazat projekt?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Opravdu chcete smazat projekt <strong>{projectToDelete?.name}</strong> a všechny jeho místnosti? Tato akce je nevratná.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteId(null)}>Zrušit</Button>
            <Button color="error" variant="contained" onClick={() => { if (deleteId) handleDelete(deleteId); }}>
              Smazat
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
}
