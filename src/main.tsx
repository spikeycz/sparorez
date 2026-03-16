import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import '@fontsource/ubuntu/400.css'
import '@fontsource/ubuntu/500.css'
import '@fontsource/ubuntu/700.css'
import '@fontsource/open-sans/300.css'
import '@fontsource/open-sans/400.css'
import '@fontsource/open-sans/600.css'
import '@fontsource/open-sans/700.css'
import { UserProvider } from './contexts/UserContext.tsx'
import App from './App.tsx'

const theme = createTheme({
  palette: {
    primary: { main: '#0095b6' },
    secondary: { main: '#ffcc00' },
    error: { main: '#e52636' },
    warning: { main: '#f59e0b' },
    success: { main: '#2e7d32' },
    background: { default: '#f0f4f4' },
    text: {
      primary: '#193137',
      secondary: '#4c4c52',
    },
  },
  typography: {
    fontFamily: '"Open Sans", "Helvetica", "Arial", sans-serif',
    h5: { fontFamily: '"Ubuntu", "Open Sans", sans-serif', fontWeight: 700 },
    h6: { fontFamily: '"Ubuntu", "Open Sans", sans-serif', fontWeight: 700 },
    subtitle1: { fontFamily: '"Ubuntu", "Open Sans", sans-serif' },
    subtitle2: { fontFamily: '"Ubuntu", "Open Sans", sans-serif' },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 20,
          fontWeight: 600,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
        variant: 'outlined',
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 12,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontFamily: '"Ubuntu", "Open Sans", sans-serif',
          fontWeight: 500,
        },
      },
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <UserProvider>
        <App />
      </UserProvider>
    </ThemeProvider>
  </StrictMode>,
)
