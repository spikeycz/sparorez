import { useState } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Alert, Tabs, Tab, Collapse, IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useUser } from '../contexts/UserContext';
import { api } from '../utils/api';

type AuthTab = 'login' | 'register' | 'forgot' | 'reset';

interface AuthScreenProps {
  onBack?: () => void;
}

export default function AuthScreen({ onBack }: AuthScreenProps = {}) {
  const { login, register } = useUser();
  const [tab, setTab] = useState<AuthTab>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Přihlášení selhalo');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError('');
    if (password !== confirmPassword) { setError('Hesla se neshodují'); return; }
    if (password.length < 6) { setError('Heslo musí mít alespoň 6 znaků'); return; }
    setLoading(true);
    try {
      await register(email, name, password);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Registrace selhala');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await api.forgotPassword(email);
      if (res.resetToken) {
        setResetToken(res.resetToken);
        setTab('reset');
        setSuccess('Reset token vygenerován. V produkci by přišel emailem.');
      } else {
        setSuccess('Pokud účet existuje, obdržíte email s instrukcemi.');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Chyba');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setError('');
    if (password !== confirmPassword) { setError('Hesla se neshodují'); return; }
    if (password.length < 6) { setError('Heslo musí mít alespoň 6 znaků'); return; }
    setLoading(true);
    try {
      await api.resetPassword(resetToken, password);
      setSuccess('Heslo změněno. Nyní se přihlaste.');
      setTab('login');
      setPassword('');
      setConfirmPassword('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Reset selhal');
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') action();
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#1e293b' }}>
      <Paper elevation={8} sx={{ p: 4, maxWidth: 440, width: '100%', mx: 2, borderRadius: 3, position: 'relative' }}>
        {onBack && (
          <IconButton onClick={onBack} sx={{ position: 'absolute', top: 12, left: 12 }}>
            <ArrowBackIcon />
          </IconButton>
        )}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, fontFamily: '"Ubuntu", sans-serif', color: '#1e293b', letterSpacing: 0.5 }}
          >
            Sparořez
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Kalkulačka obkladů a dlažby
          </Typography>
        </Box>

        <Tabs
          value={tab === 'reset' ? 'forgot' : tab}
          onChange={(_, v) => { setTab(v); setError(''); setSuccess(''); }}
          variant="fullWidth"
          sx={{ mb: 2 }}
        >
          <Tab label="Přihlášení" value="login" />
          <Tab label="Registrace" value="register" />
          <Tab label="Zapomenuté heslo" value="forgot" />
        </Tabs>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {/* Login */}
        <Collapse in={tab === 'login'}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => handleKey(e, handleLogin)} fullWidth />
            <TextField label="Heslo" type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => handleKey(e, handleLogin)} fullWidth />
            <Button variant="contained" onClick={handleLogin} disabled={loading} size="large">
              {loading ? 'Přihlašování...' : 'Přihlásit se'}
            </Button>
          </Box>
        </Collapse>

        {/* Register */}
        <Collapse in={tab === 'register'}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Jméno" value={name} onChange={e => setName(e.target.value)} fullWidth />
            <TextField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} fullWidth />
            <TextField label="Heslo" type="password" value={password} onChange={e => setPassword(e.target.value)} fullWidth />
            <TextField label="Heslo znovu" type="password" value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              onKeyDown={e => handleKey(e, handleRegister)} fullWidth />
            <Button variant="contained" onClick={handleRegister} disabled={loading} size="large">
              {loading ? 'Registrace...' : 'Zaregistrovat se'}
            </Button>
          </Box>
        </Collapse>

        {/* Forgot password */}
        <Collapse in={tab === 'forgot'}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Zadejte email a my vám pošleme odkaz pro obnovení hesla.
            </Typography>
            <TextField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => handleKey(e, handleForgot)} fullWidth />
            <Button variant="contained" onClick={handleForgot} disabled={loading} size="large">
              {loading ? 'Odesílání...' : 'Obnovit heslo'}
            </Button>
          </Box>
        </Collapse>

        {/* Reset password */}
        <Collapse in={tab === 'reset'}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Reset token" value={resetToken} onChange={e => setResetToken(e.target.value)} fullWidth />
            <TextField label="Nové heslo" type="password" value={password} onChange={e => setPassword(e.target.value)} fullWidth />
            <TextField label="Nové heslo znovu" type="password" value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              onKeyDown={e => handleKey(e, handleReset)} fullWidth />
            <Button variant="contained" onClick={handleReset} disabled={loading} size="large">
              {loading ? 'Nastavování...' : 'Nastavit nové heslo'}
            </Button>
          </Box>
        </Collapse>
      </Paper>
    </Box>
  );
}
