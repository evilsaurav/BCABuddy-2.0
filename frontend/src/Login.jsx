import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { setToken } from './utils/tokenManager';
import { BCA_MOTIVATIONAL_QUOTES } from './utils/motivationalQuotes';
import { API_BASE } from './utils/apiConfig';
import BrandLogo from './components/BrandLogo';

const C = {
  darkBg:      '#0d0f14',
  accent:      '#03dac6',
  accentSoft:  'rgba(3,218,198,0.12)',
  purple:      '#bb86fc',
  lightBg:     '#f7f6f3',
  lightCard:   '#ffffff',
  textDark:    '#111827',
  textMuted:   '#6b7280',
  textLight:   'rgba(255,255,255,0.90)',
  textDim:     'rgba(255,255,255,0.40)',
  borderLight: '#e5e3df',
};

const FEATURES = [
  { icon: '🧠', label: 'AI-powered PYQ Predictor' },
  { icon: '🗺️', label: 'Smart Study Roadmap' },
  { icon: '⚡', label: 'Instant Doubt Solver' },
  { icon: '📊', label: 'Performance Analytics' },
  { icon: '🎯', label: 'Exam Simulation Mode' },
];

const useTypewriter = (text, speed = 34) => {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    if (!text) { setDisplayed(''); return; }
    let i = 0;
    setDisplayed('');
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text]);
  return displayed;
};

const LightInput = ({ label, type = 'text', value, onChange, autoFocus }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</label>
      <input
        type={type} value={value} onChange={onChange}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        autoFocus={autoFocus} required
        style={{
          fontSize: 15, color: C.textDark, background: '#fff',
          border: `1.5px solid ${focused ? C.accent : C.borderLight}`,
          borderRadius: 10, padding: '12px 14px', outline: 'none',
          transition: 'border-color 160ms, box-shadow 160ms',
          boxShadow: focused ? `0 0 0 3px rgba(3,218,198,0.15)` : 'none',
          width: '100%', boxSizing: 'border-box',
        }}
      />
    </div>
  );
};

