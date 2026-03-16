import { useState } from 'react';
import {
  Box, Typography, TextField, Button, List, ListItemButton, ListItemText,
  ListItemIcon, IconButton, Paper, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, Avatar,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useUser } from '../contexts/UserContext';

export default function UserSelector() {
  const { users, createUser, switchUser, deleteUser } = useUser();
  const [newName, setNewName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createUser(trimmed);
    setNewName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreate();
  };

  const userToDelete = users.find(u => u.id === confirmDeleteId);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#193137' }}>
      <Paper elevation={8} sx={{ p: 4, maxWidth: 420, width: '100%', mx: 2, borderRadius: 3 }}>
        <Box sx={{ textAlign: 'center', mb: 1 }}>
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, fontFamily: '"Ubuntu", sans-serif', color: '#193137', letterSpacing: 0.5 }}
          >
            SIKO <Box component="span" sx={{ fontWeight: 400, color: '#0095b6' }}>Sparořez</Box>
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
          Kalkulačka obkladů a dlažby
        </Typography>

        {users.length > 0 && (
          <List sx={{ mb: 2 }}>
            {users.map(user => (
              <ListItemButton
                key={user.id}
                onClick={() => switchUser(user.id)}
                sx={{ borderRadius: 1, mb: 0.5 }}
              >
                <ListItemIcon>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
                    <PersonIcon fontSize="small" />
                  </Avatar>
                </ListItemIcon>
                <ListItemText primary={user.name} />
                <IconButton
                  edge="end"
                  size="small"
                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(user.id); }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </ListItemButton>
            ))}
          </List>
        )}

        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            placeholder="Jméno nového uživatele"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!newName.trim()}
            startIcon={<AddIcon />}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Vytvořit
          </Button>
        </Box>

        <Dialog open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)}>
          <DialogTitle>Smazat uživatele?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Opravdu chcete smazat uživatele <strong>{userToDelete?.name}</strong> a všechna jeho data? Tato akce je nevratná.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDeleteId(null)}>Zrušit</Button>
            <Button
              color="error"
              variant="contained"
              onClick={() => { if (confirmDeleteId) deleteUser(confirmDeleteId); setConfirmDeleteId(null); }}
            >
              Smazat
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
}
