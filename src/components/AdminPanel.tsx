import { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Chip, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, CircularProgress, Alert,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonIcon from '@mui/icons-material/Person';
import FolderIcon from '@mui/icons-material/Folder';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import PeopleIcon from '@mui/icons-material/People';
import { api, type AdminStats, type AdminUser } from '../utils/api';

interface Props {
  onBack: () => void;
}

export default function AdminPanel({ onBack }: Props) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.adminGetStats(), api.adminGetUsers()])
      .then(([s, u]) => { setStats(s); setUsers(u); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await api.adminDeleteUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      setDeleteId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Smazání selhalo');
    }
  };

  const handleToggleAdmin = async (id: string, current: boolean) => {
    try {
      await api.adminToggleAdmin(id, !current);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_admin: !current } : u));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Změna selhala');
    }
  };

  const userToDelete = users.find(u => u.id === deleteId);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={onBack}>
            Zpět
          </Button>
          <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: '"Ubuntu", sans-serif' }}>
            <AdminPanelSettingsIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            Administrace
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        {/* Stats cards */}
        {stats && (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2, mb: 4 }}>
            <Paper sx={{ p: 2.5, textAlign: 'center' }}>
              <PeopleIcon sx={{ fontSize: 32, color: 'primary.main', mb: 0.5 }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>{stats.totalUsers}</Typography>
              <Typography variant="body2" color="text.secondary">Uživatelů</Typography>
            </Paper>
            <Paper sx={{ p: 2.5, textAlign: 'center' }}>
              <FolderIcon sx={{ fontSize: 32, color: 'secondary.main', mb: 0.5 }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>{stats.totalProjects}</Typography>
              <Typography variant="body2" color="text.secondary">Projektů</Typography>
            </Paper>
            <Paper sx={{ p: 2.5, textAlign: 'center' }}>
              <MeetingRoomIcon sx={{ fontSize: 32, color: 'success.main', mb: 0.5 }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>{stats.totalRooms}</Typography>
              <Typography variant="body2" color="text.secondary">Místností</Typography>
            </Paper>
          </Box>
        )}

        {/* Users table */}
        <Typography variant="h6" sx={{ mb: 1.5, fontFamily: '"Ubuntu", sans-serif' }}>
          Uživatelé
        </Typography>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Jméno</TableCell>
                <TableCell>Email</TableCell>
                <TableCell align="center">Projekty</TableCell>
                <TableCell align="center">Role</TableCell>
                <TableCell>Registrace</TableCell>
                <TableCell align="right">Akce</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map(user => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {user.is_admin ? <AdminPanelSettingsIcon fontSize="small" color="primary" /> : <PersonIcon fontSize="small" color="action" />}
                      {user.name}
                    </Box>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell align="center">{user.project_count}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={user.is_admin ? 'Admin' : 'Uživatel'}
                      color={user.is_admin ? 'primary' : 'default'}
                      size="small"
                      variant={user.is_admin ? 'filled' : 'outlined'}
                      onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                      sx={{ cursor: 'pointer' }}
                    />
                  </TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString('cs-CZ')}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="error" onClick={() => setDeleteId(user.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Delete user dialog */}
        <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
          <DialogTitle>Smazat uživatele?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Opravdu chcete smazat uživatele <strong>{userToDelete?.name}</strong> ({userToDelete?.email})
              a všechny jeho projekty? Tato akce je nevratná.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteId(null)}>Zrušit</Button>
            <Button color="error" variant="contained" onClick={() => { if (deleteId) handleDelete(deleteId); }}>
              Smazat
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}