const Login = ({ setIsAuthenticated }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [quote, setQuote]       = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();
  const typed = useTypewriter(quote, 30);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    if (BCA_MOTIVATIONAL_QUOTES?.length) {
      setQuote(BCA_MOTIVATIONAL_QUOTES[Math.floor(Math.random() * BCA_MOTIVATIONAL_QUOTES.length)]);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    try {
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
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;font-family:'Outfit',sans-serif}
        @keyframes caretBlink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes floatUp{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
      `}</style>

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>

        {/* LEFT — Dark Panel */}
        <div style={{
          width: isMobile ? '100%' : '52%',
          background: C.darkBg,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between',
          padding: isMobile ? '28px 20px 24px' : '52px 56px',
          position: 'relative', overflow: 'hidden',
          minHeight: isMobile ? 'auto' : '100vh',
        }}>
          {/* grid */}
          <div style={{ position:'absolute',inset:0,pointerEvents:'none', backgroundImage:`linear-gradient(rgba(3,218,198,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(3,218,198,0.04) 1px,transparent 1px)`, backgroundSize:'40px 40px' }} />
          {/* orbs */}
          <div style={{ position:'absolute',top:'8%',left:'12%',width:260,height:260,background:'radial-gradient(circle,rgba(3,218,198,0.14) 0%,transparent 70%)',filter:'blur(40px)',pointerEvents:'none' }} />
          <div style={{ position:'absolute',bottom:'12%',right:'6%',width:200,height:200,background:'radial-gradient(circle,rgba(187,134,252,0.12) 0%,transparent 70%)',filter:'blur(40px)',pointerEvents:'none' }} />
          {/* dots */}
          {!isMobile && [0,1,2,3,4,5,6,7,8].map(i => (
            <div key={i} style={{ position:'absolute', width: i%3===0?3:2, height:i%3===0?3:2, borderRadius:'50%', background:i%2===0?C.accent:C.purple, left:`${(i*43+13)%86+7}%`, top:`${(i*61+11)%80+10}%`, opacity:0.28, animation:`floatUp ${3+i*0.5}s ease-in-out ${i*0.25}s infinite`, pointerEvents:'none' }} />
          ))}

          {/* Logo */}
          <div style={{ position:'relative',zIndex:1 }}>
            <BrandLogo imgHeight={64} showTagline />
          </div>

          {/* Hero */}
          <div style={{ position:'relative',zIndex:1,marginTop: isMobile?24:0 }}>
            <h1 style={{ fontSize:isMobile?28:'clamp(26px,2.8vw,42px)', fontWeight:900, lineHeight:1.15, color:C.textLight, marginBottom:14, letterSpacing:'-0.6px' }}>
              Study Smarter,<br />
              <span style={{ background:`linear-gradient(135deg,${C.accent},${C.purple})`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent' }}>Score Better.</span>
            </h1>
            <div style={{ fontSize:13,color:'rgba(255,255,255,0.5)',lineHeight:1.75,minHeight:40,marginBottom:isMobile?0:28,borderLeft:`2px solid ${C.accent}`,paddingLeft:12,fontStyle:'italic' }}>
              {typed || '...'}<span style={{ display:'inline-block',width:2,height:'0.9em',background:C.accent,marginLeft:2,verticalAlign:'text-bottom',animation:'caretBlink 700ms step-end infinite' }} />
            </div>
            {!isMobile && (
              <div style={{ display:'flex',flexDirection:'column',gap:8,marginTop:8 }}>
                {FEATURES.map((f,i) => (
                  <motion.div key={f.label} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:0.4+i*0.07}}
                    style={{ display:'flex',alignItems:'center',gap:10,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:10,padding:'8px 12px' }}>
                    <span style={{fontSize:14}}>{f.icon}</span>
                    <span style={{fontSize:13,color:'rgba(255,255,255,0.68)',fontWeight:500}}>{f.label}</span>
                    <div style={{marginLeft:'auto',width:6,height:6,borderRadius:'50%',background:C.accent,boxShadow:`0 0 5px ${C.accent}`}} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div style={{ position:'relative',zIndex:1,height:isMobile?20:26 }} />
        </div>

        {/* RIGHT — Light Form Panel */}
        <div style={{
          width: isMobile ? '100%' : '48%',
          background: C.lightBg,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: isMobile ? '0' : '48px 40px',
          position: 'relative', minHeight: isMobile ? '100vh' : '100vh',
          overflowY: 'auto',
        }}>
          <div style={{ position:'absolute',inset:0,pointerEvents:'none',backgroundImage:`radial-gradient(circle at 80% 20%, rgba(3,218,198,0.05) 0%, transparent 50%)` }} />

          {/* Back Button */}
          <motion.button
            onClick={() => navigate('/')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              position: 'absolute',
              top: isMobile ? 12 : 20,
              left: isMobile ? 12 : 40,
              zIndex: 10,
              width: 40,
              height: 40,
              borderRadius: 10,
              border: `1.5px solid ${C.borderLight}`,
              background: C.lightCard,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              transition: 'all 180ms',
            }}
          >
            ←
          </motion.button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              width: '100%', maxWidth: 400,
              background: C.lightCard,
              borderRadius: 20,
              padding: isMobile ? '28px 20px' : '40px 36px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.09)',
              border: `1px solid ${C.borderLight}`,
              position: 'relative', zIndex: 1,
              margin: isMobile ? '48px 16px 80px 16px' : '0',
            }}
          >
            <div style={{ marginBottom: 26 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: C.textDark, marginBottom: 6, letterSpacing: '-0.4px' }}>Welcome back 👋</h2>
              <p style={{ fontSize: 14, color: C.textMuted }}>Sign in to continue your IGNOU journey</p>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
                  style={{ background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.22)',borderRadius:10,padding:'10px 14px',marginBottom:16,fontSize:13,color:'#dc2626',display:'flex',alignItems:'center',gap:8 }}>
                  ⚠️ {error}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleLogin} style={{ display:'flex',flexDirection:'column',gap:18 }}>
              <LightInput label="Username" value={username} onChange={e=>setUsername(e.target.value)} autoFocus />
              <LightInput label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
              <motion.button type="submit" disabled={loading}
                whileHover={{scale:loading?1:1.02}} whileTap={{scale:loading?1:0.98}}
                style={{ width:'100%',padding:'13px 0',borderRadius:12,border:'none',cursor:loading?'not-allowed':'pointer',fontSize:15,fontWeight:700,color:'#0a0f14',background:loading?'rgba(3,218,198,0.45)':`linear-gradient(135deg,${C.accent},${C.purple})`,boxShadow:loading?'none':`0 4px 16px rgba(3,218,198,0.30)`,transition:'all 200ms',display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginTop:4 }}>
                {loading ? (<><div style={{width:16,height:16,borderRadius:'50%',border:'2px solid rgba(0,0,0,0.18)',borderTopColor:'#000',animation:'spin 600ms linear infinite'}} />Signing in...</>) : 'Sign In →'}
              </motion.button>
            </form>

            <div style={{
              display:'flex',
              justifyContent:'space-between',
              alignItems:'center',
              marginTop:10,
              marginBottom:4,
              fontSize:13
            }}>
              <span style={{ color:C.textMuted }}>Forgot password?</span>
              <Link
                to="/forgot-password"
                style={{ textDecoration:'none',color:C.accent,fontWeight:700,cursor:'pointer' }}
              >
                Reset now
              </Link>
            </div>
            <div style={{ display:'flex',alignItems:'center',gap:12,margin:'22px 0' }}>
              <div style={{flex:1,height:1,background:C.borderLight}} />
              <span style={{fontSize:12,color:C.textMuted}}>New to BCABuddy?</span>
              <div style={{flex:1,height:1,background:C.borderLight}} />
            </div>

            <Link to="/signup" style={{textDecoration:'none'}}>
              <motion.div whileHover={{background:C.accentSoft,borderColor:C.accent}}
                style={{ display:'block',textAlign:'center',padding:'12px 0',borderRadius:12,border:`1.5px solid ${C.borderLight}`,fontSize:14,fontWeight:600,color:C.textDark,transition:'all 180ms' }}>
                Create Account ✨
              </motion.div>
            </Link>

            <Link to="/about" style={{ textDecoration: 'none', marginTop: 10, display: 'block' }}>
              <motion.div
                whileHover={{ background: C.accentSoft, borderColor: C.accent }}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '10px 0',
                  borderRadius: 12,
                  border: `1.5px solid ${C.borderLight}`,
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.textDark,
                  transition: 'all 180ms',
                }}
              >
                About BCABuddy
              </motion.div>
            </Link>
          </motion.div>

          <div style={{ display:'flex',alignItems:'center',gap:5,fontSize:11,color:'#9ca3af',zIndex:1,marginTop:24,marginBottom:isMobile?20:0 }}>
            <span>Designed with</span>
            <motion.span animate={{scale:[1,1.3,1]}} transition={{duration:1.5,repeat:Infinity}} style={{fontSize:13}}>❤️</motion.span>
            <span style={{fontWeight:600,color:'#6b7280'}}>By Insomniac for Frenzy</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
