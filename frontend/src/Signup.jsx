import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, Paper, Alert, CircularProgress, MenuItem } from '@mui/material';
import { motion } from 'framer-motion';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import { useNavigate, Link } from 'react-router-dom';
import ArrowBack from '@mui/icons-material/ArrowBack';

const Signup = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [semester, setSemester] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [particlesReady, setParticlesReady] = useState(false);
  const navigate = useNavigate();

  const formContainerVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.45, staggerChildren: 0.1 }
    },
  };

  const formItemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
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
        opacity: 0.22,
        width: 1,
      },
      move: {
        enable: true,
        speed: 0.35,
        outModes: { default: 'bounce' },
      },
      number: { value: 42, density: { enable: true, area: 900 } },
      opacity: { value: 0.32 },
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

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Signup Failed");
      }
      setSuccess("Account Created! Redirecting...");
      setTimeout(() => navigate('/'), 2000);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <Box className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-gray-900" sx={{ 
      minHeight: '100vh', 
      width: '100%', 
      position: 'relative',
      overflow: 'hidden',
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      background: 'linear-gradient(-45deg, #1a0033, #000000, #003d4d, #00bcd4)', 
      backgroundSize: '400% 400%', 
      animation: 'gradientShift 15s ease infinite',
      p: 2,
      '@keyframes gradientShift': {
        '0%': { backgroundPosition: '0% 50%' },
        '50%': { backgroundPosition: '100% 50%' },
        '100%': { backgroundPosition: '0% 50%' }
      }
    }}>
      {particlesReady && (
        <Particles
          id="neural-registration-particles"
          options={particlesOptions}
          style={{ position: 'absolute', inset: 0, zIndex: 0 }}
        />
      )}

      <motion.div
        initial="hidden"
        animate="visible"
        variants={formContainerVariants}
        style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 700 }}
      >
        <Paper 
          elevation={24} 
          sx={{ 
            p: { xs: 4, sm: 5, md: 6 }, 
            width: '100%', 
            maxWidth: 700, 
            bgcolor: 'rgba(255, 255, 255, 0.05)', 
            color: 'white', 
            borderRadius: 4, 
            border: '1px solid rgba(3, 218, 198, 0.2)', 
            backdropFilter: 'blur(15px)', 
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.37)'
          }}
        >
          <motion.div variants={formItemVariants}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1 }}>
            <Button
              onClick={handleBack}
              startIcon={<ArrowBack />}
              sx={{
                color: 'rgba(255,255,255,0.8)',
                textTransform: 'none',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' }
              }}
            >
              Back
            </Button>
          </Box>
          </motion.div>
          <motion.div variants={formItemVariants}>
          <Typography 
            variant="h2" 
            align="center" 
            sx={{ 
              mb: 1, 
              background: 'linear-gradient(45deg, #03dac6, #bb86fc)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 10px rgba(3, 218, 198, 0.5)',
              fontWeight: 'bold',
              fontFamily: 'Poppins, sans-serif'
            }}
          >
            📝
          </Typography>
          </motion.div>
          <motion.div variants={formItemVariants}>
          <Typography 
            variant="h5" 
            fontWeight="bold" 
            align="center" 
            sx={{ 
              background: 'linear-gradient(45deg, #03dac6, #bb86fc)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent',
              mb: 1
            }}
          >
            Join BCABuddy
          </Typography>
          </motion.div>
          <motion.div variants={formItemVariants}>
          <Typography variant="body2" align="center" sx={{ mb: 3, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}>
            Future ka syllabus, Aaj hi start karo! 🚀
          </Typography>
          </motion.div>
          
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          
          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <motion.div variants={formItemVariants}>
              <TextField 
                fullWidth 
                label="Name / Username" 
                variant="filled" 
                margin="none" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                InputProps={{ 
                  disableUnderline: true, 
                  style: { color: 'white' },
                  sx: {
                    px: 2,
                    py: 1.5,
                    '&:focus': { boxShadow: '0 0 10px rgba(187, 134, 252, 0.5)' }
                  }
                }} 
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.05)', 
                  borderRadius: 1, 
                  '& .MuiInputLabel-root': { color: 'gray' },
                  '& .MuiFilledInput-root': { 
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                    '&.Mui-focused': { bgcolor: 'rgba(255,255,255,0.1)', boxShadow: '0 0 10px rgba(187, 134, 252, 0.5)' }
                  }
                }} 
              />
            </motion.div>
            <motion.div variants={formItemVariants}>
              <TextField 
                fullWidth 
                label="Email" 
                variant="filled" 
                margin="none" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                InputProps={{
                  disableUnderline: true,
                  style: { color: 'white' },
                  sx: {
                    px: 2,
                    py: 1.5,
                  },
                }}
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.05)', 
                  borderRadius: 1, 
                  '& .MuiInputLabel-root': { color: 'gray' },
                  '& .MuiFilledInput-root': { 
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                    '&.Mui-focused': { bgcolor: 'rgba(255,255,255,0.1)', boxShadow: '0 0 10px rgba(3, 218, 198, 0.5)' }
                  }
                }} 
              />
            </motion.div>
            <motion.div variants={formItemVariants}>
              <TextField 
                fullWidth 
                label="Choose Password" 
                type="password" 
                variant="filled" 
                margin="none" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                InputProps={{ 
                  disableUnderline: true, 
                  style: { color: 'white' },
                  sx: {
                    px: 2,
                    py: 1.5,
                    '&:focus': { boxShadow: '0 0 10px rgba(3, 218, 198, 0.5)' }
                  }
                }} 
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.05)', 
                  borderRadius: 1, 
                  '& .MuiInputLabel-root': { color: 'gray' },
                  '& .MuiFilledInput-root': { 
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                    '&.Mui-focused': { bgcolor: 'rgba(255,255,255,0.1)', boxShadow: '0 0 10px rgba(3, 218, 198, 0.5)' }
                  }
                }} 
              />
            </motion.div>
            <motion.div variants={formItemVariants}>
              <TextField
                select
                fullWidth
                label="Semester"
                variant="filled"
                margin="none"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                InputProps={{
                  disableUnderline: true,
                  style: { color: 'white' },
                  sx: {
                    px: 2,
                    py: 1.5,
                  },
                }}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.05)',
                  borderRadius: 1,
                  '& .MuiInputLabel-root': { color: 'gray' },
                  '& .MuiFilledInput-root': {
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                    '&.Mui-focused': { bgcolor: 'rgba(255,255,255,0.1)', boxShadow: '0 0 10px rgba(187, 134, 252, 0.5)' },
                  },
                  '& .MuiSvgIcon-root': { color: '#bb86fc' },
                }}
              >
                <MenuItem value="Sem 1">Sem 1</MenuItem>
                <MenuItem value="Sem 2">Sem 2</MenuItem>
                <MenuItem value="Sem 3">Sem 3</MenuItem>
                <MenuItem value="Sem 4">Sem 4</MenuItem>
                <MenuItem value="Sem 5">Sem 5</MenuItem>
                <MenuItem value="Sem 6">Sem 6</MenuItem>
              </TextField>
            </motion.div>
            <motion.div variants={formItemVariants} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                fullWidth 
                type="submit" 
                variant="contained" 
                disabled={loading} 
                sx={{ 
                  py: 1.5, 
                  bgcolor: 'linear-gradient(45deg, #03dac6, #bb86fc)', 
                  color: 'black', 
                  fontWeight: 'bold',
                  borderRadius: 2,
                  '&:hover': { bgcolor: 'linear-gradient(45deg, #00acc1, #9965f4)' }
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit"/> : "Create Account"}
              </Button>
            </motion.div>
          </form>
          
          <motion.div variants={formItemVariants}>
          <Typography variant="body2" align="center" sx={{ mt: 3, color: 'gray' }}>
            Already have an account? <Link to="/" style={{ color: '#03dac6', fontWeight: 'bold' }}>Login Here</Link>
          </Typography>
          </motion.div>
        </Paper>
      </motion.div>

      <div className="absolute bottom-6 left-0 w-full flex justify-center z-20 pointer-events-none">
        <div className="flex items-center gap-1.5 text-gray-400 text-sm font-medium tracking-wider">
          <span>Designed with</span>
          <span className="text-red-500 text-lg drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] mx-1 animate-pulse">❤️</span>
          <span className="text-gray-300 font-semibold tracking-widest">by insomniac for Frenzy</span>
        </div>
      </div>
      
    </Box>
  );
};

export default Signup;