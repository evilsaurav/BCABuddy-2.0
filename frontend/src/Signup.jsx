import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE } from './utils/apiConfig';

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

const SEMESTERS = ['Sem 1','Sem 2','Sem 3','Sem 4','Sem 5','Sem 6'];

const STEPS = [
  { n:'01', label:'Create your free account', active:true },
  { n:'02', label:'Pick your semester & subjects', active:true },
  { n:'03', label:'Start your AI-powered journey', active:false },
];

const LightInput = ({ label, type='text', value, onChange, required=true }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{display:'flex',flexDirection:'column',gap:6}}>
      <label style={{fontSize:11,fontWeight:700,color:C.textMuted,letterSpacing:'0.08em',textTransform:'uppercase'}}>{label}</label>
      <input type={type} value={value} onChange={onChange} required={required}
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
        style={{ fontSize:15,color:C.textDark,background:'#fff',border:`1.5px solid ${focused?C.accent:C.borderLight}`,borderRadius:10,padding:'12px 14px',outline:'none',transition:'border-color 160ms,box-shadow 160ms',boxShadow:focused?`0 0 0 3px rgba(3,218,198,0.15)`:'none',width:'100%',boxSizing:'border-box' }}
      />
    </div>
  );
};

const LightSelect = ({ label, value, onChange }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{display:'flex',flexDirection:'column',gap:6}}>
      <label style={{fontSize:11,fontWeight:700,color:C.textMuted,letterSpacing:'0.08em',textTransform:'uppercase'}}>{label}</label>
      <select value={value} onChange={onChange} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
        style={{ fontSize:15,color:value?C.textDark:C.textMuted,background:'#fff',border:`1.5px solid ${focused?C.purple:C.borderLight}`,borderRadius:10,padding:'12px 14px',outline:'none',transition:'all 160ms',boxShadow:focused?`0 0 0 3px rgba(187,134,252,0.15)`:'none',width:'100%',cursor:'pointer',appearance:'none',
          backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'%3E%3Cpath fill='%236b7280' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`,
          backgroundRepeat:'no-repeat',backgroundPosition:'right 14px center',boxSizing:'border-box' }}>
        <option value="">Select semester</option>
        {SEMESTERS.map(s=><option key={s} value={s}>{s}</option>)}
      </select>
    </div>
  );
};

