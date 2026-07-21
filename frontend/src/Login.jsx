import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { setToken } from './utils/tokenManager';
import { API_BASE } from './utils/apiConfig';
import BrandLogo from './components/BrandLogo';

// Premium Color Palette
const C = {
  bg: '#050505',
  glass: 'rgba(255, 255, 255, 0.03)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  accent: '#03dac6',
  accentGlow: 'rgba(3, 218, 198, 0.4)',
  purple: '#bb86fc',
  purpleGlow: 'rgba(187, 134, 252, 0.4)',
  textPrimary: '#ffffff',
  textSecondary: '#a0a0a0',
  error: '#ff5555'
};

const AuthInput = ({ label, type = 'text', value, onChange }) => {
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;

  return (
    <div style={{ position: 'relative', width: '100%', marginBottom: '24px' }}>
      <motion.label
        initial={false}
        animate={{
          top: active ? '-10px' : '14px',
          left: active ? '12px' : '16px',
          fontSize: active ? '12px' : '15px',
          color: active ? C.accent : C.textSecondary,
          background: active ? C.bg : 'transparent',
          padding: active ? '0 4px' : '0'
        }}
        style={{
          position: 'absolute',
          pointerEvents: 'none',
          fontWeight: 500,
          letterSpacing: '0.02em',
          zIndex: 1,
          borderRadius: '4px'
        }}
        transition={{ duration: 0.2 }}
      >
        {label}
      </motion.label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required
        style={{
          width: '100%',
          padding: '14px 16px',
          fontSize: '16px',
          color: C.textPrimary,
          background: 'transparent',
          border: `1.5px solid ${focused ? C.accent : C.glassBorder}`,
          borderRadius: '12px',
          outline: 'none',
          boxShadow: focused ? `0 0 0 4px rgba(3, 218, 198, 0.1)` : 'none',
          transition: 'all 0.3s ease',
          boxSizing: 'border-box'
        }}
      />
    </div>
  );
};

const AuthPage = ({ setIsAuthenticated }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isLogin) {
        // LOGIN FLOW
        const params = new URLSearchParams();
        params.append('username', username);
        params.append('password', password);
        const res = await fetch(`${API_BASE}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        });
        if (!res.ok) throw new Error('Invalid username or password');
        const data = await res.json();
        setToken(data.access_token);
        localStorage.setItem('username', username);
        localStorage.setItem('session_start', Date.now().toString());
        setIsAuthenticated(true);
        navigate('/dashboard');
      } else {
        // SIGNUP FLOW
        const res = await fetch(`${API_BASE}/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.detail || 'Signup failed');
        }
        setSuccess('Account created successfully! Switching to Login...');
        setTimeout(() => {
          setIsLogin(true);
          setPassword('');
          setSuccess('');
        }, 2000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccess('');
    setUsername('');
    setPassword('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: C.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Outfit', sans-serif"
    }}>
      {/* 4D Animated Background Orbs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 90, 0],
          x: [0, 50, 0],
          y: [0, -50, 0]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: 'absolute',
          top: '10%',
          left: '15%',
          width: '40vw',
          height: '40vw',
          background: `radial-gradient(circle, ${C.accentGlow} 0%, transparent 60%)`,
          filter: 'blur(60px)',
          pointerEvents: 'none',
          opacity: 0.5
        }}
      />
      <motion.div
        animate={{
          scale: [1, 1.5, 1],
          rotate: [0, -90, 0],
          x: [0, -50, 0],
          y: [0, 50, 0]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: 'absolute',
          bottom: '5%',
          right: '10%',
          width: '50vw',
          height: '50vw',
          background: `radial-gradient(circle, ${C.purpleGlow} 0%, transparent 60%)`,
          filter: 'blur(80px)',
          pointerEvents: 'none',
          opacity: 0.4
        }}
      />

      {/* Grid Overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        backgroundImage: `linear-gradient(${C.glassBorder} 1px, transparent 1px), linear-gradient(90deg, ${C.glassBorder} 1px, transparent 1px)`,
        backgroundSize: '50px 50px',
        opacity: 0.3
      }} />

      {/* Auth Container */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '40px',
          background: C.glass,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${C.glassBorder}`,
          borderRadius: '24px',
          boxShadow: '0 30px 60px rgba(0,0,0,0.4)',
          zIndex: 10,
          margin: '20px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <BrandLogo imgHeight={48} showTagline={false} />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, color: C.textPrimary, marginBottom: '8px' }}>
            {isLogin ? 'Welcome Back' : 'Join BCABuddy'}
          </h2>
          <p style={{ color: C.textSecondary, fontSize: '15px' }}>
            {isLogin ? 'Enter your details to access your dashboard' : 'Create an account to start learning smartly'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">
            <motion.div
              key={isLogin ? 'login' : 'signup'}
              initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
              transition={{ duration: 0.3 }}
            >
              <AuthInput
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <AuthInput
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </motion.div>
          </AnimatePresence>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ color: C.error, fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}
              >
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ color: C.accent, fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}
              >
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
              color: '#000',
              fontSize: '16px',
              fontWeight: 700,
              border: 'none',
              borderRadius: '12px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              boxShadow: `0 8px 24px ${C.accentGlow}`,
              marginTop: '8px'
            }}
          >
            {loading ? (
              <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>↻</span>
            ) : (
              isLogin ? 'Sign In' : 'Sign Up'
            )}
          </motion.button>
        </form>

        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <p style={{ color: C.textSecondary, fontSize: '14px' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span
              onClick={toggleMode}
              style={{
                color: C.accent,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.color = C.textPrimary}
              onMouseOut={(e) => e.target.style.color = C.accent}
            >
              {isLogin ? 'Sign up now' : 'Sign in here'}
            </span>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
