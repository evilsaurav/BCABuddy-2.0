import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, CssBaseline } from '@mui/material';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Always enforce dark mode for the 4D neon aesthetic
  const [isDark, setIsDark] = useState(true);

  // 4D Cyber Theme Configuration
  const muiTheme = createTheme({
    palette: {
      mode: 'dark',
      primary: { main: '#00F0FF' },
      secondary: { main: '#8B5CF6' },
      background: {
        default: '#0A0A12',
        paper: 'rgba(18, 26, 46, 0.8)',
      },
      text: {
        primary: '#FFFFFF',
        secondary: '#9CA3AF',
      }
    },
    typography: {
      fontFamily: "'Outfit', system-ui, sans-serif",
    },
    components: {
      MuiButtonBase: {
        defaultProps: {
          disableRipple: false, // Keep ripples for 4D click feedback
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: '12px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            backdropFilter: 'blur(10px)',
            '&:hover': {
              boxShadow: '0 0 15px rgba(0, 240, 255, 0.4)',
              transform: 'scale(1.02)',
            },
            '&:active': {
              transform: 'scale(0.95)',
            }
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }
        }
      },
      MuiTouchRipple: {
        styleOverrides: {
          child: {
            backgroundColor: '#00F0FF', // Cyan ripple for cyberpunk feel
          }
        }
      }
    },
  });

  const toggleTheme = () => {
    // Left for legacy compatibility, but 4D mode is strictly dark
  };

  const value = {
    isDark,
    toggleTheme,
    theme: 'dark',
  };

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export default ThemeContext;
