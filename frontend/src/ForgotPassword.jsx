import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
  Link,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowBack, Mail, Lock, CheckCircle } from '@mui/icons-material';
import { API_BASE } from './utils/apiConfig';

const NEON_PURPLE = '#bb86fc';
const NEON_CYAN = '#03dac6';
const GLASS_BG = 'rgba(30, 41, 59, 0.5)';
const GLASS_BORDER = '1px solid rgba(255, 255, 255, 0.1)';

const ForgotPassword = () => {
  const navigate = useNavigate();
  
  // State management
  const [step, setStep] = useState('username'); // 'username' → 'reset' → 'success'
  const [username, setUsername] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = String(params.get('token') || '').trim();
    if (tokenFromUrl) {
      setResetToken(tokenFromUrl);
      setStep('reset');
      setSuccessMessage('Reset link verified. Please set your new password.');
    }
  }, []);

  // Step 1: Request password reset with username
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const usernameValue = String(username || '').trim();
      if (!usernameValue) {
        setError('Username is required');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameValue }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.detail || 'Failed to generate reset token');
      }

      const data = await response.json();
      setResetToken(data.reset_token || '');
      setStep('reset');
      if (data.email_sent) {
        setSuccessMessage('Password reset link sent to your registered email. Open the link or paste your reset token below.');
      } else {
        setSuccessMessage(`Reset token ready. Token expires in ${data.expires_in_minutes || 15} minutes.`);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset password with token
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!newPassword || !confirmPassword) {
        setError('Both password fields are required');
        setLoading(false);
        return;
      }

      if (!String(resetToken || '').trim()) {
        setError('Reset token is required. Open email link or paste token manually.');
        setLoading(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      if (newPassword.length < 8) {
        setError('Password must be at least 8 characters long');
        setLoading(false);
        return;
      }

      if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        setError('Password must contain at least one letter and one digit');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reset_token: resetToken,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.detail || 'Failed to reset password');
      }

      const data = await response.json();
      setStep('success');
      setSuccessMessage(data.message || 'Password reset successfully!');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#0a0d17',
        backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(187, 134, 252, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(3, 218, 198, 0.05) 0%, transparent 50%)',
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Back Button */}
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/')}
            sx={{
              color: NEON_CYAN,
              mb: 3,
              '&:hover': { bgcolor: `${NEON_CYAN}15` },
            }}
          >
            Back to Login
          </Button>

          <Card
            sx={{
              bgcolor: GLASS_BG,
              border: GLASS_BORDER,
              borderRadius: '20px',
              backdropFilter: 'blur(12px)',
              p: 4,
            }}
          >
            {/* Step 1: Username Entry */}
            {step === 'username' && (
              <motion.div
                key="step-username"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Typography
                  variant="h4"
                  sx={{
                    color: '#E6EAF0',
                    fontWeight: 900,
                    mb: 1,
                    bgClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundImage: `linear-gradient(135deg, ${NEON_PURPLE}, ${NEON_CYAN})`,
                  }}
                >
                  🔐 Reset Your Password
                </Typography>

                <Typography
                  sx={{
                    color: 'rgba(230, 234, 240, 0.7)',
                    mb: 3,
                    fontSize: '14px',
                    lineHeight: 1.6,
                  }}
                >
                  Enter your username. If your account has an email, we will send a secure reset link. Otherwise, you can continue with a token.
                </Typography>

                {error && (
                  <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>
                    {error}
                  </Alert>
                )}

                <Box component="form" onSubmit={handleForgotPassword} sx={{ display: 'grid', gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Username"
                    variant="outlined"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    startAdornment={<Mail sx={{ mr: 1, color: NEON_CYAN }} />}
                    disabled={loading}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'rgba(255,255,255,0.04)',
                        color: '#E6EAF0',
                        borderRadius: '12px',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
                        '&:hover fieldset': { borderColor: `${NEON_CYAN}35` },
                        '&.Mui-focused fieldset': { borderColor: `${NEON_CYAN}60` },
                      },
                      '& .MuiOutlinedInput-input': { color: '#E6EAF0' },
                      '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.4)', opacity: 1 },
                    }}
                  />

                  <Button
                    fullWidth
                    variant="contained"
                    type="submit"
                    disabled={loading}
                    sx={{
                      bgcolor: NEON_PURPLE,
                      color: '#0a0d17',
                      fontWeight: 900,
                      py: 1.5,
                      borderRadius: '12px',
                      fontSize: '15px',
                      textTransform: 'none',
                      '&:hover': {
                        bgcolor: '#cc75ff',
                        boxShadow: `0 0 20px ${NEON_PURPLE}50`,
                      },
                      '&:disabled': { opacity: 0.6 },
                    }}
                  >
                    {loading ? <CircularProgress size={20} /> : 'Send Reset Link'}
                  </Button>
                </Box>

                <Typography
                  sx={{
                    color: 'rgba(255,255,255,0.55)',
                    fontSize: '13px',
                    mt: 2,
                    textAlign: 'center',
                  }}
                >
                  Remember your password?{' '}
                  <Link
                    onClick={() => navigate('/')}
                    sx={{
                      color: NEON_CYAN,
                      cursor: 'pointer',
                      fontWeight: 700,
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    Login instead
                  </Link>
                </Typography>
              </motion.div>
            )}

            {/* Step 2: Password Reset */}
            {step === 'reset' && (
              <motion.div
                key="step-reset"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Typography
                  variant="h4"
                  sx={{
                    color: '#E6EAF0',
                    fontWeight: 900,
                    mb: 1,
                    bgClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundImage: `linear-gradient(135deg, ${NEON_CYAN}, ${NEON_PURPLE})`,
                  }}
                >
                  ✨ Set New Password
                </Typography>

                <Typography
                  sx={{
                    color: 'rgba(230, 234, 240, 0.7)',
                    mb: 3,
                    fontSize: '14px',
                    lineHeight: 1.6,
                  }}
                >
                  Enter your new password. Must be at least 8 characters with letters and numbers.
                </Typography>

                {successMessage && (
                  <Alert severity="info" sx={{ mb: 2, borderRadius: '12px' }}>
                    {successMessage}
                  </Alert>
                )}

                {error && (
                  <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>
                    {error}
                  </Alert>
                )}

                <Box component="form" onSubmit={handleResetPassword} sx={{ display: 'grid', gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Reset Token"
                    variant="outlined"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="Paste token from email link if needed"
                    disabled={loading}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'rgba(255,255,255,0.04)',
                        color: '#E6EAF0',
                        borderRadius: '12px',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
                        '&:hover fieldset': { borderColor: `${NEON_CYAN}35` },
                        '&.Mui-focused fieldset': { borderColor: `${NEON_CYAN}60` },
                      },
                      '& .MuiOutlinedInput-input': { color: '#E6EAF0' },
                      '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.4)', opacity: 1 },
                    }}
                  />

                  <TextField
                    fullWidth
                    label="New Password"
                    type="password"
                    variant="outlined"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    startAdornment={<Lock sx={{ mr: 1, color: NEON_CYAN }} />}
                    disabled={loading}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'rgba(255,255,255,0.04)',
                        color: '#E6EAF0',
                        borderRadius: '12px',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
                        '&:hover fieldset': { borderColor: `${NEON_CYAN}35` },
                        '&.Mui-focused fieldset': { borderColor: `${NEON_CYAN}60` },
                      },
                      '& .MuiOutlinedInput-input': { color: '#E6EAF0' },
                      '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.4)', opacity: 1 },
                    }}
                  />

                  <TextField
                    fullWidth
                    label="Confirm Password"
                    type="password"
                    variant="outlined"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    startAdornment={<Lock sx={{ mr: 1, color: NEON_CYAN }} />}
                    disabled={loading}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'rgba(255,255,255,0.04)',
                        color: '#E6EAF0',
                        borderRadius: '12px',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
                        '&:hover fieldset': { borderColor: `${NEON_CYAN}35` },
                        '&.Mui-focused fieldset': { borderColor: `${NEON_CYAN}60` },
                      },
                      '& .MuiOutlinedInput-input': { color: '#E6EAF0' },
                      '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.4)', opacity: 1 },
                    }}
                  />

                  <Button
                    fullWidth
                    variant="contained"
                    type="submit"
                    disabled={loading}
                    sx={{
                      bgcolor: NEON_CYAN,
                      color: '#0a0d17',
                      fontWeight: 900,
                      py: 1.5,
                      borderRadius: '12px',
                      fontSize: '15px',
                      textTransform: 'none',
                      '&:hover': {
                        bgcolor: '#1efff0',
                        boxShadow: `0 0 20px ${NEON_CYAN}50`,
                      },
                      '&:disabled': { opacity: 0.6 },
                    }}
                  >
                    {loading ? <CircularProgress size={20} /> : 'Reset Password'}
                  </Button>
                </Box>

                <Typography
                  sx={{
                    color: 'rgba(255,255,255,0.55)',
                    fontSize: '12px',
                    mt: 2,
                    textAlign: 'center',
                  }}
                >
                  Token expires in 15 minutes
                </Typography>
              </motion.div>
            )}

            {/* Step 3: Success */}
            {step === 'success' && (
              <motion.div
                key="step-success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Box sx={{ textAlign: 'center' }}>
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.6, repeat: 2 }}
                  >
                    <CheckCircle
                      sx={{
                        fontSize: 80,
                        color: '#10B981',
                        mb: 2,
                        mx: 'auto',
                      }}
                    />
                  </motion.div>

                  <Typography
                    variant="h4"
                    sx={{
                      color: '#10B981',
                      fontWeight: 900,
                      mb: 1,
                    }}
                  >
                    Password Reset Successful!
                  </Typography>

                  <Typography
                    sx={{
                      color: 'rgba(230, 234, 240, 0.7)',
                      mb: 3,
                      fontSize: '14px',
                      lineHeight: 1.8,
                    }}
                  >
                    {successMessage}
                    <br />
                    <br />
                    Redirecting to login page in 3 seconds...
                  </Typography>

                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => navigate('/')}
                    sx={{
                      bgcolor: NEON_CYAN,
                      color: '#0a0d17',
                      fontWeight: 900,
                      py: 1.5,
                      borderRadius: '12px',
                      fontSize: '15px',
                      textTransform: 'none',
                    }}
                  >
                    Back to Login Now
                  </Button>
                </Box>
              </motion.div>
            )}
          </Card>

          {/* Footer */}
          <Typography
            sx={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: '12px',
              textAlign: 'center',
              mt: 3,
            }}
          >
            🔒 Secured password reset. Token expires in 15 minutes.
          </Typography>
        </motion.div>
      </Container>
    </Box>
  );
};

export default ForgotPassword;
