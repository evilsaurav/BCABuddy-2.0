import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Container,
  Paper,
  Tabs,
  Tab,
  CircularProgress
} from '@mui/material';
import { motion } from 'framer-motion';

const API_BASE = 'http://127.0.0.1:8000';
const NEON_PURPLE = '#bb86fc';
const NEON_CYAN = '#03dac6';
const GLASS_BG = 'rgba(30, 41, 59, 0.5)';

function Login({ setIsAuthenticated }) {
  const [tab, setTab] = useState(0);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);

      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.access_token);
        setIsAuthenticated(true);
        navigate('/dashboard');
      } else {
        setError('Invalid credentials');
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        setError('');
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        setTab(0);
        setError('Signup successful! Please login.');
      } else {
        const data = await res.json();
        setError(data.detail || 'Signup failed');
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        bgcolor: '#000000',
        backgroundImage:
          'radial-gradient(circle at 20% 50%, rgba(187, 134, 252, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(3, 218, 198, 0.1) 0%, transparent 50%)',
      }}
    >
      <Container maxWidth="sm">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Paper
            sx={{
              p: 4,
              bgcolor: GLASS_BG,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '24px',
              backdropFilter: 'blur(12px)',
            }}
          >
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  bgClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundImage: `linear-gradient(135deg, ${NEON_PURPLE}, ${NEON_CYAN})`,
                }}
              >
                🚀 BCABuddy
              </Typography>
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.6)', mt: 1 }}>
                AI Learning Assistant for IGNOU BCA
              </Typography>
            </Box>

            <Tabs value={tab} onChange={(e, val) => setTab(val)} sx={{ mb: 3 }}>
              <Tab label="Login" sx={{ color: NEON_CYAN }} />
              <Tab label="Signup" sx={{ color: NEON_CYAN }} />
            </Tabs>

            {tab === 0 ? (
              <form onSubmit={handleLogin}>
                <TextField
                  fullWidth
                  label="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  margin="normal"
                  sx={{ color: '#E6EAF0' }}
                />
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  margin="normal"
                  sx={{ color: '#E6EAF0' }}
                />
                {error && <Typography sx={{ color: '#ff6b6b', mt: 2 }}>{error}</Typography>}
                <Button
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, bgcolor: NEON_PURPLE, color: 'white' }}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Login'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignup}>
                <TextField
                  fullWidth
                  label="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Confirm Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  margin="normal"
                />
                {error && <Typography sx={{ color: '#ff6b6b', mt: 2 }}>{error}</Typography>}
                <Button
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, bgcolor: NEON_PURPLE, color: 'white' }}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Signup'}
                </Button>
              </form>
            )}
          </Paper>
        </motion.div>
      </Container>
    </Box>
  );
}

export default Login;
