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
  CircularProgress,
  Grid
} from '@mui/material';
import { motion } from 'framer-motion';
import { API_BASE } from '../utils/apiConfig';

const NEON_PURPLE = '#bb86fc';
const NEON_CYAN = '#03dac6';
// Using a slightly more solid background to prevent mobile GPU hangs instead of blur
const SOLID_GLASS_BG = 'rgba(15, 20, 35, 0.95)';

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
        bgcolor: '#050810', // Darker solid background for better performance
        position: 'relative',
        zIndex: 1
      }}
    >
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
        <Grid container spacing={4} alignItems="center">
          
          {/* About Section - Left Side */}
          <Grid item xs={12} md={6}>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
              <Box sx={{ pr: { md: 4 }, textAlign: { xs: 'center', md: 'left' } }}>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 900,
                    mb: 2,
                    background: `linear-gradient(135deg, ${NEON_PURPLE}, ${NEON_CYAN})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  BCABuddy
                </Typography>
                <Typography sx={{ fontSize: '20px', fontWeight: 700, color: '#E6EAF0', mb: 3 }}>
                  Your High-Energy AI Prep Zone for IGNOU BCA.
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left' }}>
                  <Paper sx={{ p: 3, bgcolor: SOLID_GLASS_BG, border: `1px solid ${NEON_CYAN}40`, borderRadius: '16px' }}>
                    <Typography sx={{ color: NEON_CYAN, fontWeight: 800, mb: 1 }}>Our Vision</Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', lineHeight: 1.6 }}>
                      We believe every student deserves a personalized, stress-free learning experience. BCABuddy brings advanced AI directly to your study desk, helping you transition from panicked cramming to structured, confident learning.
                    </Typography>
                  </Paper>

                  <Paper sx={{ p: 3, bgcolor: SOLID_GLASS_BG, border: `1px solid ${NEON_PURPLE}40`, borderRadius: '16px' }}>
                    <Typography sx={{ color: NEON_PURPLE, fontWeight: 800, mb: 1 }}>The Story</Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', lineHeight: 1.6 }}>
                      Born out of real student experiences, late-night coding sessions, and a genuine desire to solve BCA academic struggles. Built by Saurav, with the inspiration of Jiya, designed by a student, for the students.
                    </Typography>
                  </Paper>
                </Box>
              </Box>
            </motion.div>
          </Grid>

          {/* Login/Signup Form - Right Side */}
          <Grid item xs={12} md={6}>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
              <Paper
                sx={{
                  p: { xs: 3, sm: 5 },
                  bgcolor: SOLID_GLASS_BG,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '24px',
                  // Removed backdropFilter completely to prevent mobile lag/hangs
                  boxShadow: `0 0 40px rgba(0,0,0,0.5)`,
                }}
              >
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff' }}>
                    Welcome Back!
                  </Typography>
                  <Typography sx={{ color: 'rgba(255, 255, 255, 0.6)', mt: 1, fontSize: '14px' }}>
                    Login or create an account to start studying smartly.
                  </Typography>
                </Box>

                <Tabs 
                  value={tab} 
                  onChange={(e, val) => setTab(val)} 
                  variant="fullWidth"
                  sx={{ 
                    mb: 4, 
                    '& .MuiTab-root': { color: 'rgba(255,255,255,0.5)', fontWeight: 700 },
                    '& .Mui-selected': { color: `${NEON_CYAN} !important` },
                    '& .MuiTabs-indicator': { backgroundColor: NEON_CYAN }
                  }}
                >
                  <Tab label="Login" />
                  <Tab label="Signup" />
                </Tabs>

                {tab === 0 ? (
                  <form onSubmit={handleLogin}>
                    <TextField
                      fullWidth
                      label="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      margin="normal"
                      sx={{ '& .MuiInputBase-input': { color: '#E6EAF0' }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' } }}
                    />
                    <TextField
                      fullWidth
                      label="Password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      margin="normal"
                      sx={{ '& .MuiInputBase-input': { color: '#E6EAF0' }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' } }}
                    />
                    {error && <Typography sx={{ color: '#ff6b6b', mt: 2, fontSize: '14px', textAlign: 'center' }}>{error}</Typography>}
                    <Button
                      fullWidth
                      variant="contained"
                      type="submit"
                      sx={{ mt: 4, py: 1.5, bgcolor: NEON_PURPLE, color: 'white', fontWeight: 800, borderRadius: '12px' }}
                      disabled={loading}
                    >
                      {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
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
                      sx={{ '& .MuiInputBase-input': { color: '#E6EAF0' }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' } }}
                    />
                    <TextField
                      fullWidth
                      label="Password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      margin="normal"
                      sx={{ '& .MuiInputBase-input': { color: '#E6EAF0' }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' } }}
                    />
                    <TextField
                      fullWidth
                      label="Confirm Password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      margin="normal"
                      sx={{ '& .MuiInputBase-input': { color: '#E6EAF0' }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' } }}
                    />
                    {error && <Typography sx={{ color: '#ff6b6b', mt: 2, fontSize: '14px', textAlign: 'center' }}>{error}</Typography>}
                    <Button
                      fullWidth
                      variant="contained"
                      type="submit"
                      sx={{ mt: 4, py: 1.5, bgcolor: NEON_CYAN, color: '#000', fontWeight: 800, borderRadius: '12px' }}
                      disabled={loading}
                    >
                      {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
                    </Button>
                  </form>
                )}
              </Paper>
            </motion.div>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default Login;
