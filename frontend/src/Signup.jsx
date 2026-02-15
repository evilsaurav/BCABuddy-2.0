import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Paper, Alert, CircularProgress } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import ArrowBack from '@mui/icons-material/ArrowBack';

const Signup = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

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
    <Box sx={{ 
      minHeight: '100vh', 
      width: '100%', 
      display: 'flex', 
      flexDirection: 'column',
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
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <Paper 
          elevation={24} 
          sx={{ 
            p: 4, 
            width: '100%', 
            maxWidth: 350, 
            bgcolor: 'rgba(255, 255, 255, 0.05)', 
            color: 'white', 
            borderRadius: 4, 
            border: '1px solid rgba(3, 218, 198, 0.2)', 
            backdropFilter: 'blur(15px)', 
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.37)'
          }}
        >
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
          <Typography variant="body2" align="center" sx={{ mb: 3, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}>
            Future ka syllabus, Aaj hi start karo! 🚀
          </Typography>
          
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          
          <form onSubmit={handleSignup}>
            <motion.div whileFocus={{ scale: 1.02 }}>
              <TextField 
                fullWidth 
                label="Choose Username" 
                variant="filled" 
                margin="normal" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                InputProps={{ 
                  disableUnderline: true, 
                  style: { color: 'white' },
                  sx: {
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
            <motion.div whileFocus={{ scale: 1.02 }}>
              <TextField 
                fullWidth 
                label="Choose Password" 
                type="password" 
                variant="filled" 
                margin="normal" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                InputProps={{ 
                  disableUnderline: true, 
                  style: { color: 'white' },
                  sx: {
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
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                fullWidth 
                type="submit" 
                variant="contained" 
                disabled={loading} 
                sx={{ 
                  mt: 3, 
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
          
          <Typography variant="body2" align="center" sx={{ mt: 3, color: 'gray' }}>
            Already have an account? <Link to="/" style={{ color: '#03dac6', fontWeight: 'bold' }}>Login Here</Link>
          </Typography>
        </Paper>
      </motion.div>
      
      <Box sx={{ textAlign: 'center', opacity: 0.7, maxWidth: '90%', mt: 3 }}>
        <Typography variant="subtitle2" sx={{ color: '#03dac6', fontWeight: 'bold', letterSpacing: 2, mb: 2 }}>
          👨‍💻 SAURAV KUMAR
        </Typography>
        <Box sx={{ bgcolor: 'rgba(0,0,0,0.3)', p: 1.5, borderRadius: 2, border: '1px dashed rgba(255,255,255,0.2)' }}>
          <Typography variant="caption" sx={{ color: '#bb86fc', fontFamily: 'monospace' }}>
            "Dream big, Code bigger!"
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Signup;