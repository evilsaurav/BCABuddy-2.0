import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import Login from './Login';
import Signup from './Signup';
import Dashboard from './Dashboard';
import EditProfile from './EditProfile';
import './App.css';
import { AuthProvider } from './AuthContext';

const FRENZY_STORAGE_KEY = 'bcabuddy_frenzy_override_v1';

const safeJsonParse = (value, fallback) => {
  try {
    if (!value) return fallback;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeFrenzyOverride = (payload) => {
  if (!payload || payload.active === false || payload.theme_override === null) return null;
  if (typeof payload === 'string') {
    return {
      active: true,
      persona: 'frenzy',
      mode: payload,
      poem: '',
      speedMs: 60,
      resetLabel: 'Restore'
    };
  }
  if (typeof payload?.theme_override === 'string') {
    return {
      active: true,
      persona: payload.persona || 'frenzy',
      mode: payload.theme_override,
      poem: payload.message || payload.poem || '',
      speedMs: Number(payload.speed_ms || payload.speedMs || 60),
      resetLabel: payload.reset_label || payload.resetLabel || 'Restore'
    };
  }
  return {
    active: true,
    persona: payload.persona || 'frenzy',
    mode: payload.mode || 'melancholic',
    poem: payload.poem || '',
    speedMs: Number(payload.speed_ms || payload.speedMs || 60),
    resetLabel: payload.reset_label || payload.resetLabel || 'Restore'
  };
};

const TypewriterText = ({ text, speedMs = 60, onComplete, scrollRef }) => {
  const [displayed, setDisplayed] = useState('');
  const timerRef = useRef(null);

  useEffect(() => {
    let index = 0;
    setDisplayed('');

    const tick = () => {
      setDisplayed((prev) => prev + text.charAt(index));
      index += 1;

      if (scrollRef?.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
      if (index >= text.length) {
        if (onComplete) onComplete();
        return;
      }
      timerRef.current = setTimeout(tick, speedMs);
    };

    timerRef.current = setTimeout(tick, speedMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, speedMs, onComplete, scrollRef]);

  return <div className="frenzy-poem">{displayed}</div>;
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000000',
          color: '#ff6b6b',
          padding: '24px',
          textAlign: 'center'
        }}>
          <div>
            <div style={{ fontSize: '20px', marginBottom: '12px' }}>Something went wrong.</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>{String(this.state.error)}</div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [frenzyOverride, setFrenzyOverride] = useState(() => {
    const stored = safeJsonParse(localStorage.getItem(FRENZY_STORAGE_KEY), null);
    return normalizeFrenzyOverride(stored);
  });
  const frenzyScrollRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  useEffect(() => {
    const body = document.body;
    if (frenzyOverride?.active) {
      body.classList.add('frenzy-mode');
    } else {
      body.classList.remove('frenzy-mode');
    }
  }, [frenzyOverride]);

  const applyFrenzyOverride = (payload) => {
    if (!payload || payload.active === false || payload.theme_override === null) {
      setFrenzyOverride(null);
      localStorage.removeItem(FRENZY_STORAGE_KEY);
      return;
    }
    const normalized = normalizeFrenzyOverride(payload);
    if (!normalized) return;
    setFrenzyOverride(normalized);
    localStorage.setItem(FRENZY_STORAGE_KEY, JSON.stringify(normalized));
  };

  return (
    <ErrorBoundary>
      <AuthProvider>
        <MotionConfig transition={{ duration: frenzyOverride?.active ? 2.5 : 0.3 }}>
          <Router>
            <Routes>
              <Route 
                path="/" 
                element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login setIsAuthenticated={setIsAuthenticated} />} 
              />
              <Route 
                path="/signup" 
                element={<Signup />} 
              />
              <Route 
                path="/dashboard" 
                element={isAuthenticated ? <Dashboard onThemeOverride={applyFrenzyOverride} /> : <Navigate to="/" replace />} 
              />
              <Route 
                path="/edit-profile" 
                element={isAuthenticated ? <EditProfile /> : <Navigate to="/" replace />} 
              />
            </Routes>
          </Router>
          <AnimatePresence>
            {frenzyOverride?.active && (
              <motion.div
                className="frenzy-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="frenzy-panel"
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 10, opacity: 0 }}
                >
                  <div className="frenzy-title">Frenzy</div>
                  <div className="frenzy-subtitle">Melancholic Override</div>
                  <div className="frenzy-poem-wrap">
                    <div className="frenzy-poem-scroll" ref={frenzyScrollRef}>
                      <TypewriterText
                        text={frenzyOverride.poem || ''}
                        speedMs={frenzyOverride.speedMs}
                        scrollRef={frenzyScrollRef}
                      />
                    </div>
                    <div className="frenzy-fade" />
                  </div>
                </motion.div>
                <button className="frenzy-reset frenzy-reset-fixed" onClick={() => applyFrenzyOverride({ active: false })}>
                  {frenzyOverride.resetLabel || 'Restore'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </MotionConfig>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;