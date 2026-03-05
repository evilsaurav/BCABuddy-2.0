import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, Paper, Alert, CircularProgress } from '@mui/material';
import { motion } from 'framer-motion';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import { useNavigate, Link } from 'react-router-dom';
import ArrowBack from '@mui/icons-material/ArrowBack';
import { setToken } from './utils/tokenManager';
import { BCA_MOTIVATIONAL_QUOTES } from './utils/motivationalQuotes';

const NEON_CYAN = '#03dac6';
const MIDNIGHT_BLUE = '#0a0a12';
const DEEP_PURPLE = '#1a0b2e';
const NEON_PURPLE = '#bb86fc';

const Login = ({ setIsAuthenticated }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [particlesReady, setParticlesReady] = useState(false);
  const [quote, setQuote] = useState('');
  const [typedQuote, setTypedQuote] = useState('');
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/signup');
  };

  const particlesOptions = {
    background: { color: { value: 'transparent' } },
    fpsLimit: 60,
    interactivity: {
      events: {
        onHover: { enable: true, mode: 'grab' },
        resize: true,
      },
      modes: {
        grab: {
          distance: 170,
          links: { opacity: 0.35 },
        },
      },
    },
    particles: {
      color: { value: ['#03dac6', '#bb86fc'] },
      links: {
        color: { value: ['#00FFFF', '#8A2BE2'] },
        distance: 145,
        enable: true,
        opacity: 0.24,
        width: 1,
      },
      move: {
        enable: true,
        speed: 0.35,
        outModes: { default: 'bounce' },
      },
      number: { value: 46, density: { enable: true, area: 900 } },
      opacity: { value: 0.35 },
      size: { value: { min: 1, max: 3 } },
    },
    detectRetina: true,
  };

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setParticlesReady(true);
    });
  }, []);

  useEffect(() => {
    const selected = BCA_MOTIVATIONAL_QUOTES[Math.floor(Math.random() * BCA_MOTIVATIONAL_QUOTES.length)] || '';
    setQuote(selected);
  }, []);

  useEffect(() => {
    if (!quote) {
      setTypedQuote('');
      return;
    }
    let idx = 0;
    const intervalId = window.setInterval(() => {
      idx += 1;
      setTypedQuote(quote.slice(0, idx));
      if (idx >= quote.length) {
        window.clearInterval(intervalId);
      }
    }, 36);
    return () => window.clearInterval(intervalId);
  }, [quote]);

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

  return (
    <Box
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-gray-900"
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
      {particlesReady && (
        <Particles
          id="neural-gateway-particles"
          options={particlesOptions}
          style={{ position: 'absolute', inset: 0, zIndex: 0 }}
        />
      )}

      <motion.div
        className="relative z-10"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        whileHover={{ scale: 1.02 }}
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
                minHeight: 24,
                borderRight: '2px solid rgba(3,218,198,0.65)',
                pr: 0.6,
                display: 'inline-block',
                animation: 'caretBlinkQuote 760ms step-end infinite',
                '@keyframes caretBlinkQuote': {
                  '0%, 100%': { borderRightColor: 'transparent' },
                  '50%': { borderRightColor: 'rgba(3,218,198,0.65)' },
                },
              }}
            >
              {typedQuote || 'Loading motivation...'}
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

          <Box
            component="form"
            onSubmit={handleLogin}
            sx={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 2.5,
            }}
          >
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
                  px: 2,
                  py: 1.5,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  boxShadow: 'inset 0 -2px 0 rgba(3,218,198,0.40)',
                  transition: 'all 160ms ease',
                  '&:focus-within': {
                    borderColor: 'rgba(3,218,198,0.55)',
                    boxShadow:
                      'inset 0 -2px 0 rgba(3,218,198,0.95), 0 0 24px rgba(3,218,198,0.34), 0 0 0 2px rgba(6,182,212,0.35)',
                  },
                },
              }}
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
                  px: 2,
                  py: 1.5,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  boxShadow: 'inset 0 -2px 0 rgba(187,134,252,0.40)',
                  transition: 'all 160ms ease',
                  '&:focus-within': {
                    borderColor: 'rgba(187,134,252,0.55)',
                    boxShadow:
                      'inset 0 -2px 0 rgba(187,134,252,0.95), 0 0 24px rgba(187,134,252,0.34), 0 0 0 2px rgba(34,211,238,0.24)',
                  },
                },
              }}
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

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex justify-center z-20 pointer-events-none">
        <div className="flex items-center gap-1.5 text-gray-400 text-sm font-medium tracking-wider">
          <span>Designed with</span>
          <span className="text-red-500 text-lg drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] mx-1 animate-pulse">❤️</span>
          <span className="text-gray-300 font-semibold tracking-widest">by insomniac for Frenzy</span>
        </div>
      </div>
    </Box>
  );
};

export default Login;