const Signup = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [semester, setSemester] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Signup failed'); }
      setSuccess('Account created! Redirecting...');
      setTimeout(() => navigate('/'), 1800);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;font-family:'Outfit',sans-serif}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes floatUp{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
      `}</style>

      <div style={{ minHeight:'100vh',display:'flex',flexDirection:isMobile?'column':'row' }}>

        {/* LEFT — Dark Panel */}
        <div style={{ width:isMobile?'100%':'52%',background:C.darkBg,display:'flex',flexDirection:'column',justifyContent:'space-between',padding:isMobile?'28px 20px 24px':'52px 56px',position:'relative',overflow:'hidden',minHeight:isMobile?'auto':'100vh' }}>
          {/* grid */}
          <div style={{ position:'absolute',inset:0,pointerEvents:'none',backgroundImage:`linear-gradient(rgba(3,218,198,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(3,218,198,0.04) 1px,transparent 1px)`,backgroundSize:'40px 40px' }} />
          <div style={{ position:'absolute',top:'8%',left:'12%',width:260,height:260,background:'radial-gradient(circle,rgba(3,218,198,0.13) 0%,transparent 70%)',filter:'blur(40px)',pointerEvents:'none' }} />
          <div style={{ position:'absolute',bottom:'12%',right:'6%',width:200,height:200,background:'radial-gradient(circle,rgba(187,134,252,0.11) 0%,transparent 70%)',filter:'blur(40px)',pointerEvents:'none' }} />
          {!isMobile && [0,1,2,3,4,5,6,7,8].map(i => (
            <div key={i} style={{ position:'absolute',width:i%3===0?3:2,height:i%3===0?3:2,borderRadius:'50%',background:i%2===0?C.accent:C.purple,left:`${(i*43+13)%86+7}%`,top:`${(i*61+11)%80+10}%`,opacity:0.28,animation:`floatUp ${3+i*0.5}s ease-in-out ${i*0.25}s infinite`,pointerEvents:'none' }} />
          ))}

          {/* Logo */}
          <div style={{position:'relative',zIndex:1}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:36,height:36,borderRadius:10,background:`linear-gradient(135deg,${C.accent},${C.purple})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,fontWeight:900,color:'#0d0f14',boxShadow:`0 0 16px rgba(3,218,198,0.35)`,flexShrink:0}}>B</div>
              <div>
                <div style={{fontWeight:800,fontSize:18,background:`linear-gradient(135deg,${C.accent},${C.purple})`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>BCABuddy</div>
                <div style={{fontSize:10,color:C.textDim,letterSpacing:'0.08em',textTransform:'uppercase'}}>IGNOU BCA · AI Learning Platform</div>
              </div>
            </div>
          </div>

          {/* Hero */}
          <div style={{position:'relative',zIndex:1,marginTop:isMobile?24:0}}>
            <h1 style={{fontSize:isMobile?28:'clamp(26px,2.8vw,42px)',fontWeight:900,lineHeight:1.15,color:C.textLight,marginBottom:14,letterSpacing:'-0.6px'}}>
              Join 1000+<br />
              <span style={{background:`linear-gradient(135deg,${C.accent},${C.purple})`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>BCA Warriors.</span>
            </h1>
            <p style={{fontSize:13,color:'rgba(255,255,255,0.48)',lineHeight:1.75,marginBottom:isMobile?0:28,borderLeft:`2px solid ${C.purple}`,paddingLeft:12,fontStyle:'italic'}}>
              "IGNOU ki padhai mushkil hai, akele aur bhi. BCABuddy ke saath study smarter."
            </p>
            {!isMobile && (
              <div style={{display:'flex',flexDirection:'column',gap:12,marginTop:24}}>
                {STEPS.map((s,i) => (
                  <motion.div key={s.n} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:0.4+i*0.1}}
                    style={{display:'flex',alignItems:'center',gap:14}}>
                    <div style={{width:32,height:32,borderRadius:8,flexShrink:0,background:s.active?`linear-gradient(135deg,${i===0?C.accent:C.purple},${i===0?'#00b5a3':'#9b5cf6'})`:'rgba(255,255,255,0.05)',border:s.active?'none':'1px solid rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:11,color:s.active?'#0d0f14':'rgba(255,255,255,0.3)'}}>
                      {s.n}
                    </div>
                    <span style={{fontSize:13,color:s.active?'rgba(255,255,255,0.72)':'rgba(255,255,255,0.32)',fontWeight:500}}>{s.label}</span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div style={{position:'relative',zIndex:1,height:isMobile?20:26}} />
        </div>

        {/* RIGHT — Light Form Panel */}
        <div style={{ width:isMobile?'100%':'48%',background:C.lightBg,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:isMobile?'36px 16px 64px':'48px 40px',position:'relative',minHeight:'100vh' }}>
          <div style={{position:'absolute',inset:0,pointerEvents:'none',backgroundImage:`radial-gradient(circle at 80% 20%, rgba(187,134,252,0.05) 0%, transparent 50%)`}} />

          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.5}}
            style={{ width:'100%',maxWidth:400,background:C.lightCard,borderRadius:20,padding:isMobile?'28px 20px':'40px 36px',boxShadow:'0 2px 4px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.09)',border:`1px solid ${C.borderLight}`,position:'relative',zIndex:1 }}>

            <div style={{marginBottom:24}}>
              <h2 style={{fontSize:24,fontWeight:800,color:C.textDark,marginBottom:6,letterSpacing:'-0.4px'}}>Create your account ✨</h2>
              <p style={{fontSize:14,color:C.textMuted}}>Join BCABuddy and ace your IGNOU BCA</p>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
                  style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.22)',borderRadius:10,padding:'10px 14px',marginBottom:16,fontSize:13,color:'#dc2626',display:'flex',alignItems:'center',gap:8}}>
                  ⚠️ {error}
                </motion.div>
              )}
              {success && (
                <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}}
                  style={{background:'rgba(3,218,198,0.08)',border:'1px solid rgba(3,218,198,0.25)',borderRadius:10,padding:'10px 14px',marginBottom:16,fontSize:13,color:'#059669',display:'flex',alignItems:'center',gap:8}}>
                  ✅ {success}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSignup} style={{display:'flex',flexDirection:'column',gap:16}}>
              <LightInput label="Username" value={username} onChange={e=>setUsername(e.target.value)} />
              <LightInput label="Email (optional)" type="email" value={email} onChange={e=>setEmail(e.target.value)} required={false} />
              <LightSelect label="Semester" value={semester} onChange={e=>setSemester(e.target.value)} />
              <LightInput label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />

              <motion.button type="submit" disabled={loading}
                whileHover={{scale:loading?1:1.02}} whileTap={{scale:loading?1:0.98}}
                style={{ width:'100%',padding:'13px 0',borderRadius:12,border:'none',cursor:loading?'not-allowed':'pointer',fontSize:15,fontWeight:700,color:'#0a0f14',background:loading?'rgba(3,218,198,0.45)':`linear-gradient(135deg,${C.accent},${C.purple})`,boxShadow:loading?'none':`0 4px 16px rgba(3,218,198,0.30)`,transition:'all 200ms',display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginTop:4 }}>
                {loading?(<><div style={{width:16,height:16,borderRadius:'50%',border:'2px solid rgba(0,0,0,0.18)',borderTopColor:'#000',animation:'spin 600ms linear infinite'}}/>Creating...</>):'Create Account →'}
              </motion.button>
            </form>

            <div style={{display:'flex',alignItems:'center',gap:12,margin:'20px 0'}}>
              <div style={{flex:1,height:1,background:C.borderLight}} />
              <span style={{fontSize:12,color:C.textMuted}}>Already have an account?</span>
              <div style={{flex:1,height:1,background:C.borderLight}} />
            </div>

            <Link to="/" style={{textDecoration:'none'}}>
              <motion.div whileHover={{background:C.accentSoft,borderColor:C.accent}}
                style={{display:'block',textAlign:'center',padding:'12px 0',borderRadius:12,border:`1.5px solid ${C.borderLight}`,fontSize:14,fontWeight:600,color:C.textDark,transition:'all 180ms'}}>
                Sign In Instead
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

          <div style={{position:'absolute',bottom:16,display:'flex',alignItems:'center',gap:5,fontSize:11,color:'#9ca3af',zIndex:1}}>
            <span>Designed with</span>
            <motion.span animate={{scale:[1,1.3,1]}} transition={{duration:1.5,repeat:Infinity}} style={{fontSize:13}}>❤️</motion.span>
            <span style={{fontWeight:600,color:'#6b7280'}}>By Insomniac for Frenzy</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default Signup;
