import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, Paper, Alert, CircularProgress } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import ArrowBack from '@mui/icons-material/ArrowBack';
import { setToken } from './utils/tokenManager';

const NEON_CYAN = '#03dac6';
const MIDNIGHT_BLUE = '#0a0a12';
const DEEP_PURPLE = '#1a0b2e';
const NEON_PURPLE = '#bb86fc';

const Login = ({ setIsAuthenticated }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/signup');
  };

  useEffect(() => {}, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);

    try {
      const response = await fetch('http://127.0.0.1:8000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      if (!response.ok) throw new Error("Invalid Username or Password");
      const data = await response.json();
      setToken(data.access_token); // Use token manager instead of direct localStorage
      localStorage.setItem('username', username);
      localStorage.setItem('session_start', Date.now().toString());
      setIsAuthenticated(true);
      navigate('/dashboard');
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const cardMotion = {
    hidden: { opacity: 0, y: 36, filter: 'blur(8px)' },
    show: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2, sm: 3 },
        py: { xs: 5, sm: 6 },
        bgcolor: MIDNIGHT_BLUE,

        backgroundImage: `
          radial-gradient(900px circle at 15% 25%, rgba(3, 218, 198, 0.14), transparent 55%),
          radial-gradient(900px circle at 85% 30%, rgba(187, 134, 252, 0.14), transparent 55%),
          radial-gradient(900px circle at 30% 85%, rgba(3, 218, 198, 0.10), transparent 55%),
          linear-gradient(135deg, ${DEEP_PURPLE} 0%, ${MIDNIGHT_BLUE} 55%, ${DEEP_PURPLE} 100%)
        `,
        backgroundSize: '220% 220%',
        animation: 'meshDrift 14s ease-in-out infinite',

        '@keyframes meshDrift': {
          '0%': { backgroundPosition: '0% 0%' },
          '50%': { backgroundPosition: '100% 100%' },
          '100%': { backgroundPosition: '0% 0%' },
        },

        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '100% 3px',
          opacity: 0.18,
          pointerEvents: 'none',
          mixBlendMode: 'overlay',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 40% 40%, rgba(255,255,255,0.04), transparent 40%)',
          opacity: 0.55,
          pointerEvents: 'none',
        },
      }}
    >
      <motion.div
        variants={cardMotion}
        initial="hidden"
        animate="show"
        style={{ width: '100%', maxWidth: 460, position: 'relative', zIndex: 2 }}
      >
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 4,
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            bgcolor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(0, 255, 255, 0.2)',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 0 0 1px rgba(3,218,198,0.06), 0 20px 60px rgba(0,0,0,0.55)',
            animation: 'cardGlow 4.5s ease-in-out infinite',

            '@keyframes cardGlow': {
              '0%,100%': {
                boxShadow:
                  '0 0 0 1px rgba(3,218,198,0.06), 0 20px 60px rgba(0,0,0,0.55)',
              },
              '50%': {
                boxShadow:
                  '0 0 22px rgba(3,218,198,0.18), 0 24px 70px rgba(0,0,0,0.62)',
              },
            },

            '&::before': {
              content: '""',
              position: 'absolute',
              inset: -2,
              background:
                'linear-gradient(135deg, rgba(3,218,198,0.10), rgba(187,134,252,0.08), rgba(3,218,198,0.06))',
              opacity: 0.65,
              filter: 'blur(18px)',
              pointerEvents: 'none',
            },
          }}
        >
          <Box
            sx={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 1,
            }}
          >
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleBack}
                startIcon={<ArrowBack />}
                sx={{
                  color: 'rgba(255,255,255,0.85)',
                  textTransform: 'none',
                  borderRadius: 2,
                  px: 1.2,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                }}
              >
                Back
              </Button>
            </motion.div>

            <Box
              sx={{
                fontFamily:
                  '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                fontSize: 12,
                color: 'rgba(255,255,255,0.55)',
              }}
            >
              Neural Portal
            </Box>
          </Box>

          <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center', mb: 2.5 }}>
            <Box
              sx={{
                fontSize: { xs: 44, sm: 56 },
                lineHeight: 1,
                display: 'inline-block',
                animation: 'rocketFloat 3.2s ease-in-out infinite',
                '@keyframes rocketFloat': {
                  '0%,100%': { transform: 'translateY(0px)' },
                  '50%': { transform: 'translateY(-8px)' },
                },
                filter: 'drop-shadow(0 0 12px rgba(3,218,198,0.25))',
              }}
            >
              🚀
            </Box>

            <Typography
              variant="h3"
              sx={{
                mt: 0.8,
                fontWeight: 800,
                letterSpacing: '-0.8px',
                fontSize: { xs: '2.1rem', sm: '2.6rem' },
                backgroundImage: `linear-gradient(135deg, ${NEON_CYAN}, ${NEON_PURPLE})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 0 18px rgba(3, 218, 198, 0.18)',
              }}
            >
              BCABuddy
            </Typography>

            <Typography
              sx={{
                mt: 1,
                color: 'rgba(255,255,255,0.72)',
                fontSize: { xs: 13, sm: 14 },
              }}
            >
              Enter the Neural Glass gateway
            </Typography>
          </Box>

          {error && (
            <Alert
              severity="error"
              sx={{
                position: 'relative',
                zIndex: 1,
                mb: 2,
                bgcolor: 'rgba(244, 67, 54, 0.12)',
                border: '1px solid rgba(244, 67, 54, 0.25)',
                color: '#ffd6d6',
              }}
            >
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleLogin} sx={{ position: 'relative', zIndex: 1 }}>
            <TextField
              fullWidth
              label="Username"
              variant="standard"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.55)' } }}
              InputProps={{
                disableUnderline: true,
                sx: {
                  color: '#fff',
                  px: 1.5,
                  py: 1.2,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  boxShadow: 'inset 0 -2px 0 rgba(3,218,198,0.40)',
                  transition: 'all 160ms ease',
                  '&:focus-within': {
                    borderColor: 'rgba(3,218,198,0.55)',
                    boxShadow:
                      'inset 0 -2px 0 rgba(3,218,198,0.95), 0 0 18px rgba(3,218,198,0.18)',
                  },
                },
              }}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Password"
              type="password"
              variant="standard"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.55)' } }}
              InputProps={{
                disableUnderline: true,
                sx: {
                  color: '#fff',
                  px: 1.5,
                  py: 1.2,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  boxShadow: 'inset 0 -2px 0 rgba(187,134,252,0.40)',
                  transition: 'all 160ms ease',
                  '&:focus-within': {
                    borderColor: 'rgba(187,134,252,0.55)',
                    boxShadow:
                      'inset 0 -2px 0 rgba(187,134,252,0.95), 0 0 18px rgba(187,134,252,0.18)',
                  },
                },
              }}
              sx={{ mb: 2.5 }}
            />

            <motion.div whileHover={{ scale: loading ? 1 : 1.02 }} whileTap={{ scale: loading ? 1 : 0.99 }}>
              <Button
                fullWidth
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{
                  py: 1.35,
                  borderRadius: 2.5,
                  fontWeight: 800,
                  color: '#001014',
                  textTransform: 'none',
                  letterSpacing: '0.2px',
                  background: `linear-gradient(135deg, ${NEON_CYAN}, ${NEON_PURPLE})`,
                  boxShadow: '0 0 18px rgba(3,218,198,0.22)',
                  animation: loading ? 'none' : 'neonPulse 2.8s ease-in-out infinite',
                  '@keyframes neonPulse': {
                    '0%,100%': {
                      boxShadow:
                        '0 0 16px rgba(3,218,198,0.18), 0 0 0 rgba(0,0,0,0)',
                    },
                    '50%': {
                      boxShadow:
                        '0 0 28px rgba(3,218,198,0.35), 0 0 18px rgba(187,134,252,0.18)',
                    },
                  },
                  '&:hover': {
                    boxShadow:
                      '0 0 34px rgba(3,218,198,0.45), 0 0 24px rgba(187,134,252,0.22)',
                    filter: 'brightness(1.05)',
                  },
                  '&:disabled': {
                    background: 'rgba(187, 134, 252, 0.35)',
                    color: 'rgba(255,255,255,0.9)',
                  },
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
              </Button>
            </motion.div>

            <Box
              sx={{
                mt: 2.2,
                display: 'flex',
                justifyContent: 'center',
                gap: 1,
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              <Typography sx={{ fontSize: 13 }}>New Student?</Typography>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to="/signup"
                  style={{
                    color: NEON_CYAN,
                    fontWeight: 800,
                    textDecoration: 'none',
                    fontSize: 13,
                    textShadow: '0 0 10px rgba(3,218,198,0.15)',
                  }}
                >
                  Create Account
                </Link>
              </motion.div>
            </Box>
          </Box>
        </Paper>
      </motion.div>

      <Box
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 14,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.6,
          px: 2,
          zIndex: 2,
          pointerEvents: 'none',
        }}
      >
        <Typography
          sx={{
            fontSize: 12,
            color: 'rgba(3,218,198,0.85)',
            fontFamily:
              '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            textShadow: '0 0 12px rgba(3,218,198,0.18)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            borderRight: '2px solid rgba(3,218,198,0.65)',
            width: 'max-content',
            animation: 'typing1 5s steps(42, end) 0.2s 1 both, caretBlink 700ms step-end infinite',
            '@keyframes typing1': {
              from: { maxWidth: 0 },
              to: { maxWidth: 420 },
            },
            '@keyframes caretBlink': {
              '0%, 100%': { borderRightColor: 'transparent' },
              '50%': { borderRightColor: 'rgba(3,218,198,0.65)' },
            },
          }}
        >
          Supreme Architect: Saurav Kumar
        </Typography>

        <Typography
          sx={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.55)',
            fontFamily:
              '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            textShadow: '0 0 10px rgba(187,134,252,0.12)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            width: 'max-content',
            borderRight: '2px solid rgba(187,134,252,0.55)',
            animation: 'typing2 6s steps(52, end) 0.7s 1 both, caretBlink2 760ms step-end infinite',
            '@keyframes typing2': {
              from: { maxWidth: 0 },
              to: { maxWidth: 520 },
            },
            '@keyframes caretBlink2': {
              '0%, 100%': { borderRightColor: 'transparent' },
              '50%': { borderRightColor: 'rgba(187,134,252,0.55)' },
            },
          }}
        >
          Designed with ❤️ for Frenzy
        </Typography>
      </Box>
    </Box>
  );
};

export default Login;