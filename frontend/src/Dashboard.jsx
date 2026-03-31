/**
 * BCABuddy Dashboard Component - Neural Glass Aesthetic
 * License: MIT
 * Author: Saurav Kumar
 * Description: AI learning interface with glassmorphism design and smooth animations
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, Typography, Drawer, List, ListItem, ListItemIcon, 
  ListItemText, IconButton, AppBar, Toolbar, Avatar, Divider,
  FormControl, InputLabel, Select, MenuItem, Paper,
  TextField, Chip, CircularProgress, Menu as MuiMenu, Card,
  Tooltip, Modal, Button, RadioGroup, FormControlLabel, Radio,
  Accordion, AccordionSummary, AccordionDetails, Snackbar, Alert,
  Checkbox, LinearProgress
} from '@mui/material';
import { 
  Menu, School, Quiz, ExitToApp, Send, SmartToy, 
  Person, AttachFile, Delete, Assignment, HistoryEdu, 
  Note, Mic, Science, Summarize, Add, Download, Settings,
  ExpandMore, Dashboard as DashboardIcon, BarChart, Bolt, Book,
  Info, Edit as EditIcon, Lock as LockIcon, LogoutRounded, MoreVert, Timer, Assessment, Stop, WorkspacePremium, VolumeUp
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CountUp from 'react-countup';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart as RechartsBarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import ExamSimulator from './ExamSimulator';
import QuizSection from './QuizSection';
import AdvancedTools from './pages/AdvancedTools';
import StudyRoadmapCard from './StudyRoadmapCard';
import { getToken, setToken, clearToken, isTokenExpiringSoon, shouldForceLogout, getTokenRemainingMinutes, shouldWarnTokenExpiry } from './utils/tokenManager';
import { useAuth } from './AuthContext';
import { API_BASE } from './utils/apiConfig';

const drawerWidth = 280;
const NEON_PURPLE = '#bb86fc';
const NEON_CYAN = '#03dac6';
const GLASS_BG = 'rgba(30, 41, 59, 0.5)';
const GLASS_BORDER = '1px solid rgba(255, 255, 255, 0.1)';

const STUDY_ACTIVITY_KEY = 'bcabuddy_study_activity_v1';
const DAILY_GOALS_KEY = 'bcabuddy_daily_goals_v1';
const EXAM_ATTEMPTS_KEY = 'bcabuddy_exam_attempts';
const QUIZ_ATTEMPTS_KEY = 'bcabuddy_quiz_attempts';
const REVIEW_STORAGE_KEY = 'bcabuddy_review_items';
const WEAK_TOPICS_KEY = 'bcabuddy_weak_topics';
const STUDY_ROADMAP_KEY = 'bcabuddy_study_roadmap_v1';
const APC_PERFORMANCE_SUMMARY_KEY = 'bcabuddy_apc_performance_summary_v1';

let mermaidModulePromise = null;
const loadMermaidModule = async () => {
  if (!mermaidModulePromise) {
    mermaidModulePromise = import('mermaid').then((mod) => mod.default || mod);
  }
  return mermaidModulePromise;
};

const safeJsonParse = (value, fallback) => {
  try {
    if (value === null || value === undefined) return fallback;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeToolKey = (value) => {
  const raw = String(value || '').trim().toLowerCase().replace(/_/g, ' ');
  const normalized = raw.replace(/\s+/g, ' ');
  if (['exam predictor', 'exam-predictor'].includes(normalized)) return 'exam predictor';
  if (['viva mentor', 'ai viva mentor', 'ai-viva-mentor'].includes(normalized)) return 'viva mentor';
  if (['study roadmap', 'study plan', 'roadmap'].includes(normalized)) return 'study roadmap';
  if (['cheat mode', 'cheat', 'pyq cheat'].includes(normalized)) return 'cheat mode';
  if (['performance analytics', 'performance analyzer', 'performance'].includes(normalized)) return 'performance analytics';
  if (['quiz master', 'ocr quiz', 'handwriting ocr to quiz'].includes(normalized)) return 'quiz master';
  return normalized;
};

const normalizeSemesterNumber = (value) => {
  const raw = String(value || '').trim();
  const match = raw.match(/[1-6]/);
  return match ? match[0] : '';
};

const semesterKeyFromNumber = (numberValue) => {
  const num = normalizeSemesterNumber(numberValue);
  return num ? `Sem ${num}` : '';
};

const parseRoadmapDays = (text) => {
  const lines = String(text || '').split('\n').map(line => String(line || '').trim()).filter(Boolean);
  const days = [];
  const seen = new Set();
  for (const line of lines) {
    const match = line.match(/^[-*•\s]*day\s*(\d{1,2})\s*[:\-\)]\s*(.+)$/i);
    if (!match) continue;
    const day = Number(match[1]);
    if (!Number.isFinite(day) || day < 1 || day > 15 || seen.has(day)) continue;
    const task = String(match[2] || '').trim();
    if (!task) continue;
    seen.add(day);
    days.push({ day, label: `Day ${day}`, task, completed: false });
  }
  return days.sort((a, b) => a.day - b.day).slice(0, 15);
};

const parsePredictedQuestions = (text) => {
  const lines = String(text || '').split('\n').map((line) => String(line || '').trim()).filter(Boolean);
  const items = [];
  for (const line of lines) {
    const match = line.match(/^\s*(\d{1,2})[\).:-]\s+(.+)$/);
    if (!match) continue;
    const num = Number(match[1]);
    const question = String(match[2] || '').trim();
    if (!Number.isFinite(num) || !question) continue;
    items.push({ number: num, question });
  }
  return items.slice(0, 20);
};

const isoDay = (d) => {
  try {
    return new Date(d).toISOString().slice(0, 10);
    return new Date().toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

const getLastNDays = (n) => {
  const days = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    days.push(isoDay(d));
  }
  return days;
};

// Phase 1: legacy Quick Quiz is disabled (kept in codebase per "no deletions" rule)
const ENABLE_LEGACY_QUICK_QUIZ = false;

const QUICK_SUGGESTIONS = [
  "Explain Java Inheritance with code",
  "What is OSI Model in Networking?",
  "Calculate Mean and Mode formula",
  "Important Questions for MCS-024",
  "Draw a diagram of TCP/IP"
];

const SUBJECT_LABELS = {
  "BCS-011": "Computer Basics",
  "BCS-012": "Basic Mathematics",
  "MCS-012": "Computer Organization",
  "BCS-040": "Statistical Techniques",
  "MCS-024": "Java",
  "BCS-041": "Computer Networks",
  "BCS-042": "Algorithm Design"
};

const SEM4_HARD_TOPICS = {
  "MCS-024": ["Exception Handling", "Multithreading", "JVM Architecture"],
  "BCS-040": ["Probability Distributions", "Hypothesis Testing"],
  "BCS-041": ["Subnetting", "OSI vs TCP/IP", "Routing Algorithms"]
};

const DEFAULT_SUBJECT_CHIPS = [
  "Explain basics",
  "Important exam topics",
  "Go to Unit 1",
  "Practice MCQ"
];

const ASSIGNMENT_TOOLS = [
  { label: "Assignments", icon: Assignment, prompt: "Generate an assignment question paper for" },
  { label: "PYQs", icon: HistoryEdu, prompt: "List important Previous Year Questions (PYQs) for" },
  { label: "Notes", icon: Note, prompt: "Create concise revision notes for" },
  { label: "Viva", icon: Mic, prompt: "Ask me Viva/Interview questions for" },
  { label: "Lab Work", icon: Science, prompt: "Explain practical Lab experiments for" },
  { label: "Summary", icon: Summarize, prompt: "Give a quick summary of" },
];

const IGNOU_SYLLABUS = {
  "Sem 1": {
    "BCS-011": ["Computer Basics", "Memory", "I/O Devices", "Software"],
    "BCS-012": ["Determinants", "Matrices", "Differentiation", "Integration"],
    "FEG-02": ["Writing", "Grammar", "Listening"],
    "ECO-01": ["Business", "Management", "Marketing"]
  },
  "Sem 2": {
    "MCS-011": ["Problem Solving", "Loops", "Arrays", "Pointers"],
    "MCS-012": ["8086 Micro", "Instructions", "Memory Org"],
    "MCS-015": ["HTML/CSS", "JavaScript", "Forms"],
    "ECO-02": ["Final Accounts", "Consignment"]
  },
  "Sem 3": {
    "MCS-021": ["Linked Lists", "Stacks/Queues", "Trees", "Sorting"],
    "MCS-023": ["ER Diagrams", "SQL", "Normalization"],
    "BCS-031": ["OOPs", "Classes", "Inheritance", "Polymorphism"],
    "MCS-014": ["SDLC", "DFD", "Testing"]
  },
  "Sem 4": {
    "BCS-040": ["Mean/Mode", "Probability", "Distributions"],
    "MCS-024": ["Java OOPs", "Inheritance", "Threads", "Applets"],
    "BCS-041": ["OSI Model", "TCP/IP", "IP Addressing"],
    "BCS-042": ["Sets", "Relations", "Graphs"]
  },
  "Sem 5": {
    "BCS-051": ["SRS", "Project Mgmt", "UML", "Risk"],
    "BCS-052": ["Sockets", "TCP Client/Server", "UDP"],
    "BCS-053": ["XML", "PHP", "ASP.NET"],
    "BCS-054": ["Numerical Methods", "Interpolation"]
  },
  "Sem 6": {
    "BCS-062": ["E-Commerce Models", "Security", "Payments"],
    "MCS-022": ["Process Mgmt", "Deadlocks", "Memory Mgmt"],
    "BCS-092": ["AI Agents", "Logic", "ML Basics"]
  }
};

// Typing indicator component
const TypingIndicator = () => (
  <Box sx={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
    {[0, 1, 2].map(i => (
      <motion.div
        key={i}
        animate={{ y: [0, -8, 0], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }}
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${NEON_CYAN}, ${NEON_PURPLE})`,
          boxShadow: `0 0 10px ${NEON_CYAN}`,
        }}
      />
    ))}
  </Box>
);

// Helper function to detect and render Recharts data
const ChartRenderer = ({ dataString }) => {
  try {
    const data = JSON.parse(dataString);
    if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0];
      const keys = Object.keys(firstItem);
      
      if (keys.length === 2) {
        // Simple bar/line chart
        return (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
            <Box sx={{ my: 2, bgcolor: GLASS_BG, border: GLASS_BORDER, p: 2, borderRadius: '16px', overflow: 'auto', backdropFilter: 'blur(12px)' }}>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke={`${NEON_CYAN}20`} />
                  <XAxis dataKey={keys[0]} stroke={NEON_CYAN} />
                  <YAxis stroke={NEON_CYAN} />
                  <RechartsTooltip contentStyle={{ bgcolor: GLASS_BG, border: `1px solid ${NEON_CYAN}` }} />
                  <Bar dataKey={keys[1]} fill={NEON_PURPLE} radius={8} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </Box>
          </motion.div>
        );
      }
    }
  } catch (e) {
    // Not JSON data, render normally
  }
  return null;
};

// ─────────────────────────────────────────────────────────────────
// SafeMermaidViewer — mermaid v10.x compatible
//
// v10 breaking changes vs v9:
//   • mermaid.render(id, code) creates a hidden <div id="..."> in body
//     temporarily — if that ID already exists, it throws immediately.
//   • startOnLoad:true + manual render() = double-processing = crash.
//   • re-initializing mermaid mid-session resets internal state badly.
//
// This component handles all of that cleanly.
// ─────────────────────────────────────────────────────────────────

const SafeMermaidViewer = ({ chartCode }) => {
  const containerRef = useRef(null);
  const [renderState, setRenderState] = useState('loading');
  const [errorMsg, setErrorMsg]       = useState('');
  const [copied, setCopied]           = useState(false);

  useEffect(() => {
    if (!chartCode || !containerRef.current) return;

    setRenderState('loading');
    setErrorMsg('');

    // ── Comprehensive auto-fix for AI-generated mermaid syntax errors ────────

    // 1. Remove stray backtick fences that leaked from markdown
    let clean = chartCode
      .trim()
      .replace(/^```[a-zA-Z]*\n?/, '')
      .replace(/\n?```$/, '')
      .trim();

    // 2. Windows line endings
    clean = clean.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // 3. Fix arrow labels — process each line individually for precision
    clean = clean.split('\n').map(line => {
      // Only touch lines that have arrows with labels  -->|...|
      if (!line.includes('-->|') && !line.includes('->|')) return line;

      // 3a. Fix single-dash arrow: ->| → -->|
      line = line.replace(/(?<!-)->\|/g, '-->|');

      // 3b. Fix -->|label|> node  →  -->|label| node
      //     Catches: |> followed by space, newline, letter, or end of string
      line = line.replace(/\|>/g, '|');

      // 3c. Remove parentheses INSIDE pipe labels -->|...(...)...|
      //     Parentheses inside labels are parsed as circle-node syntax → crash
      //     Strategy: find each -->|...|  and strip ( ) inside the label only
      line = line.replace(/-->\|([^|]*)\|/g, (match, label) => {
        const cleanLabel = label.replace(/[()]/g, '');  // strip ( and )
        return `-->|${cleanLabel}|`;
      });

      return line;
    }).join('\n');

    // 4. Fix node labels: strip characters mermaid can't handle inside [ ] { } ( )
    //    e.g. A[TCP (Layer 4)] is fine, but special chars like < > can break it
    //    We only strip inside the bracket content, not the brackets themselves
    clean = clean.replace(/\[([^\]]*)\]/g, (match, inner) => {
      // Allow letters, numbers, spaces, hyphens, slashes, colons, commas, dots
      const safe = inner.replace(/[<>]/g, '');
      return `[${safe}]`;
    });

    // ──────────────────────────────────────────────────────────────────────

    // Unique ID per render attempt — prevents "element already exists" in v10
    const uid = `mmd${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
    let cancelled = false;

    const runRender = async () => {
      try {
        const mermaid = await loadMermaidModule();
        if (cancelled) return;

        const { svg } = await mermaid.render(uid, clean);
        const ghost = document.getElementById(uid);
        if (ghost) ghost.remove();

        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          const svgEl = containerRef.current.querySelector('svg');
          if (svgEl) {
            svgEl.style.maxWidth = '100%';
            svgEl.style.height = 'auto';
            svgEl.removeAttribute('height');
          }
          setRenderState('done');
        }
      } catch (err) {
        const ghost = document.getElementById(uid);
        if (ghost) ghost.remove();
        if (!cancelled) {
          const msg = err?.message || err?.str || String(err) || 'Unknown render error';
          setErrorMsg(msg);
          setRenderState('error');
        }
      }
    };

    runRender();

    return () => {
      cancelled = true;
      const ghost = document.getElementById(uid);
      if (ghost) ghost.remove();
    };
  }, [chartCode]);

  const handleCopyCode = () => {
    const clean = chartCode.trim().replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
    navigator.clipboard.writeText(clean).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };

  return (
    <div
      style={{
        width: '100%',
        backgroundColor: '#0d1117',
        padding: '16px',
        borderRadius: '12px',
        overflowX: 'auto',
        marginTop: '12px',
        border: '1px solid rgba(3, 218, 198, 0.25)',
      }}
    >
      {/* Loading */}
      {renderState === 'loading' && (
        <div style={{ color: '#03dac6', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
          Building diagram... 🏗️
        </div>
      )}

      {/* SVG lands here on success */}
      <div ref={containerRef} style={{ width: '100%' }} />

      {/* Error: show message + raw code so user isn't stuck */}
      {renderState === 'error' && (
        <div style={{ marginTop: '8px' }}>
          <div style={{
            color: '#ff6b6b', fontSize: '12px', padding: '8px 12px',
            background: 'rgba(255,107,107,0.08)', borderRadius: '8px',
            border: '1px solid rgba(255,107,107,0.25)', marginBottom: '10px'
          }}>
            ⚠️ Diagram render failed.
            {errorMsg && <><br /><span style={{ opacity: 0.6, fontSize: '11px' }}>{errorMsg}</span></>}
          </div>
          <div style={{ position: 'relative' }}>
            <pre style={{
              background: '#161b22', color: '#c9d1d9', fontSize: '12px',
              borderRadius: '8px', padding: '10px 42px 10px 12px',
              overflowX: 'auto', border: '1px solid #30363d',
              margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word'
            }}>
              {chartCode.trim().replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim()}
            </pre>
            <button onClick={handleCopyCode} style={{
              position: 'absolute', top: 7, right: 7,
              background: '#03dac6', color: '#111', border: 'none',
              borderRadius: 5, padding: '2px 9px', fontWeight: 700,
              cursor: 'pointer', fontSize: 11
            }}>{copied ? 'Copied!' : 'Copy'}</button>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', marginTop: '6px' }}>
            💡 Paste at{' '}
            <a href="https://mermaid.live" target="_blank" rel="noopener noreferrer"
               style={{ color: '#03dac6' }}>mermaid.live</a>{' '}
            to debug the syntax.
          </div>
        </div>
      )}
    </div>
  );
};

// 2. Tumhara Original Enhanced Markdown Renderer (Safe version ke sath)
const enhancedCodeComponents = ({ inline, className, children, ...props }) => {
  const match = /language-(\w+)/.exec(className || '');
  const codeString = String(children).replace(/\n$/, '');
  
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  if (match && match[1] === 'mermaid') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <Box sx={{ my: 2, bgcolor: GLASS_BG, border: GLASS_BORDER, p: 2, borderRadius: '16px', overflow: 'auto', backdropFilter: 'blur(12px)', position: 'relative' }}>
          <SafeMermaidViewer chartCode={codeString} />
          <button
            onClick={handleCopy}
            style={{ position: 'absolute', top: 12, right: 16, background: NEON_CYAN, color: '#222', border: 'none', borderRadius: 6, padding: '4px 10px', fontWeight: 600, cursor: 'pointer', fontSize: 13, zIndex: 2 }}
            title="Copy diagram code"
          >{copied ? 'Copied!' : 'Copy'}</button>
        </Box>
      </motion.div>
    );
  }
  
  if (!inline && match) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <Box sx={{ borderRadius: '12px', overflow: 'hidden', my: 2, position: 'relative' }}>
          <SyntaxHighlighter children={codeString} style={dracula} language={match[1]} PreTag="div" wrapLongLines />
          <button
            onClick={handleCopy}
            style={{ position: 'absolute', top: 12, right: 16, background: NEON_CYAN, color: '#222', border: 'none', borderRadius: 6, padding: '4px 10px', fontWeight: 600, cursor: 'pointer', fontSize: 13, zIndex: 2 }}
            title="Copy code"
          >{copied ? 'Copied!' : 'Copy'}</button>
        </Box>
      </motion.div>
    );
  }
  
  return <code style={{ color: NEON_CYAN, fontSize: '14px' }} {...props}>{children}</code>;
};

// Markdown component customizations with chart support
const markdownComponents = {
  code: enhancedCodeComponents,
  p: ({ children }) => {
    // Check if paragraph contains JSON-like chart data
    const childStr = String(children);
    if (childStr.startsWith('[{') && childStr.endsWith('}]')) {
      const chart = <ChartRenderer dataString={childStr} />;
      if (chart) return chart;
    }
    return <p style={{ color: '#FFFFFF', margin: 0 }}>{children}</p>;
  },
  strong: ({ children }) => <strong style={{ color: '#FFFFFF', fontWeight: 600 }}>{children}</strong>,
  em: ({ children }) => <em style={{ color: '#FFFFFF', fontStyle: 'italic' }}>{children}</em>,
  h1: ({ children }) => <h1 style={{ color: '#FFFFFF', marginBottom: '8px', marginTop: '12px', fontSize: '24px', fontWeight: 700 }}>{children}</h1>,
  h2: ({ children }) => <h2 style={{ color: '#FFFFFF', marginBottom: '8px', marginTop: '10px', fontSize: '20px', fontWeight: 600 }}>{children}</h2>,
  h3: ({ children }) => <h3 style={{ color: '#FFFFFF', marginBottom: '6px', marginTop: '8px', fontSize: '16px', fontWeight: 600 }}>{children}</h3>,
  li: ({ children }) => <li style={{ color: '#FFFFFF', marginBottom: '4px' }}>{children}</li>,
  blockquote: ({ children }) => <blockquote style={{ color: '#FFFFFF', borderLeft: `3px solid ${NEON_CYAN}`, paddingLeft: '12px', marginLeft: 0, marginTop: '8px', marginBottom: '8px', fontStyle: 'italic' }}>{children}</blockquote>,
  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: NEON_CYAN, textDecoration: 'underline', cursor: 'pointer' }}>{children}</a>,
  ul: ({ children }) => <ul style={{ color: '#FFFFFF', marginLeft: '20px', marginTop: '8px' }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ color: '#FFFFFF', marginLeft: '20px', marginTop: '8px' }}>{children}</ol>,
  table: ({ children }) => <table style={{ color: '#FFFFFF', borderCollapse: 'collapse', marginTop: '8px', marginBottom: '8px', width: '100%' }}>{children}</table>,
  td: ({ children }) => <td style={{ border: `1px solid ${NEON_CYAN}20`, padding: '8px', textAlign: 'left' }}>{children}</td>,
  th: ({ children }) => <th style={{ border: `1px solid ${NEON_CYAN}40`, padding: '8px', textAlign: 'left', backgroundColor: `${NEON_PURPLE}20`, fontWeight: 600 }}>{children}</th>,
};

// ROCK-SOLID TYPEWRITER - WILL NEVER ERASE TEXT
const TypewriterText = ({ text, speed = 25, onProgress, onComplete, isInterrupted }) => {
  const [displayedText, setDisplayedText] = useState('');
  const indexRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    // Agar stop button press hua, turant type karna band karo
    if (isInterrupted) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // Sirf aage ka text type karo, pichla erase mat karo
    const typeNext = () => {
      if (isInterrupted) return;
      
      if (indexRef.current < text.length) {
        setDisplayedText(text.substring(0, indexRef.current + 1));
        indexRef.current += 1;
        
        if (onProgress) onProgress();
        
        const jitter = Math.random() * 0.8 + 0.6;
        timerRef.current = setTimeout(typeNext, speed * jitter);
      } else {
        if (onComplete) onComplete();
      }
    };

    if (indexRef.current < text.length) {
      timerRef.current = setTimeout(typeNext, speed);
    } else if (indexRef.current >= text.length && text.length > 0) {
      if (onComplete) onComplete();
    }

    return () => clearTimeout(timerRef.current);
  }, [text, speed, isInterrupted, onProgress, onComplete]);

  return (
    <ReactMarkdown children={displayedText} remarkPlugins={[remarkGfm]} components={markdownComponents} />
  );
};

const getJiyaRemarkText = (score, candidateName) => {
  const pct = Number.isFinite(Number(score)) ? Number(score) : null;
  const name = String(candidateName || 'champ').trim() || 'champ';
  const isSaurav = name.toLowerCase().includes('saurav');
  if (pct === null) return `Jiya: ${name}, aaj ka mission simple hai — ek quiz, ek revision, aur ek win.`;
  if (pct >= 90) return `Jiya: ${name}, Supreme performance. Ab bas consistency — daily 30 min, aur tu unstoppable.`;
  if (pct >= 75) return `Jiya: ${name}, solid score. Ab weak topics pe 20 min focused practice — next attempt me 90+ pakka.`;
  if (pct >= 55) return `Jiya: ${name}, good effort. Ab notes revise + 10 MCQs daily. धीरे-धीरे graph upar jayega.`;
  if (isSaurav) return `Jiya: Saurav, focus! Standards slip mat hone dena. Unit 1 + 10 MCQs, abhi.`;
  return `Jiya: ${name}, tension nahi. Start small — Unit 1 + basics. Next attempt me comeback guaranteed.`;
};

const JiyaRemark = ({ score, candidateName }) => {
  const remark = getJiyaRemarkText(score, candidateName);
  return (
    <Box sx={{ mt: 1.2, p: 1.5, borderRadius: '14px', bgcolor: 'rgba(3, 218, 198, 0.06)', border: `1px solid ${NEON_CYAN}25` }}>
      <Typography sx={{ color: NEON_CYAN, fontWeight: 800, fontSize: '12px', letterSpacing: '0.12em' }}>
        JIYA REMARK
      </Typography>
      <Box sx={{ color: '#E6EAF0', mt: 0.8, fontSize: '13px', lineHeight: 1.55 }}>
        <TypewriterText key={String(score ?? 'na')} text={remark} speed={16} />
      </Box>
    </Box>
  );
};

const Dashboard = ({ onThemeOverride }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeView, setActiveView] = useState('chat');
  const [semester, setSemester] = useState('');
  const [subject, setSubject] = useState('');
  const [mode, setMode] = useState('auto');
  const [messages, setMessages] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [input, setInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [chatSuggestions, setChatSuggestions] = useState(QUICK_SUGGESTIONS);
  const [hideSuggestions, setHideSuggestions] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [recentChats, setRecentChats] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [speakingId, setSpeakingId] = useState(null);
  const [dashboardStats, setDashboardStats] = useState({ total_sessions: 0, last_subject: 'N/A', study_hours: 0, avg_quiz_score: 85 });
  const [syllabusProgress, setSyllabusProgress] = useState({ subject: null, total_topics: 0, covered_topics: [], covered_count: 0, completion_pct: 0 });
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [adminMenuAnchor, setAdminMenuAnchor] = useState(null);
  const [chatMenuAnchor, setChatMenuAnchor] = useState(null);
  const [chatMenuSessionId, setChatMenuSessionId] = useState(null);
  const [userProfile, setUserProfile] = useState({ username: 'User', display_name: 'User' });
  const { profilePic, updateProfilePic } = useAuth();
  const [activeTool, setActiveTool] = useState(null);
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [scanningImage, setScanningImage] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [toolLoadingState, setToolLoadingState] = useState(null); // Track which tool is "loading"
  const [showExamSimulator, setShowExamSimulator] = useState(false); // Phase 4: Exam Simulator
  const [showQuizSection, setShowQuizSection] = useState(false); // PHASE 3: Quiz Section
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);
  const [tokenWarning, setTokenWarning] = useState(null); // Token expiry warning
  const [showTokenWarning, setShowTokenWarning] = useState(false); // Show warning snackbar
  const [studyRoadmap, setStudyRoadmap] = useState({ has_roadmap: false, days: [], completion_pct: 0 });
  const [apcSubjectInput, setApcSubjectInput] = useState('');
  const [apcSemesterInput, setApcSemesterInput] = useState('');
  const [apcDurationInput, setApcDurationInput] = useState('15');
  const [vivaSubjectInput, setVivaSubjectInput] = useState('');
  const [quizRemarks, setQuizRemarks] = useState('');
  const [showExamAskInput, setShowExamAskInput] = useState(false);
  const [showRoadmapAskInput, setShowRoadmapAskInput] = useState(false);
  const [examPredictions, setExamPredictions] = useState([]);
  const [roadmapDraftText, setRoadmapDraftText] = useState('');
  const [roadmapHistory, setRoadmapHistory] = useState({});
  const [isRoadmapHistoryLoading, setIsRoadmapHistoryLoading] = useState(false);
  const [performanceSummary, setPerformanceSummary] = useState({ highlights: [], report_markdown: '', generated_at: null, eta_minutes: 1 });
  const [showPerformanceReportModal, setShowPerformanceReportModal] = useState(false);
  const [isGeneratingPerformanceReport, setIsGeneratingPerformanceReport] = useState(false);
  const [performanceWaitMinutes, setPerformanceWaitMinutes] = useState(1);
  const [dashboardSlideIndex, setDashboardSlideIndex] = useState(0);

  const [dailyGoals, setDailyGoals] = useState(() => {
    const saved = safeJsonParse(localStorage.getItem(DAILY_GOALS_KEY), null);
    if (Array.isArray(saved) && saved.length > 0) return saved;
    return [
      { id: 'g1', text: 'Revise 1 topic', done: false },
      { id: 'g2', text: 'Solve 10 MCQs', done: false },
      { id: 'g3', text: '1 exam/quiz attempt', done: false },
    ];
  });
  const [newGoalText, setNewGoalText] = useState('');
  const chatStudyStartRef = useRef(null);
  const [sessionElapsedMinutes, setSessionElapsedMinutes] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewVersion, setReviewVersion] = useState(0);
  const [studyActivityVersion, setStudyActivityVersion] = useState(0);
  
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const lastGreetedSubjectRef = useRef(null);
  const sessionsRetryRef = useRef(0);
  const tokenCheckIntervalRef = useRef(null); // Token validation interval
  const isHistoryLoadingRef = useRef(false); // Skip background polling during manual history load
  const abortControllerRef = useRef(null); // Stop Response
  const messageIdRef = useRef(0);
  const streamBufferRef = useRef({});
  const activeAiMessageIdRef = useRef(null);
  const navigate = useNavigate();

  const makeMessageId = () => `${Date.now()}-${messageIdRef.current++}`;

  const upsertMessage = (list, msg) => {
    const idx = list.findIndex(m => m.id === msg.id);
    if (idx >= 0) {
      const next = [...list];
      next[idx] = { ...next[idx], ...msg };
      return next;
    }
    return [...list, msg];
  };

  const resetQuickQuizState = () => {
    setQuizQuestions([]);
    setCurrentQuestionIndex(0);
    setQuizScore(0);
    setQuizCompleted(false);
    setSelectedAnswer('');
    setLoadingQuiz(false);
  };

  const readStudyActivity = () => {
    const raw = safeJsonParse(localStorage.getItem(STUDY_ACTIVITY_KEY), {});
    return raw && typeof raw === 'object' ? raw : {};
  };

  const readReviewItems = () => {
    const raw = safeJsonParse(localStorage.getItem(REVIEW_STORAGE_KEY), []);
    return Array.isArray(raw) ? raw : [];
  };

  const readWeakTopics = () => {
    const raw = safeJsonParse(localStorage.getItem(WEAK_TOPICS_KEY), []);
    return Array.isArray(raw) ? raw : [];
  };

  const writeStudyActivity = (next) => {
    try {
      localStorage.setItem(STUDY_ACTIVITY_KEY, JSON.stringify(next));
      setStudyActivityVersion(v => v + 1);
    } catch {
      // ignore quota errors
    }
  };

  const addStudyMinutesForToday = (minutesDelta) => {
    const minutes = Number(minutesDelta);
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    const day = isoDay(new Date());
    const activity = readStudyActivity();
    const prev = Number(activity[day] || 0);
    activity[day] = Math.round((prev + minutes) * 10) / 10;
    writeStudyActivity(activity);
  };

  const clearWeeklyActivity = () => {
    try {
      localStorage.removeItem(STUDY_ACTIVITY_KEY);
    } catch {
      // ignore
    }
    // Reset the running timer so the next visible tick starts fresh
    chatStudyStartRef.current = null;
    setStudyActivityVersion(v => v + 1);
  };

  useEffect(() => {
    try {
      localStorage.setItem(DAILY_GOALS_KEY, JSON.stringify(dailyGoals));
    } catch {
      // ignore
    }
  }, [dailyGoals]);

  useEffect(() => {
    const shouldTrackChat = activeView === 'chat' && !showExamSimulator && !showQuizSection && !showAdvancedTools;

    const stopIfRunning = () => {
      if (!chatStudyStartRef.current) return;
      const deltaMs = Date.now() - chatStudyStartRef.current;
      chatStudyStartRef.current = null;
      const deltaMin = deltaMs / 60000;
      addStudyMinutesForToday(deltaMin);
    };

    const startIfNeeded = () => {
      if (!shouldTrackChat) return;
      if (document.visibilityState !== 'visible') return;
      if (chatStudyStartRef.current) return;
      chatStudyStartRef.current = Date.now();
    };

    if (shouldTrackChat) startIfNeeded();
    else stopIfRunning();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') startIfNeeded();
      else stopIfRunning();
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stopIfRunning();
    };
  }, [activeView, showExamSimulator, showQuizSection, showAdvancedTools]);

  useEffect(() => {
    const ensureSessionStart = () => {
      const raw = localStorage.getItem('session_start');
      if (!raw) {
        localStorage.setItem('session_start', Date.now().toString());
      }
    };

    ensureSessionStart();
    const tick = () => {
      const raw = localStorage.getItem('session_start');
      const start = Number(raw || 0);
      if (!Number.isFinite(start) || start <= 0) return;
      const mins = Math.max(0, Math.round((Date.now() - start) / 60000));
      setSessionElapsedMinutes(mins);
    };

    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onStorage = (evt) => {
      if ([REVIEW_STORAGE_KEY, WEAK_TOPICS_KEY].includes(String(evt.key))) {
        setReviewVersion(v => v + 1);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => () => {
    setIsGenerating(false);
  }, []);

  const handleStopResponse = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort(); // Kills network request
      abortControllerRef.current = null;
    }
    
    setIsAiThinking(false);
    setIsGenerating(false); // Stop button ko turant Play button banayega

    // Jo message abhi type ho raha tha, usko force stop karke UI update karo
    setMessages(prev => prev.map(m => {
      if (m.sender === 'ai' && !m.isTypingComplete) {
        return { ...m, isTypingComplete: true, isInterrupted: true };
      }
      return m;
    }).filter(m => !m.isTemporary));
  };

  const closeQuickQuiz = () => {
    const isInProgress = !quizCompleted && quizQuestions.length > 0;
    if (isInProgress) {
      const ok = window.confirm('Quiz in progress. Exit and lose current progress?');
      if (!ok) return;
    }
    setQuizModalOpen(false);
    resetQuickQuizState();
  };

  const getHeaders = () => ({ 
    'Authorization': `Bearer ${getToken()}`,
    'Content-Type': 'application/json' 
  });

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  const markTypingComplete = (id) => {
    setMessages(prev => prev.map(m => (m.id === id ? { ...m, isTypingComplete: true } : m)));
    setTimeout(() => scrollToBottom(), 0);
    // v10 FIX: When typing completes, ReactMarkdown renders the full text and
    // SafeMermaidViewer mounts. The component's own useEffect calls mermaid.render()
    // automatically — no manual trigger needed here.
  };

  const sanitizeForSpeech = (text) => {
    if (!text) return '';
    return String(text)
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`]*`/g, ' ')
      .replace(/[>#*_]/g, ' ')
      .replace(/[\u{1F300}-\u{1FAFF}]/gu, ' ... ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const getPreferredFemaleVoice = () => {
    const voices = window.speechSynthesis.getVoices() || [];
    const findByName = (name) => voices.find(v => v.name.toLowerCase().includes(name.toLowerCase()));
    const googleHindi = findByName('Google Hindi');
    if (googleHindi) return googleHindi;
    const kalpana = findByName('Kalpana');
    if (kalpana) return kalpana;

    return voices.find(v => {
      const name = v.name.toLowerCase();
      const lang = (v.lang || '').toLowerCase();
      const isFemale = name.includes('female') || name.includes('woman') || name.includes('zira') || name.includes('susan');
      const isHindiOrUk = lang.includes('hi') || lang.includes('en-gb') || name.includes('hindi') || name.includes('uk');
      return isFemale && isHindiOrUk;
    }) || voices[0];
  };

  const handleSpeak = (text, id) => {
    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(sanitizeForSpeech(text));
      const voice = getPreferredFemaleVoice();
      if (voice) utterance.voice = voice;
      utterance.rate = 1.0;
      utterance.pitch = 1.2;
      utterance.onend = () => setSpeakingId(null);
      utterance.onerror = () => setSpeakingId(null);
      window.speechSynthesis.speak(utterance);
      setSpeakingId(id);
    }
  };

  const loadSessions = async () => {
    try {
      const res = await fetch(`${API_BASE}/sessions`, { headers: getHeaders() });
      if (!res.ok) {
        console.error('Failed to load sessions:', res.status);
        // Supreme rule: do not wipe UI on refresh/errors; retry once.
        if (sessionsRetryRef.current < 1) {
          sessionsRetryRef.current += 1;
          setTimeout(loadSessions, 800);
        }
        return;
      }
      const data = await res.json();
      console.log('Sessions loaded:', data);
      sessionsRetryRef.current = 0;
      const safeSessions = Array.isArray(data) ? data : [];
      setSessions(safeSessions);
      setRecentChats(safeSessions.map(s => ({ id: s.id, title: s.title })));
    } catch (e) {
      console.error('Failed to load sessions:', e);
      // Supreme rule: do not wipe UI on refresh/errors; retry once.
      if (sessionsRetryRef.current < 1) {
        sessionsRetryRef.current += 1;
        setTimeout(loadSessions, 800);
      }
    }
  };

  const loadDashboardStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/dashboard-stats`, { headers: getHeaders() });
      if (!res.ok) {
        console.error('Failed to load dashboard stats: Unauthorized');
        return;
      }
      const data = await res.json();
      setDashboardStats(data);
    } catch (e) {
      console.error('Failed to load dashboard stats');
    }
  };

  const loadSyllabusProgress = async (subjectCode) => {
    try {
      const sub = String(subjectCode || '').trim();
      const url = sub
        ? `${API_BASE}/syllabus-progress?subject=${encodeURIComponent(sub)}`
        : `${API_BASE}/syllabus-progress`;

      const res = await fetch(url, { headers: getHeaders() });
      if (!res.ok) {
        console.error('Failed to load syllabus progress');
        return;
      }
      const data = await res.json();

      setSyllabusProgress({
        subject: data?.subject ?? null,
        total_topics: Number(data?.total_topics || 0),
        covered_topics: Array.isArray(data?.covered_topics) ? data.covered_topics : [],
        covered_count: Number(data?.covered_count || 0),
        completion_pct: Number(data?.completion_pct || 0),
      });
    } catch (e) {
      console.error('Failed to load syllabus progress:', e);
    }
  };

  const loadStudyRoadmap = async () => {
    const localFallback = () => {
      const localData = safeJsonParse(localStorage.getItem(STUDY_ROADMAP_KEY), null);
      if (localData && typeof localData === 'object' && localData.has_roadmap) {
        setStudyRoadmap({
          has_roadmap: true,
          title: String(localData.title || 'My Study Roadmap'),
          subject: localData.subject || null,
          semester: localData.semester || null,
          duration_days: Number(localData.duration_days || localData.total_days || 0),
          days: Array.isArray(localData.days) ? localData.days : [],
          total_days: Number(localData.total_days || 0),
          completion_pct: Number(localData.completion_pct || 0),
          created_at: localData.created_at || null,
        });
      }
    };

    try {
      const res = await fetch(`${API_BASE}/study-roadmap/latest`, { headers: getHeaders() });
      if (!res.ok) {
        localFallback();
        return;
      }
      const data = await res.json();
      if (!data?.has_roadmap) {
        localFallback();
        return;
      }
      const mapped = {
        has_roadmap: Boolean(data?.has_roadmap),
        title: data?.title || 'My Study Roadmap',
        subject: data?.subject || null,
        semester: data?.semester || null,
        duration_days: Number(data?.duration_days || data?.total_days || 0),
        days: Array.isArray(data?.days) ? data.days : [],
        total_days: Number(data?.total_days || 0),
        completion_pct: Number(data?.completion_pct || 0),
        created_at: data?.created_at || null,
      };
      setStudyRoadmap(mapped);
      try {
        localStorage.setItem(STUDY_ROADMAP_KEY, JSON.stringify(mapped));
      } catch {
        // ignore quota/storage errors
      }
    } catch (e) {
      console.error('Failed to load study roadmap:', e);
      localFallback();
    }
  };

  const loadRoadmapHistory = async () => {
    setIsRoadmapHistoryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/study-roadmap/history`, { headers: getHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const groups = data && typeof data === 'object' && data.groups && typeof data.groups === 'object'
        ? data.groups
        : {};
      setRoadmapHistory(groups);
    } catch (e) {
      console.error('Failed to load roadmap history:', e);
      setRoadmapHistory({});
    } finally {
      setIsRoadmapHistoryLoading(false);
    }
  };

  const acceptCurrentRoadmap = async () => {
    if (!roadmapDraftText.trim()) {
      alert('Please generate a roadmap first.');
      return;
    }
    const semNum = normalizeSemesterNumber(apcSemesterInput || semester);
    const subjCode = String(apcSubjectInput || subject || '').trim();
    const durationDays = Number(apcDurationInput || 15);
    try {
      const res = await fetch(`${API_BASE}/study-roadmap/accept`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          subject: subjCode,
          semester: semNum ? `Sem ${semNum}` : '',
          duration_days: durationDays,
          roadmap_text: roadmapDraftText,
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `HTTP ${res.status}`);
      }
      await loadStudyRoadmap();
      await loadRoadmapHistory();
      setMessages(prev => [...prev, { id: makeMessageId(), text: 'Roadmap accepted and synced to Dashboard ✅', sender: 'ai', isTypingComplete: true }]);
    } catch (e) {
      console.error('Failed to accept roadmap:', e);
      setMessages(prev => [...prev, { id: makeMessageId(), text: `Roadmap sync failed: ${e.message}`, sender: 'ai', isTypingComplete: true }]);
    }
  };

  const loadPerformanceSummary = async () => {
    const localFallback = () => {
      const localData = safeJsonParse(localStorage.getItem(APC_PERFORMANCE_SUMMARY_KEY), null);
      if (localData && typeof localData === 'object') {
        setPerformanceSummary({
          highlights: Array.isArray(localData.highlights) ? localData.highlights : [],
          report_markdown: String(localData.report_markdown || ''),
          generated_at: localData.generated_at || null,
          eta_minutes: Number(localData.eta_minutes || 1),
        });
      }
    };

    try {
      const res = await fetch(`${API_BASE}/apc/performance-summary/latest`, { headers: getHeaders() });
      if (!res.ok) {
        localFallback();
        return;
      }
      const data = await res.json();
      const mapped = {
        highlights: Array.isArray(data?.highlights) ? data.highlights : [],
        report_markdown: String(data?.report_markdown || ''),
        generated_at: data?.generated_at || null,
        eta_minutes: Number(data?.eta_minutes || 1),
      };
      setPerformanceSummary(mapped);
      try {
        localStorage.setItem(APC_PERFORMANCE_SUMMARY_KEY, JSON.stringify(mapped));
      } catch {
        // ignore storage issues
      }
    } catch (e) {
      console.error('Failed to load performance summary:', e);
      localFallback();
    }
  };

  const runPerformanceAnalyzerReport = async () => {
    setIsGeneratingPerformanceReport(true);
    setShowPerformanceReportModal(false);
    const estimated = Math.max(1, Math.min(2, Math.ceil((messages.length || 20) / 120)));
    setPerformanceWaitMinutes(estimated);

    try {
      const res = await fetch(`${API_BASE}/apc/performance-report`, { method: 'POST', headers: getHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const mapped = {
        highlights: Array.isArray(data?.highlights) ? data.highlights : [],
        report_markdown: String(data?.report_markdown || ''),
        generated_at: data?.generated_at || null,
        eta_minutes: Number(data?.eta_minutes || estimated),
      };
      setPerformanceSummary(mapped);
      try {
        localStorage.setItem(APC_PERFORMANCE_SUMMARY_KEY, JSON.stringify(mapped));
      } catch {
        // ignore storage issues
      }
    } catch (e) {
      console.error('Failed to generate performance report:', e);
      setMessages(prev => [...prev, { id: makeMessageId(), text: 'Performance report generate nahi ho paaya. Thoda der baad retry karo.', sender: 'ai', isTypingComplete: true }]);
    } finally {
      setIsGeneratingPerformanceReport(false);
    }
  };

  const runApcOcrQuiz = async (file, remarks = '') => {
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('remarks', String(remarks || '').trim());
      const res = await fetch(`${API_BASE}/apc/ocr-quiz`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const quizMd = String(data?.quiz_markdown || '').trim();
      if (quizMd) {
        setMessages(prev => [...prev, { id: makeMessageId(), text: quizMd, sender: 'ai', isTypingComplete: true }]);
      }
    } catch (e) {
      console.error('APC OCR quiz failed:', e);
      setMessages(prev => [...prev, { id: makeMessageId(), text: `OCR quiz generate nahi ho paaya: ${e.message}`, sender: 'ai', isTypingComplete: true }]);
    } finally {
      setIsUploading(false);
    }
  };

  const triggerApcToolAction = async () => {
    const toolKey = normalizeToolKey(activeTool);
    const semNum = normalizeSemesterNumber(apcSemesterInput || semester);
    const subjCode = String(apcSubjectInput || subject || '').trim();
    const duration = Number(apcDurationInput || 15);

    if (toolKey === 'study roadmap') {
      if (!semNum || !subjCode) {
        alert('Please select semester and subject first.');
        return;
      }
      await handleSend(`Create a ${duration}-day study roadmap for Semester ${semNum} and Subject ${subjCode}. Return day-wise plan from Day 1 to Day ${duration}.`);
      return;
    }
    if (toolKey === 'exam predictor') {
      if (!semNum || !subjCode) {
        alert('Please select semester and subject first.');
        return;
      }
      await handleSend(`Analyze the last 4 years of PYQs for Semester ${semNum} and Subject ${subjCode}. Return only a numbered list of predicted questions.`);
      return;
    }
    if (toolKey === 'cheat mode') {
      if (!subjCode) {
        alert('Please select subject first.');
        return;
      }
      await handleSend(`Use Cheat Mode for ${subjCode}. Give concise flashcard-style answers based on PYQ trends.`);
      return;
    }
    if (toolKey === 'viva mentor') {
      const vSub = String(vivaSubjectInput || apcSubjectInput || subject || '').trim();
      if (!vSub) {
        alert('Subject daalo, phir Viva start hoga.');
        return;
      }
      await handleSend(`My subject is ${vSub}. Start mock viva now and ask questions one-by-one.`);
      return;
    }
    if (toolKey === 'ai code architect') {
      await handleSend('Welcome! Do you want to fix an existing code or write a new one?');
    }
  };

  const loadHistory = async (id, retryCount = 0) => {
    const prevSessionId = sessionId;
    isHistoryLoadingRef.current = true;
    try {
      setSessionId(id);
      const res = await fetch(`${API_BASE}/history?session_id=${id}`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to load chat history');
      const data = await res.json();
      const formattedMessages = data.map(msg => ({
        id: msg.id,
        text: msg.text,
        sender: msg.sender,
        isTypingComplete: true
      }));
      setMessages(formattedMessages);
      setTimeout(() => scrollToBottom(), 0);
    } catch (e) {
      console.error('Failed to load history:', e);
      // Supreme rule: do not wipe UI; retry once before showing error.
      if (retryCount < 1) {
        setTimeout(() => loadHistory(id, retryCount + 1), 700);
        return;
      }
      setSessionId(prevSessionId);
      alert('Error loading chat history: ' + e.message);
    } finally {
      isHistoryLoadingRef.current = false;
    }
  };
  const loadUserProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/profile`, { headers: getHeaders() });
      if (!res.ok) {
        console.error('Failed to load user profile: Unauthorized');
        return;
      }
      const data = await res.json();
      setUserProfile(data);

      const raw = data?.profile_pic_url || data?.profile_picture_url;
      if (raw) {
        const normalized = String(raw).startsWith('http') ? String(raw) : `${API_BASE}${String(raw)}`;
        updateProfilePic(normalized);
      }
    } catch (e) {
      console.error('Failed to load user profile:', e);
    }
  };

  const resolveAvatarUrl = (url) => {
    if (!url) return null;
    const s = String(url).trim();
    if (!s) return null;
    if (s.startsWith('http')) return s;
    if (s.startsWith('/')) return `${API_BASE}${s}`;
    return s;
  };

  const isSupremeArchitect = (() => {
    const dn = String(userProfile.display_name || '').toLowerCase();
    const un = String(userProfile.username || '').toLowerCase();
    return dn.includes('saurav kumar') || un.includes('saurav');
  })();

  const handleLogout = () => {
    clearToken();
    localStorage.removeItem('username');
    localStorage.removeItem('user_id');
    window.location.replace('/');
  };

  const getUserInitials = () => {
    const name = userProfile.display_name || userProfile.username || 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getUserSalutation = () => {
    const name = String(userProfile.display_name || userProfile.username || '').trim();
    const lower = name.toLowerCase();
    if (lower.includes('saurav')) return 'Saurav bhai';
    const gender = String(userProfile.gender || '').toLowerCase();
    if (['female', 'f', 'woman', 'girl'].includes(gender)) return 'Behen';
    if (['male', 'm', 'man', 'boy'].includes(gender)) return 'Bhai';
    return 'Buddy';
  };

  const handleEditProfile = () => {
    setUserMenuAnchor(null);
    navigate('/edit-profile');
  };

  const handleChangePassword = () => {
    setAdminMenuAnchor(null);
    alert('Password change coming soon!');
  };

  const getSubjectLabel = (code) => SUBJECT_LABELS[code] || code;

  const buildDefaultSuggestions = (code) => {
    if (!code) return QUICK_SUGGESTIONS;
    const base = [
      `Start Unit 1 for ${code}`,
      `Important topics of ${code}`,
      `Explain basics of ${code}`,
      'Practice MCQ'
    ];
    return base;
  };

  const buildSem4HardTopicSuggestions = (code) => {
    const hardTopics = SEM4_HARD_TOPICS[code];
    if (!hardTopics) return null;
    return [
      'Important Exam Topics',
      ...hardTopics
    ];
  };

  const getContextualSuggestions = () => {
    if (activeTool === "Assignments") {
      return ["Solve Java assignment", "C++ Program logic", "Problem breakdown", "Code explanation", "Step-by-step solution", "Error debugging"];
    }
    if (activeTool === "Viva") {
      return ["Ask me Java question", "DBMS concepts", "Networking fundamentals", "OOP principles", "Data structure basics", "Algorithm explanation"];
    }
    if (activeTool === "Lab Work") {
      return ["Write a sorting code", "Implement recursion", "Design a class", "Create linked list", "Debug this code", "Optimize solution"];
    }
    if (activeTool === "PYQs") {
      return ["2023 exam questions", "Frequently asked topics", "Marking scheme", "Sample answers", "Predict next exam", "Common patterns"];
    }
    if (activeTool === "Notes") {
      return ["Chapter summary", "Key formulas", "Memory tricks", "Definition list", "Important points", "Revision guide"];
    }
    if (activeTool === "Summary") {
      return ["Condense this text", "Summarize chapter", "Extract key points", "Main ideas only", "Shorten passage", "Quick recap"];
    }
    if (chatSuggestions && chatSuggestions.length > 0) return chatSuggestions;
    return buildDefaultSuggestions(subject);
  };

  const QuickSuggestionsChips = () => {
    if (hideSuggestions) return null;
    if (activeTool) return null;
    const suggestions = getContextualSuggestions();

    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Box sx={{ 
          display: 'flex', 
          gap: 1, 
          mb: 2, 
          flexWrap: 'wrap',
          p: 1,
          borderRadius: '12px',
          bgcolor: 'rgba(187, 134, 252, 0.05)',
          border: `1px solid ${GLASS_BORDER}`,
          backdropFilter: 'blur(12px)'
        }}>
          <AnimatePresence>
            {suggestions.map((text, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ delay: idx * 0.06, duration: 0.25 }}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.95 }}
              >
                <Chip
                  label={text}
                  onClick={async () => {
                    await handleSend(text);
                  }}
                  icon={activeTool ? <Bolt sx={{ fontSize: '16px' }} /> : undefined}
                  sx={{
                    bgcolor: `${NEON_PURPLE}15`,
                    color: '#E6EAF0',
                    border: `1px solid ${NEON_CYAN}40`,
                    fontWeight: 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    backdropFilter: 'blur(8px)',
                    transition: 'all 200ms ease',
                    '&:hover': {
                      bgcolor: `${NEON_CYAN}20`,
                      borderColor: `${NEON_CYAN}80`,
                      boxShadow: `0 0 12px ${NEON_CYAN}30`,
                    },
                  }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </Box>
      </motion.div>
    );
  };

  useEffect(() => {
    const refreshDashboardData = () => {
      if (isHistoryLoadingRef.current) return;
      loadSessions();
      loadDashboardStats();
      loadUserProfile();
      loadStudyRoadmap();
      loadRoadmapHistory();
      loadPerformanceSummary();
    };

    refreshDashboardData();
    
    // Initialize Mermaid — v10 compatible settings
    // NOTE: 'startOnLoad: false' is important in v10 when using mermaid.render() manually.
    // If startOnLoad is true AND we call render() manually, v10 can double-process and throw.
    loadMermaidModule()
      .then((mermaid) => {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'loose',
          fontFamily: 'monospace',
          themeVariables: {
            primaryColor: '#bb86fc',
            primaryTextColor: '#fff',
            primaryBorderColor: '#03dac6',
            lineColor: '#03dac6',
            secondaryColor: '#03dac6',
            tertiaryColor: '#1e293b'
          }
        });
      })
      .catch((err) => {
        console.error('Mermaid failed to initialize:', err);
      });

    // Token Validation: Check every 30 seconds
    const validateToken = () => {
      if (shouldForceLogout()) {
        console.warn('Token expired or invalid - forcing logout');
        clearToken();
        setMessages(prev => [...prev, { 
          id: Date.now(), 
          text: '⏰ **Your session has expired.** Please login again.', 
          sender: 'ai', 
          isTypingComplete: true 
        }]);
        setTimeout(() => navigate('/'), 2000);
      } else if (shouldWarnTokenExpiry()) {
        const remaining = getTokenRemainingMinutes();
        const warning = `⏰ Session expires in ${remaining} minutes. Save your work!`;
        if (tokenWarning !== warning) {
          setTokenWarning(warning);
          setShowTokenWarning(true);
        }
      }
    };

    validateToken(); // Check immediately on load
    tokenCheckIntervalRef.current = setInterval(validateToken, 30000); // Check every 30 seconds
    const dashboardPollRef = setInterval(refreshDashboardData, 180000); // silent background refresh every 3 minutes

    return () => {
      if (tokenCheckIntervalRef.current) clearInterval(tokenCheckIntervalRef.current);
      clearInterval(dashboardPollRef);
    };
  }, []);

  useEffect(() => {
    loadSyllabusProgress(subject);
  }, [subject]);

  useEffect(() => {
    if (!subject) return;
    if (lastGreetedSubjectRef.current === subject) return;
    lastGreetedSubjectRef.current = subject;

    const subjectLabel = getSubjectLabel(subject);
    const hardTopicSuggestions = semester === 'Sem 4' ? buildSem4HardTopicSuggestions(subject) : null;
    const nextSuggestions = hardTopicSuggestions || buildDefaultSuggestions(subject);
    setChatSuggestions(nextSuggestions);

    const salutation = getUserSalutation();
    const greetingText = subject === 'MCS-024'
      ? `${salutation}, Java (MCS-024) shuru karein? Unit 1 se start karein ya koi specific doubt hai?`
      : `${salutation}, ${subjectLabel} (${subject}) shuru karein? Unit 1 se start karein ya koi specific doubt hai?`;

    setActiveView('chat');
    setMessages(prev => ([
      ...prev,
      { id: makeMessageId(), text: greetingText, sender: 'ai', isTypingComplete: false }
    ]));
  }, [subject, semester]);
  
  useEffect(() => {
    // v10 FIX: mermaid.contentLoaded() is a no-op in v10 when startOnLoad:false.
    // SafeMermaidViewer handles its own rendering via mermaid.render() internally.
    // Nothing needed here.
  }, [messages]);

  useEffect(() => {
    if (activeView === 'chat') {
      loadSessions();
    }
  }, [activeView]);
  
  useEffect(() => scrollToBottom(), [messages, isAiThinking]);
  
  const handleSend = async (overrideText) => {
    const textToSend = (overrideText !== undefined ? overrideText : input).trim();
    if (!textToSend) return;

    setInput(''); // IMMEDIATE clear
    if (inputRef.current) inputRef.current.focus();
    await sendMessage(textToSend, mode);
  };

  const sendMessage = async (text, currentMode) => {
    const selectedTool = activeTool;
    setCurrentAnswer('');
    setMessages(prev => [...prev, { id: makeMessageId(), text, sender: 'user', isTypingComplete: true }]);
    setIsAiThinking(true);
    setIsGenerating(true);

    const modeToSend = selectedTool ? 'study' : (currentMode === 'auto' ? 'casual' : currentMode);
    const selectedSubjectForRequest = selectedTool
      ? (String(apcSubjectInput || vivaSubjectInput || subject || '').trim())
      : subject;
    const selectedSemesterForRequest = selectedTool
      ? normalizeSemesterNumber(apcSemesterInput || semester)
      : normalizeSemesterNumber(semester);

    // Create new abort controller (only stop when user clicks Stop)
    abortControllerRef.current = new AbortController();

    let thinkingMessage = null;

    try {
      // Trim context while preserving latest diagram/code block
      let trimmedMessages = messages;
      const maxContext = 10;
      if (Array.isArray(messages) && messages.length > maxContext) {
        // Find the latest diagram/code block message
        let diagramIdx = -1;
        for (let i = messages.length - 1; i >= 0; i--) {
          const msg = messages[i];
          if (typeof msg.text === 'string' && (msg.text.includes('```mermaid') || msg.text.match(/```[a-zA-Z]+/))) {
            diagramIdx = i;
            break;
          }
        }
        // Slice last maxContext messages
        trimmedMessages = messages.slice(-maxContext);
        // If diagram/code block is not in trimmed, add it
        if (diagramIdx !== -1 && diagramIdx < messages.length - maxContext) {
          trimmedMessages = [messages[diagramIdx], ...trimmedMessages];
        }
      }
      const res = await fetch(`${API_BASE}/chat`, { 
        method: 'POST', 
        headers: getHeaders(), 
        body: JSON.stringify({ 
          message: text, 
          mode: modeToSend, 
          selected_subject: selectedSubjectForRequest, 
          selected_semester: selectedSemesterForRequest,
          session_id: sessionId,
          active_tool: selectedTool,
          messages: trimmedMessages
        }),
        signal: abortControllerRef.current.signal
      });

      if (res.status === 401) { 
        clearToken();
        setIsAiThinking(false);
        setIsGenerating(false);
        abortControllerRef.current = null;
        navigate('/');
        return; 
      }

      if (!res.ok) {
        const errorData = await res.json().catch(async () => {
          const fallbackText = await res.text().catch(() => '');
          return fallbackText ? { detail: fallbackText } : {};
        });
        const token = getToken();
        const detail = errorData?.detail;
        const detailText = typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.map(d => d?.msg || JSON.stringify(d)).join('; ')
            : detail ? JSON.stringify(detail) : '';
        console.error('Backend error response:', { status: res.status, statusText: res.statusText, data: errorData, token: token?.substring(0, 20) + '...' });
        throw new Error(`HTTP ${res.status}: ${detailText || res.statusText}`);
      }
      const data = await res.json();
      
      setIsAiThinking(false);
      abortControllerRef.current = null;

      if (data?.theme_override !== undefined && typeof onThemeOverride === 'function') {
        onThemeOverride(data);
      }

      if (!sessionId) {
        setSessionId(data.session_id);
        loadSessions();
      }

      let parsedAnswer = '';
      let parsedSuggestions = [];

      try {
        // ── Path 1: Backend already parsed JSON cleanly (ideal case) ──────
        if (data?.response?.answer) {
          parsedAnswer     = data.response.answer;
          parsedSuggestions = Array.isArray(data.response.next_suggestions)
            ? data.response.next_suggestions : [];

        // ── Path 2: Root-level answer field ───────────────────────────────
        } else if (data?.answer) {
          parsedAnswer     = data.answer;
          parsedSuggestions = Array.isArray(data.next_suggestions)
            ? data.next_suggestions : [];

        // ── Path 3: Raw reply string — AI may have returned mixed text ─────
        } else if (typeof data?.reply === 'string') {
          let raw = data.reply.trim();

          // 3a. Try to parse the whole thing as JSON first
          try {
            const j = JSON.parse(raw);
            if (j?.answer) {
              parsedAnswer      = j.answer;
              parsedSuggestions = Array.isArray(j.next_suggestions) ? j.next_suggestions : [];
              raw = ''; // mark as handled
            }
          } catch { /* not clean JSON, fall through */ }

          if (raw) {
            // 3b. Strip trailing {"next_suggestions":[...]} blob
            const tailMatch = raw.match(/\n?\*?\*?next_suggestions\*?\*?:?[\s\S]*$/i)
                           || raw.match(/\{[\s\n]*"next_suggestions"[\s\S]*\}[\s]*$/);
            if (tailMatch) {
              raw = raw.slice(0, tailMatch.index).trim();
            }

            // 3c. Strip any "next_suggestions:" label lines that leaked as plain text
            raw = raw.replace(/\n?\*?\*?next_suggestions\*?\*?\s*:?[\s\S]*$/i, '').trim();

            parsedAnswer = raw;
          }
        }

        // ── Final cleanup on parsedAnswer ─────────────────────────────────
        // Remove trailing next_suggestions text (visible when JSON parse fails)
        parsedAnswer = parsedAnswer
          .replace(/\nnext_suggestions\s*:[\s\S]*$/i, '')
          .replace(/\n\*\*next_suggestions\*\*[\s\S]*$/i, '')
          .replace(/\{\s*"next_suggestions"\s*:[\s\S]*?\}\s*$/g, '')
          .trim();

        if (!parsedAnswer) {
          parsedAnswer = data?.reply || 'Sorry, response parsing failed.';
        }

      } catch (parseError) {
        parsedAnswer      = data?.reply || 'Sorry, response parsing failed.';
        parsedSuggestions = DEFAULT_SUBJECT_CHIPS;
      }

      // Remove temporary thinking message and add actual response
      setCurrentAnswer(parsedAnswer);
      const hideSuggestionsFromResponse = Boolean(data?.hide_suggestions);
      const inlineSuggestions = hideSuggestionsFromResponse ? [] : parsedSuggestions;

      const aiMessageId = makeMessageId();
      activeAiMessageIdRef.current = aiMessageId;
      streamBufferRef.current[aiMessageId] = parsedAnswer;

      setMessages(prev => {
        let updated = prev;
        if (thinkingMessage) {
          updated = updated.filter(m => !m.isTemporary);
        }
        return upsertMessage(updated, {
          id: aiMessageId,
          text: streamBufferRef.current[aiMessageId],
          sender: 'ai',
          isTypingComplete: false,
          nextSuggestions: inlineSuggestions,
        });
      });

      setHideSuggestions(hideSuggestionsFromResponse);
      if (hideSuggestionsFromResponse) {
        setChatSuggestions([]);
      } else if (!inlineSuggestions.length) {
        setChatSuggestions(DEFAULT_SUBJECT_CHIPS);
      }
      if (normalizeToolKey(selectedTool) === 'study roadmap') {
        setRoadmapDraftText(parsedAnswer);
        const roadmapDays = parseRoadmapDays(parsedAnswer);
        if (roadmapDays.length > 0) {
          const duration = Number(apcDurationInput || 15);
          const trimmed = roadmapDays.slice(0, Math.max(1, duration));
          const localRoadmap = {
            has_roadmap: true,
            title: `${Math.max(1, duration)}-Day Study Roadmap`,
            subject: String(apcSubjectInput || subject || '') || null,
            semester: normalizeSemesterNumber(apcSemesterInput || semester) ? `Sem ${normalizeSemesterNumber(apcSemesterInput || semester)}` : null,
            duration_days: Math.max(1, duration),
            days: trimmed,
            total_days: trimmed.length,
            completion_pct: 0,
            created_at: new Date().toISOString(),
          };
          try {
            localStorage.setItem(STUDY_ROADMAP_KEY, JSON.stringify(localRoadmap));
          } catch {
            // ignore quota/storage errors
          }
          setStudyRoadmap(localRoadmap);
        }
      }
      if (normalizeToolKey(selectedTool) === 'exam predictor') {
        const predictions = parsePredictedQuestions(parsedAnswer);
        setExamPredictions(predictions);
      }
      setTimeout(() => inputRef.current?.focus(), 0);

      // v10 FIX: No need to call mermaid.contentLoaded() here.
      // SafeMermaidViewer mounts and calls mermaid.render() on its own.

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request aborted by user');
        setIsGenerating(false);
        return; // Don't show error for intentional abort
      }
      
      console.error('Chat error:', error);
      setIsAiThinking(false);
      setIsGenerating(false);
      abortControllerRef.current = null;
      setCurrentAnswer('');

      // Remove temporary thinking message on error
      if (thinkingMessage) {
        setMessages(prev => prev.filter(m => !m.isTemporary));
      }

      setHideSuggestions(false);
      setChatSuggestions(DEFAULT_SUBJECT_CHIPS);
      setMessages(prev => [...prev, { id: makeMessageId(), text: `Error: ${error.message}. Please check if backend is running on ${API_BASE}`, sender: 'ai', isTypingComplete: true }]);
    }
  };

  const handleDeleteSession = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this chat? This action cannot be undone.")) return;
    
    try {
      const res = await fetch(`${API_BASE}/sessions/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (!res.ok) throw new Error(`Failed to delete: ${res.status}`);
      setSessions(prev => prev.filter(s => s.id !== id));
      setRecentChats(prev => prev.filter(s => s.id !== id));
      if (sessionId === id) {
        setMessages([]);
        setSessionId(null);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert(`Error deleting session: ${error.message}`);
    }
  };

  const handleRenameSession = async (e, id) => {
    e.stopPropagation();
    const currentSession = sessions.find(s => s.id === id);
    const newTitle = prompt("Enter new chat name:", currentSession?.title || "");
    if (!newTitle || newTitle === currentSession?.title || !newTitle.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/sessions/${id}?title=${encodeURIComponent(newTitle.trim())}`, { method: 'PUT', headers: getHeaders() });
      if (!res.ok) throw new Error(`Failed to rename: ${res.status}`);
      const data = await res.json();
      setSessions(prev => prev.map(s => s.id === id ? { ...s, title: data.new_title } : s));
      setRecentChats(prev => prev.map(s => s.id === id ? { ...s, title: data.new_title } : s));
    } catch (error) {
      console.error('Rename error:', error);
      alert(`Error renaming session: ${error.message}`);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentAnswer('');
    setSessionId(null);
    setActiveTool(null);
    setChatSuggestions(QUICK_SUGGESTIONS);
    setActiveView('chat');
    // Stop any ongoing response
    if (isAiThinking && abortControllerRef.current) {
      handleStopResponse();
    }
    loadSessions();
  };

  const handleChatClick = (id) => {
    console.log('Selected chat history:', id);
  };

  const handleStudyTool = (tool) => {
    if (!subject || !semester) {
      alert("Please select a subject and semester first.");
      return;
    }
    setActiveTool(tool.label);
    const initialPrompt = tool.prompt + " " + subject;
    setInput(initialPrompt);
    setTimeout(() => {
      inputRef.current?.focus();
      setActiveView('chat');
      if (mobileOpen) setMobileOpen(false);
    }, 100);
  };

  const loadQuickQuiz = async () => {
    if (!subject || !semester) {
      alert("Please select a subject and semester first.");
      return;
    }

    setLoadingQuiz(true);
    try {
      const semesterNumber = parseInt(String(semester).replace(/[^0-9]/g, ''), 10);
      if (!Number.isFinite(semesterNumber)) {
        throw new Error('Invalid semester selected');
      }
      const res = await fetch(`${API_BASE}/generate-quiz`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ semester: semesterNumber, subject, count: 5 })
      });

      if (res.status === 401) {
        navigate('/');
        return;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Failed to load quiz (HTTP ${res.status})`);
      }

      const data = await res.json();

      // Backend returns an array; future-proof to also accept {questions: [...]}
      let questions = [];
      if (Array.isArray(data)) {
        questions = data;
      } else if (data && typeof data === 'object') {
        questions = data.questions;
        if (typeof questions === 'string') {
          questions = JSON.parse(questions);
        }
      }

      const normalized = Array.isArray(questions) ? questions.slice(0, 5) : [];
      setQuizQuestions(normalized);
      setCurrentQuestionIndex(0);
      setSelectedAnswer('');
      setQuizScore(0);
      setQuizCompleted(false);
      setQuizModalOpen(true);
    } catch (error) {
      console.error('Quick quiz load error:', error);
      alert(`Failed to load quiz: ${error.message}`);
    } finally {
      setLoadingQuiz(false);
    }
  };

  const startQuiz = async () => {
    if (!subject || !semester) {
      alert("Please select a subject and semester first.");
      return;
    }
    // Launch the full-screen Exam Simulator (Phase 4)
    setShowAdvancedTools(false);
    setShowExamSimulator(true);
  };

  const handleAnswerSubmit = () => {
    if (!quizQuestions[currentQuestionIndex]) return;
    if (selectedAnswer === quizQuestions[currentQuestionIndex].correct_answer) {
      setQuizScore(quizScore + 1);
    }
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer('');
    } else {
      setQuizCompleted(true);
    }
  };

  const getQuizRemark = (score) => {
    if (score === 5) return "Topper Vibes! 🔥";
    if (score >= 3) return "Good job, thoda aur padh le! 📚";
    return "Padhai kar bhai, exam aa raha hai! 😅";
  };

  const exportAsTXT = () => {
    const chatText = messages.map(m => `${m.sender.toUpperCase()}: ${m.text}`).join('\n\n');
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BCABuddy_Chat_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFontSize(12);
    let yPos = 20;
    messages.forEach(msg => {
      const lines = doc.splitTextToSize(`${msg.sender.toUpperCase()}: ${msg.text}`, 180);
      lines.forEach(line => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, 10, yPos);
        yPos += 7;
      });
      yPos += 5;
    });
    doc.save(`BCABuddy_Chat_${Date.now()}.pdf`);
  };

  const drawer = (
    <Box sx={{ 
      bgcolor: 'transparent', 
      height: '100%', 
      color: '#E6EAF0', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden',
      boxSizing: 'border-box',
      gap: 0,
      minHeight: 0,
      flex: 1
    }}>
      {/* Header - Fixed */}
      <Box sx={{ p: 2.5, pb: 1.5, flexShrink: 0 }}>
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '20px', letterSpacing: '-0.5px', bgClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundImage: `linear-gradient(135deg, ${NEON_PURPLE}, ${NEON_CYAN})` }}>
              🚀 BCABuddy
            </Typography>
            {userProfile.is_creator && (
              <Box sx={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: 0.5,
                px: 1.5, 
                py: 0.5, 
                borderRadius: '999px', 
                background: 'linear-gradient(to right, #06b6d4, #a855f7)',
                fontSize: '11px',
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '0.3px',
                boxShadow: '0 4px 12px rgba(168, 85, 247, 0.4)',
                animation: 'pulse 2s ease-in-out infinite',
                '@keyframes pulse': {
                  '0%, 100%': { boxShadow: '0 4px 12px rgba(168, 85, 247, 0.4)' },
                  '50%': { boxShadow: '0 4px 20px rgba(168, 85, 247, 0.6)' }
                }
              }}>
                <span style={{ fontSize: '13px' }}>🔱</span>
                Supreme Architect
              </Box>
            )}
          </Box>
        </motion.div>
      </Box>
      <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)', flexShrink: 0 }} />
      
      {/* Scrollable Content */}
      <Box sx={{
        flex: 1,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        px: 1,
        py: 1,
        minHeight: 0,
        height: '100%',
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          bgcolor: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          bgcolor: `${NEON_CYAN}20`,
          borderRadius: '3px',
          '&:hover': {
            bgcolor: `${NEON_CYAN}40`,
          }
        }
      }}>
        {/* Dashboard Section */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1, duration: 0.5 }}>
          <Accordion defaultExpanded sx={{ bgcolor: 'transparent', '&.MuiAccordion-root:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMore />} sx={{ color: NEON_CYAN, fontWeight: 600, p: '8px 0' }}>
              <DashboardIcon sx={{ mr: 1.5, fontSize: '20px' }} /> Dashboard
            </AccordionSummary>
            <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1 }}>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <ListItem component="div" role="button" onClick={() => { setActiveView('dashboard'); setMobileOpen(false); }} sx={{ bgcolor: GLASS_BG, border: GLASS_BORDER, borderRadius: '12px', '&:hover': { backgroundColor: 'rgba(187, 134, 252, 0.1)', borderColor: `${NEON_PURPLE}40` }, backdropFilter: 'blur(12px)', cursor: 'pointer' }}>
                  <ListItemText primary="View Stats" secondary={`${dashboardStats.total_sessions} sessions`} sx={{ '& .MuiListItemText-secondary': { color: 'rgba(255, 255, 255, 0.5)' } }} />
                </ListItem>
              </motion.div>
            </AccordionDetails>
          </Accordion>
        </motion.div>

        {/* New Chat Button */}
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }}>
          <Box sx={{ px: 1 }}>
            <ListItem 
              component="div" 
              role="button" 
              onClick={handleNewChat} 
              sx={{ 
                borderRadius: '12px', 
                bgcolor: `${NEON_PURPLE}15`, 
                border: `1.5px solid ${NEON_PURPLE}40`,
                '&:hover': { 
                  backgroundColor: `${NEON_PURPLE}25`, 
                  borderColor: `${NEON_PURPLE}60` 
                }, 
                backdropFilter: 'blur(12px)', 
                cursor: 'pointer',
                py: 1.2,
                px: 1.5,
                transition: 'all 200ms ease'
              }}
            >
              <ListItemIcon sx={{ color: NEON_PURPLE, minWidth: '36px' }}><Add sx={{ fontSize: '20px' }} /></ListItemIcon>
              <ListItemText 
                primary="New Chat" 
                primaryTypographyProps={{ sx: { fontSize: '14px', fontWeight: 600 } }}
              />
            </ListItem>
          </Box>
        </motion.div>

        {/* Recent History Section */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25, duration: 0.5 }}>
          <Box sx={{ px: 1.5, py: 1 }}>
            <Typography sx={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Recent History
            </Typography>
          </Box>
          <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)' }} />
          <Box sx={{
            maxHeight: '220px',
            overflowY: 'auto',
            px: 1,
            pb: 1,
            '&::-webkit-scrollbar': { width: '6px' },
            '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
            '&::-webkit-scrollbar-thumb': { bgcolor: `${NEON_CYAN}40`, borderRadius: '3px', '&:hover': { bgcolor: `${NEON_CYAN}60` } }
          }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {recentChats && recentChats.length > 0 ? (
                <AnimatePresence>
                  {recentChats.map((s, idx) => (
                    <motion.div key={s.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + idx * 0.04, duration: 0.35 }} exit={{ opacity: 0, x: -20 }}>
                      <ListItem
                        component="div"
                        role="button"
                        onClick={() => {
                          handleChatClick(s.id);
                          loadHistory(s.id);
                        }}
                        sx={{
                          borderRadius: '8px',
                          bgcolor: sessionId === s.id ? `${NEON_CYAN}20` : 'rgba(255, 255, 255, 0.03)',
                          border: sessionId === s.id ? `1.5px solid ${NEON_CYAN}` : '1.5px solid rgba(255, 255, 255, 0.05)',
                          '&:hover': {
                            backgroundColor: sessionId === s.id ? `${NEON_CYAN}25` : 'rgba(255, 255, 255, 0.08)',
                            borderColor: NEON_CYAN
                          },
                          backdropFilter: 'blur(12px)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          overflow: 'hidden',
                          py: 1,
                          px: 1.5,
                          cursor: 'pointer',
                          transition: 'all 200ms ease'
                        }}
                      >
                        <Timer sx={{ fontSize: 16, color: NEON_CYAN }} />
                        <ListItemText
                          primary={s.title}
                          primaryTypographyProps={{ noWrap: true, className: 'truncate max-w-[150px] inline-block', sx: { fontSize: '13px', fontWeight: sessionId === s.id ? 600 : 400 } }}
                          sx={{ minWidth: 0, overflow: 'hidden' }}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRenameSession(e, s.id);
                            }}
                            sx={{ color: NEON_CYAN, '&:hover': { bgcolor: `${NEON_CYAN}20` } }}
                          >
                            <EditIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSession(e, s.id);
                            }}
                            sx={{ color: '#ff6b6b', '&:hover': { bgcolor: 'rgba(255, 107, 107, 0.15)' } }}
                          >
                            <Delete sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Box>
                      </ListItem>
                    </motion.div>
                  ))}
                </AnimatePresence>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                  <Box sx={{ p: 2, textAlign: 'center', color: 'rgba(255, 255, 255, 0.3)', fontSize: '12px' }}>
                    No chats yet. Start a new chat!
                  </Box>
                </motion.div>
              )}
            </Box>
          </Box>
        </motion.div>

        {/* Academic Setup Section */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }}>
          <Accordion defaultExpanded sx={{ bgcolor: 'transparent', '&.MuiAccordion-root:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMore />} sx={{ color: NEON_CYAN, fontWeight: 600, p: '8px 0' }}>
              <School sx={{ mr: 1.5, fontSize: '20px' }} /> Academic Setup
            </AccordionSummary>
            <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1 }}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Semester</InputLabel>
                <Select value={semester} onChange={(e) => { setSemester(e.target.value); setSubject(''); }} sx={{ color: '#E6EAF0', bgcolor: GLASS_BG, border: GLASS_BORDER, borderRadius: '10px', backdropFilter: 'blur(12px)', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.1)' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: NEON_PURPLE } }}>
                  {Object.keys(IGNOU_SYLLABUS).map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
            {semester && (
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Subject</InputLabel>
                <Select value={subject} onChange={(e) => setSubject(e.target.value)} sx={{ color: '#E6EAF0', bgcolor: GLASS_BG, border: GLASS_BORDER, borderRadius: '10px', backdropFilter: 'blur(12px)', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.1)' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: NEON_CYAN } }}>
                  {Object.keys(IGNOU_SYLLABUS[semester] || {}).map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            )}
          </AccordionDetails>
        </Accordion>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.5 }}>
          <Accordion defaultExpanded sx={{ bgcolor: 'transparent', '&.MuiAccordion-root:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMore />} sx={{ color: NEON_CYAN, fontWeight: 600, p: '8px 0' }}>
              <Summarize sx={{ mr: 1.5, fontSize: '20px' }} /> Assignments
            </AccordionSummary>
          <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1 }}>
            {ASSIGNMENT_TOOLS.map((tool, idx) => {
              const IconComp = tool.icon;
              const toolDescriptions = {
                'Assignments': '📝 Problem-solving practice',
                'PYQs': '📚 Previous year papers',
                'Notes': '📖 Revision notes',
                'Viva': '🎤 Interview Q&A',
                'Lab Work': '💻 Practical code',
                'Summary': '✍️ Content condensed'
              };
              return (
                <motion.div key={idx} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Tooltip title={toolDescriptions[tool.label]} placement="right">
                    <span style={{ display: 'block' }}>
                      <Button fullWidth size="small" onClick={() => handleStudyTool(tool)} disabled={!subject || !semester} sx={{ bgcolor: activeTool === tool.label ? `${NEON_CYAN}30` : GLASS_BG, border: activeTool === tool.label ? `1px solid ${NEON_CYAN}` : GLASS_BORDER, borderRadius: '8px', color: '#E6EAF0', textTransform: 'none', justifyContent: 'flex-start', backdropFilter: 'blur(12px)', transition: 'all 200ms', '&:hover': { backgroundColor: `${NEON_CYAN}20`, borderColor: `${NEON_CYAN}60` }, '&:disabled': { color: 'rgba(255, 255, 255, 0.3)', borderColor: 'rgba(255, 255, 255, 0.05)' } }}>
                        <IconComp sx={{ fontSize: 18, mr: 1.5, color: activeTool === tool.label ? NEON_CYAN : NEON_PURPLE }} />
                        <Typography sx={{ fontSize: '14px', fontWeight: 500 }}>{tool.label}</Typography>
                        {activeTool === tool.label && <Box sx={{ ml: 'auto', width: '6px', height: '6px', borderRadius: '50%', bgcolor: NEON_CYAN, boxShadow: `0 0 8px ${NEON_CYAN}` }} />}
                      </Button>
                    </span>
                  </Tooltip>
                </motion.div>
              );
            })}
          </AccordionDetails>
        </Accordion>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.5 }}>
        <Accordion defaultExpanded sx={{ bgcolor: 'transparent', '&.MuiAccordion-root:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMore />} sx={{ color: NEON_CYAN, fontWeight: 600, p: '8px 0' }}>
            <Book sx={{ mr: 1.5, fontSize: '20px' }} /> Study Tools
          </AccordionSummary>
          <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1 }}>
            <Tooltip title="Advanced Preparation Center">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <ListItem
                  component="div"
                  role="button"
                  onClick={() => {
                    setShowAdvancedTools(true);
                    setShowQuizSection(false);
                    setShowExamSimulator(false);
                    setActiveView('chat');
                    if (mobileOpen) setMobileOpen(false);
                  }}
                  sx={{
                    bgcolor: GLASS_BG,
                    border: GLASS_BORDER,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: `${NEON_PURPLE}20`, borderColor: `${NEON_PURPLE}40` },
                    backdropFilter: 'blur(12px)',
                    py: 1.2
                  }}
                >
                  <ListItemIcon sx={{ color: NEON_CYAN, minWidth: '36px' }}>
                    <WorkspacePremium sx={{ fontSize: '18px' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="🚀 Advanced Preparation Center"
                    sx={{ '& .MuiListItemText-primary': { fontSize: '14px', fontWeight: 500 } }}
                  />
                </ListItem>
              </motion.div>
            </Tooltip>

            <Tooltip title="Quick 10-question practice with instant feedback">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <ListItem
                  component="div"
                  role="button"
                  onClick={() => {
                    setShowAdvancedTools(false);
                    setShowQuizSection(true);
                    if (mobileOpen) setMobileOpen(false);
                  }}
                  sx={{
                    bgcolor: GLASS_BG,
                    border: GLASS_BORDER,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: `${NEON_PURPLE}20`, borderColor: `${NEON_PURPLE}40` },
                    backdropFilter: 'blur(12px)',
                    py: 1.2
                  }}
                >
                  <ListItemIcon sx={{ color: NEON_PURPLE, minWidth: '36px' }}>
                    <Quiz sx={{ fontSize: '18px' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="📚 Practice Quiz"
                    sx={{ '& .MuiListItemText-primary': { fontSize: '14px', fontWeight: 500 } }}
                  />
                </ListItem>
              </motion.div>
            </Tooltip>

            <Tooltip title={!subject || !semester ? "Select subject first" : "Full 45-min exam with 20 questions"}>
              <span>
                <motion.div whileHover={{ scale: !subject || !semester ? 1 : 1.02 }} whileTap={{ scale: !subject || !semester ? 1 : 0.98 }}>
                  <ListItem
                    component="div"
                    role="button"
                    onClick={() => {
                      if (!subject || !semester) {
                        alert("Please select a subject and semester first.");
                        return;
                      }
                      setShowAdvancedTools(false);
                      setShowExamSimulator(true);
                      if (mobileOpen) setMobileOpen(false);
                    }}
                    disabled={!subject || !semester}
                    sx={{
                      bgcolor: GLASS_BG,
                      border: GLASS_BORDER,
                      borderRadius: '12px',
                      cursor: !subject || !semester ? 'not-allowed' : 'pointer',
                      '&:hover': {
                        backgroundColor: !subject || !semester ? GLASS_BG : `${NEON_CYAN}20`,
                        borderColor: !subject || !semester ? GLASS_BORDER : `${NEON_CYAN}40`
                      },
                      backdropFilter: 'blur(12px)',
                      py: 1.2,
                      opacity: !subject || !semester ? 0.5 : 1
                    }}
                  >
                    <ListItemIcon sx={{ color: !subject || !semester ? 'rgba(3, 218, 198, 0.4)' : NEON_CYAN, minWidth: '36px' }}>
                      <Timer sx={{ fontSize: '18px' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary="📝 Mock Exam"
                      sx={{ '& .MuiListItemText-primary': { fontSize: '14px', fontWeight: 500 } }}
                    />
                  </ListItem>
                </motion.div>
              </span>
            </Tooltip>

            <Tooltip title={!subject || !semester ? "Select subject first" : "Mock test with full coverage"}>
              <span>
                <motion.div whileHover={{ scale: !subject || !semester ? 1 : 1.02 }} whileTap={{ scale: !subject || !semester ? 1 : 0.98 }}>
                  <ListItem
                    component="div"
                    role="button"
                    onClick={() => {
                      if (!subject || !semester) {
                        alert("Please select a subject and semester first.");
                        return;
                      }
                      setShowAdvancedTools(false);
                      setShowExamSimulator(true);
                      if (mobileOpen) setMobileOpen(false);
                    }}
                    disabled={!subject || !semester}
                    sx={{
                      bgcolor: GLASS_BG,
                      border: GLASS_BORDER,
                      borderRadius: '12px',
                      cursor: !subject || !semester ? 'not-allowed' : 'pointer',
                      '&:hover': {
                        backgroundColor: !subject || !semester ? GLASS_BG : `${NEON_CYAN}20`,
                        borderColor: !subject || !semester ? GLASS_BORDER : `${NEON_CYAN}40`
                      },
                      backdropFilter: 'blur(12px)',
                      py: 1.2,
                      opacity: !subject || !semester ? 0.5 : 1
                    }}
                  >
                    <ListItemIcon sx={{ color: !subject || !semester ? 'rgba(3, 218, 198, 0.4)' : NEON_CYAN, minWidth: '36px' }}>
                      <Assessment sx={{ fontSize: '18px' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary="🧪 Mock Test"
                      sx={{ '& .MuiListItemText-primary': { fontSize: '14px', fontWeight: 500 } }}
                    />
                  </ListItem>
                </motion.div>
              </span>
            </Tooltip>

            {ENABLE_LEGACY_QUICK_QUIZ && (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <ListItem component="div" role="button" onClick={loadQuickQuiz} sx={{ bgcolor: GLASS_BG, border: GLASS_BORDER, borderRadius: '12px', '&:hover': { backgroundColor: 'rgba(3, 218, 198, 0.1)', borderColor: `${NEON_CYAN}40` }, backdropFilter: 'blur(12px)', cursor: 'pointer', opacity: loadingQuiz ? 0.7 : 1 }}>
                  <ListItemIcon sx={{ color: NEON_CYAN, minWidth: '36px' }}><Quiz sx={{ fontSize: '18px' }} /></ListItemIcon>
                  <ListItemText primary="Quick Quiz" sx={{ '& .MuiListItemText-primary': { fontSize: '14px', fontWeight: 500 } }} />
                </ListItem>
              </motion.div>
            )}

            <Tooltip title={!subject || !semester ? "Please select a subject and semester first" : "Full 45-minute exam with 20 questions"} placement="right">
              <span>
                <ListItem
                  component="div"
                  role="button"
                  onClick={() => {
                    if (!subject || !semester) {
                      alert("Please select a subject and semester first.");
                      return;
                    }
                    setShowAdvancedTools(false);
                    setShowExamSimulator(true);
                    setActiveView('chat');
                    if (mobileOpen) setMobileOpen(false);
                  }}
                  disabled={!subject || !semester}
                  sx={{
                    bgcolor: GLASS_BG,
                    border: GLASS_BORDER,
                    borderRadius: '12px',
                    cursor: !subject || !semester ? 'not-allowed' : 'pointer',
                    '&:hover': {
                      backgroundColor: !subject || !semester ? GLASS_BG : `${NEON_CYAN}20`,
                      borderColor: !subject || !semester ? GLASS_BORDER : `${NEON_CYAN}40`
                    },
                    backdropFilter: 'blur(12px)',
                    opacity: !subject || !semester ? 0.5 : 1
                  }}
                >
                  <ListItemIcon sx={{ color: !subject || !semester ? 'rgba(3, 218, 198, 0.4)' : NEON_CYAN, minWidth: '36px' }}><Timer sx={{ fontSize: '18px' }} /></ListItemIcon>
                  <ListItemText primary="Exam Simulator" sx={{ '& .MuiListItemText-primary': { fontSize: '14px', fontWeight: 500 } }} />
                </ListItem>
              </span>
            </Tooltip>
          </AccordionDetails>
        </Accordion>
      </motion.div>

      {/* Close scrollable Box */}
      </Box>

      {/* Chat History Dropdown Menu */}
      <MuiMenu
        anchorEl={chatMenuAnchor}
        open={Boolean(chatMenuAnchor)}
        onClose={() => {
          setChatMenuAnchor(null);
          setChatMenuSessionId(null);
        }}
        PaperProps={{
          sx: {
            bgcolor: GLASS_BG,
            border: GLASS_BORDER,
            backdropFilter: 'blur(12px)',
            borderRadius: '12px',
            mt: 1,
          }
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem 
          onClick={(e) => {
            handleRenameSession(e, chatMenuSessionId);
            setChatMenuAnchor(null);
            setChatMenuSessionId(null);
          }}
          sx={{ color: NEON_CYAN, '&:hover': { bgcolor: `${NEON_CYAN}15` } }}
        >
          <Note sx={{ fontSize: 16, mr: 1 }} />
          Rename
        </MenuItem>
        <Divider sx={{ bgcolor: `${NEON_CYAN}20` }} />
        <MenuItem 
          onClick={(e) => {
            handleDeleteSession(e, chatMenuSessionId);
            setChatMenuAnchor(null);
            setChatMenuSessionId(null);
          }}
          sx={{ color: '#ff6b6b', '&:hover': { bgcolor: 'rgba(255, 107, 107, 0.15)' } }}
        >
          <Delete sx={{ fontSize: 16, mr: 1 }} />
          Delete
        </MenuItem>
      </MuiMenu>

    </Box>
  );

  const DashboardView = () => {
    const displayName = String(userProfile?.display_name || userProfile?.username || 'User').trim();
    const candidateName = displayName.split(' ')[0] || displayName;

    const attemptsRaw = safeJsonParse(localStorage.getItem(EXAM_ATTEMPTS_KEY), []);
    const attempts = Array.isArray(attemptsRaw) ? attemptsRaw : [];
    const attemptsForTrend = attempts
      .filter(a => a && typeof a === 'object')
      .filter(a => {
        if (subject && semester) return String(a.subject) === String(subject) && String(a.semester) === String(semester);
        return true;
      })
      .slice()
      .sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')));

    const lastFive = attemptsForTrend.slice(-5);
    const examTrend = lastFive.map((a, idx) => ({
      name: `Exam ${idx + 1}`,
      score: Number(a.percentTotal || 0),
    }));

    const lastExam = lastFive.length ? lastFive[lastFive.length - 1] : null;
    const lastExamScore = lastExam ? Number(lastExam.percentTotal || 0) : null;

    const syllabusPct = Math.max(0, Math.min(100, Number(syllabusProgress?.completion_pct || 0)));

    const activityDays = getLastNDays(7);
    // eslint-disable-next-line no-unused-vars
    const _studyActivityVersion = studyActivityVersion;
    // eslint-disable-next-line no-unused-vars
    const _reviewVersion = reviewVersion;
    const activityMap = readStudyActivity();

    const examMinutesByDay = attempts.reduce((acc, a) => {
      if (!a || typeof a !== 'object') return acc;
      const day = isoDay(a.at || new Date());
      const mins = Number(a.duration_minutes || 0);
      if (!Number.isFinite(mins) || mins <= 0) return acc;
      acc[day] = (acc[day] || 0) + mins;
      return acc;
    }, {});

    const weeklyActivity = activityDays.map((day) => {
      const chatMin = Number(activityMap?.[day] || 0);
      const examMin = Number(examMinutesByDay?.[day] || 0);
      return {
        day: day.slice(5),
        minutes: Math.round((chatMin + examMin) * 10) / 10,
      };
    });

    const weeklyMinutes = weeklyActivity.reduce((sum, d) => sum + Number(d.minutes || 0), 0);
    const weeklyHours = Math.round((weeklyMinutes / 60) * 10) / 10;

    const activityTotals = Object.values(activityMap || {}).reduce((sum, v) => sum + Number(v || 0), 0);
    const examMinutesTotal = Object.values(examMinutesByDay || {}).reduce((sum, v) => sum + Number(v || 0), 0);
    const quizAttemptsRaw = safeJsonParse(localStorage.getItem(QUIZ_ATTEMPTS_KEY), []);
    const quizAttempts = Array.isArray(quizAttemptsRaw) ? quizAttemptsRaw : [];
    const xp = Math.round((quizAttempts.length * 10) + (attempts.length * 50) + Number(activityTotals || 0) + Number(examMinutesTotal || 0));
    const level = Math.max(1, Math.floor(xp / 350) + 1);
    const levelBase = (level - 1) * 350;
    const levelProgress = Math.max(0, Math.min(1, (xp - levelBase) / 350));

    const nextTarget = subject ? `${getSubjectLabel(subject)} (${subject})` : (syllabusProgress?.subject ? `${getSubjectLabel(syllabusProgress.subject)} (${syllabusProgress.subject})` : 'Pick a subject');

    const sessionHours = Math.round((sessionElapsedMinutes / 60) * 10) / 10;
    const reviewItems = readReviewItems();
    const weakTopics = readWeakTopics();
    const nowIso = new Date().toISOString();
    const dueWeakTopics = weakTopics.filter((t) => String(t?.due_at || '') <= nowIso);
    const roadmapDays = Array.isArray(studyRoadmap?.days) ? studyRoadmap.days.slice(0, 15) : [];
    const roadmapPct = Math.max(0, Math.min(100, Number(studyRoadmap?.completion_pct || 0)));

    const containerVariants = {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
    };

    const itemVariants = {
      hidden: { opacity: 0, y: 30 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
    };

    const StatCard = ({ label, value, icon: IconComp, color, countTo = null, suffix = '', showActiveDot = false }) => (
      <motion.div variants={itemVariants}>
        <Card
          sx={{
            bgcolor: GLASS_BG,
            border: `1px solid ${color}35`,
            borderRadius: '20px',
            p: 2.3,
            backdropFilter: 'blur(12px)',
            transition: 'all 200ms',
            '&:hover': { transform: 'translateY(-6px)', borderColor: `${color}75`, boxShadow: `0 0 22px ${color}28` }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.6 }}>
            <Box sx={{ bgcolor: `${color}18`, p: 1.3, borderRadius: '14px', border: `1px solid ${color}35` }}>
              <IconComp sx={{ color, fontSize: 26 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em' }}>{label}</Typography>
              <Typography sx={{ color: '#E6EAF0', fontSize: 22, fontWeight: 900, mt: 0.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {typeof countTo === 'number' ? (
                  <>
                    <CountUp start={0} end={countTo} duration={2.5} />{suffix}
                  </>
                ) : value}
                {showActiveDot && (
                  <span
                    className="animate-pulse bg-green-500 rounded-full h-2 w-2 inline-block"
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '999px',
                      marginLeft: 8,
                      background: '#22c55e',
                      boxShadow: '0 0 10px rgba(34,197,94,0.65)',
                      animation: 'pulseDot 1.4s ease-in-out infinite',
                    }}
                  />
                )}
              </Typography>
            </Box>
          </Box>
        </Card>
      </motion.div>
    );

    return (
      <Box sx={{ p: 3, overflowY: 'auto', height: '100%' }}>
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.div variants={itemVariants}>
            <Card sx={{ bgcolor: GLASS_BG, border: GLASS_BORDER, borderRadius: '22px', p: 2.8, backdropFilter: 'blur(12px)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <Box sx={{ minWidth: 260 }}>
                  <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em' }}>
                    COMMAND CENTER
                  </Typography>
                  <Typography sx={{ color: '#E6EAF0', fontSize: 26, fontWeight: 900, mt: 0.6 }}>
                    Welcome back, {isSupremeArchitect ? 'Saurav bhai' : candidateName}
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, mt: 0.6 }}>
                    Next target: <span style={{ color: NEON_CYAN, fontWeight: 800 }}>{nextTarget}</span>
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1.2, flexWrap: 'wrap' }}>
                  <Button
                    onClick={() => { setShowAdvancedTools(false); setShowQuizSection(true); }}
                    startIcon={<Quiz sx={{ fontSize: 18 }} />}
                    sx={{
                      bgcolor: `${NEON_PURPLE}18`,
                      color: '#E6EAF0',
                      border: `1px solid ${NEON_PURPLE}40`,
                      borderRadius: '14px',
                      fontWeight: 900,
                      px: 2,
                      '&:hover': { bgcolor: `${NEON_PURPLE}24`, boxShadow: `0 0 18px ${NEON_PURPLE}30`, borderColor: `${NEON_PURPLE}70` }
                    }}
                  >
                    Practice Quiz
                  </Button>
                  <Button
                    onClick={() => { setShowAdvancedTools(false); setShowExamSimulator(true); }}
                    startIcon={<Timer sx={{ fontSize: 18 }} />}
                    sx={{
                      bgcolor: `${NEON_CYAN}18`,
                      color: '#E6EAF0',
                      border: `1px solid ${NEON_CYAN}40`,
                      borderRadius: '14px',
                      fontWeight: 900,
                      px: 2,
                      '&:hover': { bgcolor: `${NEON_CYAN}24`, boxShadow: `0 0 18px ${NEON_CYAN}30`, borderColor: `${NEON_CYAN}70` }
                    }}
                  >
                    Exam Simulator
                  </Button>
                </Box>
              </Box>

              <Box sx={{ mt: 2.2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                  <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 800, letterSpacing: '0.12em' }}>
                    DEVELOPER LEVEL
                  </Typography>
                  <Typography sx={{ color: NEON_CYAN, fontWeight: 900, fontSize: 12 }}>
                    Lv {level} • XP {xp}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.round(levelProgress * 100)}
                  sx={{
                    mt: 1,
                    height: 10,
                    borderRadius: 999,
                    bgcolor: 'rgba(255,255,255,0.08)',
                    '& .MuiLinearProgress-bar': { bgcolor: NEON_CYAN }
                  }}
                />
              </Box>
            </Card>
          </motion.div>

          <Box
            component={motion.div}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max"
            sx={{
              mt: 3,
              alignItems: 'start',
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
              gap: 3,
              minWidth: 0,
            }}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* LEFT COLUMN */}
            <motion.div variants={itemVariants} style={{ display: 'grid', gap: 24, minWidth: 0 }}>
              <motion.div variants={itemVariants} className="h-[400px] flex flex-col" style={{ height: 400, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <Card sx={{ bgcolor: GLASS_BG, border: GLASS_BORDER, borderRadius: '20px', p: 2.5, backdropFilter: 'blur(12px)', height: '100%', overflowY: 'auto' }}>
                  <Typography sx={{ color: NEON_CYAN, fontWeight: 900, letterSpacing: '0.06em', mb: 1.2 }}>Stats</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                    <StatCard label="Study Hours" value={`${sessionHours}h`} icon={Timer} color={NEON_CYAN} countTo={Number(sessionHours || 0)} suffix="h" />
                    <StatCard label="Study (7d)" value={`${weeklyHours}h`} icon={School} color={'#10B981'} countTo={Number(weeklyHours || 0)} suffix="h" />
                    <StatCard label="Avg Quiz Score" value={`${Number(dashboardStats.avg_quiz_score || 0).toFixed(0)}%`} icon={Quiz} color={NEON_PURPLE} countTo={Number(dashboardStats.avg_quiz_score || 0)} suffix="%" />
                    <StatCard label="Total Sessions" value={Number(dashboardStats.total_sessions || 0)} icon={BarChart} color={'#F59E0B'} countTo={Number(dashboardStats.total_sessions || 0)} />
                    <StatCard label="Last active" value={String(dashboardStats.recent_activity || '—')} icon={Bolt} color={'#06B6D4'} showActiveDot />
                  </Box>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants} className="h-[400px] flex flex-col" style={{ height: 400, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <Card sx={{ bgcolor: GLASS_BG, border: GLASS_BORDER, borderRadius: '20px', p: 2.5, backdropFilter: 'blur(12px)', height: '100%', overflow: 'hidden' }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                    <Box>
                      <Typography sx={{ color: NEON_CYAN, fontWeight: 900, letterSpacing: '0.06em' }}>Weekly Study Activity</Typography>
                      <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, mt: 0.5 }}>
                        Chat minutes + exam minutes (saved from new attempts)
                      </Typography>
                    </Box>
                    <Tooltip title="Debug: clear locally tracked study minutes (chat time only)">
                      <Button
                        size="small"
                        onClick={clearWeeklyActivity}
                        sx={{
                          minWidth: 0,
                          px: 1.2,
                          py: 0.6,
                          mt: 0.2,
                          borderRadius: '12px',
                          color: 'rgba(255,255,255,0.75)',
                          border: '1px solid rgba(255,255,255,0.14)',
                          bgcolor: 'rgba(255,255,255,0.04)',
                          fontWeight: 900,
                          fontSize: 11,
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.07)', borderColor: `${NEON_CYAN}35`, color: '#E6EAF0' },
                        }}
                      >
                        Clear
                      </Button>
                    </Tooltip>
                  </Box>
                  <Box sx={{ mt: 2, height: 240, minHeight: 240, flex: 1 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={weeklyActivity}>
                        <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                        <XAxis dataKey="day" stroke="rgba(255,255,255,0.55)" />
                        <YAxis stroke="rgba(255,255,255,0.45)" />
                        <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', border: `1px solid ${NEON_CYAN}25`, borderRadius: '12px', color: '#E6EAF0' }} />
                        <Bar dataKey="minutes" fill={NEON_CYAN} radius={[10, 10, 0, 0]} animationDuration={1500} />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </Box>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card sx={{ bgcolor: GLASS_BG, border: GLASS_BORDER, borderRadius: '20px', p: 2.5, backdropFilter: 'blur(12px)' }}>
                  <Typography sx={{ color: NEON_CYAN, fontWeight: 900, letterSpacing: '0.06em' }}>Exam Performance Trend</Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, mt: 0.5 }}>
                    Last 5 exams {subject && semester ? `(${subject} • ${semester})` : '(all)'}
                  </Typography>
                  <Box sx={{ mt: 2, height: 240, minHeight: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={examTrend}>
                        <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.55)" />
                        <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.45)" />
                        <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', border: `1px solid ${NEON_PURPLE}25`, borderRadius: '12px', color: '#E6EAF0' }} />
                        <Line type="monotone" dataKey="score" stroke={NEON_PURPLE} strokeWidth={3} dot={{ r: 5, stroke: NEON_PURPLE, strokeWidth: 2, fill: 'rgba(15,23,42,1)' }} activeDot={{ r: 7 }} animationDuration={1500} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </Card>
              </motion.div>
            </motion.div>

            {/* MIDDLE COLUMN */}
            <motion.div variants={itemVariants} style={{ display: 'grid', gap: 24, minWidth: 0 }}>
              <motion.div variants={itemVariants}>
                <Card sx={{ bgcolor: GLASS_BG, border: GLASS_BORDER, borderRadius: '20px', p: 2.5, backdropFilter: 'blur(12px)', overflow: 'hidden' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.4 }}>
                    <Typography sx={{ color: NEON_CYAN, fontWeight: 900, letterSpacing: '0.06em' }}>Study Widgets</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        onClick={() => setDashboardSlideIndex((prev) => (prev <= 0 ? 1 : prev - 1))}
                        sx={{ minWidth: 34, color: '#E6EAF0', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', fontWeight: 900 }}
                      >
                        ‹
                      </Button>
                      <Button
                        size="small"
                        onClick={() => setDashboardSlideIndex((prev) => (prev >= 1 ? 0 : prev + 1))}
                        sx={{ minWidth: 34, color: '#E6EAF0', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', fontWeight: 900 }}
                      >
                        ›
                      </Button>
                    </Box>
                  </Box>

                  <Box sx={{ overflow: 'hidden' }}>
                    <Box
                      sx={{
                        display: 'flex',
                        width: { xs: '100%', md: '200%' },
                        transform: { xs: 'translateX(0%)', md: `translateX(-${dashboardSlideIndex * 50}%)` },
                        transition: 'transform 420ms ease',
                      }}
                    >
                      <Box sx={{ width: { xs: '100%', md: '50%' }, pr: { xs: 0, md: 1 } }}>
                        <Typography sx={{ color: '#E6EAF0', fontWeight: 800, fontSize: 14, mb: 1 }}>Syllabus Completion</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                          <Box sx={{ position: 'relative', width: 90, height: 90 }}>
                            <CircularProgress variant="determinate" value={syllabusPct} size={90} thickness={5} sx={{ color: '#10B981' }} />
                            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Typography sx={{ color: '#E6EAF0', fontWeight: 900 }}>{Math.round(syllabusPct)}%</Typography>
                            </Box>
                          </Box>
                          <Box sx={{ minWidth: 220, flex: 1 }}>
                            <Typography sx={{ color: 'rgba(255,255,255,0.72)', fontSize: 12 }}>
                              {syllabusProgress?.subject ? `Subject: ${syllabusProgress.subject}` : 'Select a subject'}
                            </Typography>
                            <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, mt: 0.6 }}>
                              {Number(syllabusProgress?.covered_count || 0)} / {Number(syllabusProgress?.total_topics || 0)} topics
                            </Typography>
                            {Array.isArray(syllabusProgress?.covered_topics) && syllabusProgress.covered_topics.length > 0 && (
                              <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {syllabusProgress.covered_topics.slice(0, 4).map((t) => (
                                  <Chip
                                    key={t}
                                    label={t}
                                    size="small"
                                    sx={{ bgcolor: `${NEON_CYAN}14`, color: '#E6EAF0', border: `1px solid ${NEON_CYAN}30`, fontWeight: 700 }}
                                  />
                                ))}
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </Box>

                      <Box sx={{ width: { xs: '100%', md: '50%' }, pl: { xs: 0, md: 1 }, display: { xs: 'none', md: 'block' } }}>
                        <Typography sx={{ color: '#E6EAF0', fontWeight: 800, fontSize: 14, mb: 1 }}>Roadmap</Typography>
                        <Typography sx={{ color: 'rgba(255,255,255,0.68)', fontSize: 12, lineHeight: 1.6 }}>
                          Dedicated Roadmap widget is available as a separate fixed card in this grid.
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants} className="h-[400px] flex flex-col" style={{ height: 400, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <StudyRoadmapCard
                  hasRoadmap={Boolean(studyRoadmap?.has_roadmap)}
                  title={String(studyRoadmap?.title || 'My Study Roadmap')}
                  roadmapPct={roadmapPct}
                  roadmapDays={roadmapDays}
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card sx={{ bgcolor: GLASS_BG, border: GLASS_BORDER, borderRadius: '20px', p: 2.5, backdropFilter: 'blur(12px)' }}>
                  <Typography sx={{ color: NEON_CYAN, fontWeight: 900, letterSpacing: '0.06em' }}>Roadmap History</Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, mt: 0.5 }}>
                    Grouped by Semester → Subject with generated date/time
                  </Typography>
                  <Box sx={{ mt: 1.3 }}>
                    {isRoadmapHistoryLoading && <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>Loading roadmap history...</Typography>}
                    {!isRoadmapHistoryLoading && Object.keys(roadmapHistory || {}).length === 0 && (
                      <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>No saved roadmaps yet. Generate and Accept from APC Study Roadmap.</Typography>
                    )}
                    {Object.entries(roadmapHistory || {}).map(([semKey, subjects]) => (
                      <Accordion key={`sem-${semKey}`} disableGutters sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px !important', mb: 1 }}>
                        <AccordionSummary expandIcon={<ExpandMore sx={{ color: '#E6EAF0' }} />}>
                          <Typography sx={{ color: '#E6EAF0', fontWeight: 800, fontSize: 13 }}>{semKey}</Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ pt: 0.5 }}>
                          {Object.entries(subjects || {}).map(([subjectKey, entries]) => (
                            <Accordion key={`sub-${semKey}-${subjectKey}`} disableGutters sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px !important', mb: 0.8 }}>
                              <AccordionSummary expandIcon={<ExpandMore sx={{ color: '#E6EAF0' }} />}>
                                <Typography sx={{ color: 'rgba(230,234,240,0.95)', fontWeight: 700, fontSize: 12 }}>{subjectKey}</Typography>
                              </AccordionSummary>
                              <AccordionDetails sx={{ pt: 0 }}>
                                {(Array.isArray(entries) ? entries : []).map((item) => (
                                  <Box key={`r-${item.id}`} sx={{ p: 1, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', mb: 0.8 }}>
                                    <Typography sx={{ color: '#E6EAF0', fontSize: 12, fontWeight: 700 }}>{String(item?.title || 'Study Roadmap')}</Typography>
                                    <Typography sx={{ color: 'rgba(255,255,255,0.62)', fontSize: 11 }}>
                                      {`Duration: ${Number(item?.duration_days || 0)} days • Generated: ${item?.created_at ? new Date(item.created_at).toLocaleString() : 'Unknown time'}`}
                                    </Typography>
                                  </Box>
                                ))}
                              </AccordionDetails>
                            </Accordion>
                          ))}
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </Box>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card sx={{ bgcolor: GLASS_BG, border: GLASS_BORDER, borderRadius: '20px', p: 2.5, backdropFilter: 'blur(12px)' }}>
                  <Typography sx={{ color: NEON_CYAN, fontWeight: 900, letterSpacing: '0.06em' }}>Recent Chats</Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, mt: 0.5 }}>
                    Resume where you left off
                  </Typography>
                  <Box sx={{ mt: 1.5, display: 'grid', gap: 1.5 }}>
                    {(recentChats || []).slice(0, 4).map((c) => (
                      <Box
                        key={c.id}
                        sx={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5,
                          p: 1.5, borderRadius: '14px', bgcolor: 'rgba(255,255,255,0.04)', border: `1px solid ${NEON_PURPLE}18`, overflow: 'hidden'
                        }}
                      >
                        <Typography className="truncate max-w-[150px] inline-block" sx={{ color: '#E6EAF0', fontWeight: 700, fontSize: 13, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {String(c.title || 'Untitled chat')}
                        </Typography>
                        <Button
                          size="small"
                          onClick={() => { loadHistory(c.id); setActiveView('chat'); }}
                          sx={{
                            color: NEON_CYAN,
                            border: `1px solid ${NEON_CYAN}35`,
                            borderRadius: '12px',
                            fontWeight: 900,
                            '&:hover': { bgcolor: `${NEON_CYAN}12`, boxShadow: `0 0 14px ${NEON_CYAN}22` }
                          }}
                        >
                          Resume
                        </Button>
                      </Box>
                    ))}
                    {(!recentChats || recentChats.length === 0) && (
                      <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                        No chat sessions yet.
                      </Typography>
                    )}
                  </Box>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card sx={{ bgcolor: GLASS_BG, border: GLASS_BORDER, borderRadius: '20px', p: 2.5, backdropFilter: 'blur(12px)' }}>
                  <Typography sx={{ color: NEON_CYAN, fontWeight: 900, letterSpacing: '0.06em' }}>Results Snapshot</Typography>
                  <Box sx={{ mt: 1.5, display: 'grid', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2 }}>
                      <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: 800, letterSpacing: '0.12em' }}>LAST EXAM</Typography>
                      <Typography sx={{ color: lastExamScore === null ? 'rgba(255,255,255,0.5)' : '#10B981', fontSize: 18, fontWeight: 900 }}>
                        {lastExamScore === null ? '—' : `${Math.round(lastExamScore)}%`}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2 }}>
                      <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: 800, letterSpacing: '0.12em' }}>AVG QUIZ</Typography>
                      <Typography sx={{ color: NEON_PURPLE, fontSize: 18, fontWeight: 900 }}>
                        {Number(dashboardStats.avg_quiz_score || 0).toFixed(0)}%
                      </Typography>
                    </Box>
                  </Box>
                  <JiyaRemark score={lastExamScore ?? dashboardStats.avg_quiz_score} candidateName={candidateName} />
                </Card>
              </motion.div>
            </motion.div>

            {/* RIGHT COLUMN */}
            <motion.div variants={itemVariants} style={{ display: 'grid', gap: 24, minWidth: 0 }}>
              <motion.div variants={itemVariants}>
                <Card sx={{ bgcolor: GLASS_BG, border: GLASS_BORDER, borderRadius: '20px', p: 2.5, backdropFilter: 'blur(12px)' }}>
                  <Typography sx={{ color: NEON_CYAN, fontWeight: 900, letterSpacing: '0.06em' }}>Daily Goals</Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, mt: 0.5 }}>
                    Small wins, daily.
                  </Typography>

                  <Box sx={{ mt: 1.5, display: 'grid', gap: 1 }}>
                    {dailyGoals.slice(0, 6).map((g) => (
                      <Box key={g.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: '12px' }}>
                        <Checkbox
                          checked={Boolean(g.done)}
                          onChange={() => setDailyGoals(prev => prev.map(x => x.id === g.id ? { ...x, done: !x.done } : x))}
                          sx={{
                            color: `${NEON_CYAN}80`,
                            '&.Mui-checked': { color: NEON_CYAN },
                          }}
                        />
                        <Typography sx={{ color: g.done ? 'rgba(255,255,255,0.55)' : '#E6EAF0', fontWeight: 700, fontSize: 13, textDecoration: g.done ? 'line-through' : 'none' }}>
                          {String(g.text)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  <Box sx={{ mt: 1.5, display: 'flex', gap: 1 }}>
                    <TextField
                      value={newGoalText}
                      onChange={(e) => setNewGoalText(e.target.value)}
                      placeholder="Add a goal"
                      size="small"
                      sx={{
                        flex: 1,
                        '& .MuiOutlinedInput-root': {
                          bgcolor: 'rgba(255,255,255,0.04)',
                          borderRadius: '12px',
                          color: '#E6EAF0',
                          '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
                          '&:hover fieldset': { borderColor: `${NEON_CYAN}35` },
                          '&.Mui-focused fieldset': { borderColor: `${NEON_CYAN}60` },
                        },
                        '& .MuiOutlinedInput-input': { color: '#E6EAF0' },
                      }}
                    />
                    <Button
                      onClick={() => {
                        const text = String(newGoalText || '').trim();
                        if (!text) return;
                        setDailyGoals(prev => [{ id: `g_${Date.now()}`, text, done: false }, ...prev]);
                        setNewGoalText('');
                      }}
                      sx={{
                        minWidth: 46,
                        borderRadius: '12px',
                        bgcolor: `${NEON_CYAN}18`,
                        border: `1px solid ${NEON_CYAN}35`,
                        color: '#E6EAF0',
                        fontWeight: 900,
                        '&:hover': { bgcolor: `${NEON_CYAN}24`, boxShadow: `0 0 16px ${NEON_CYAN}25` }
                      }}
                    >
                      <Add sx={{ fontSize: 18 }} />
                    </Button>
                  </Box>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card sx={{ bgcolor: GLASS_BG, border: GLASS_BORDER, borderRadius: '20px', p: 2.5, backdropFilter: 'blur(12px)' }}>
                  <Typography sx={{ color: NEON_CYAN, fontWeight: 900, letterSpacing: '0.06em' }}>Performance Summary</Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, mt: 0.5 }}>
                    Latest analyzer highlights from APC
                  </Typography>

                  <Box sx={{ mt: 1.5, display: 'grid', gap: 1 }}>
                    {(performanceSummary?.highlights || []).slice(0, 4).map((item, idx) => (
                      <Typography key={`perf-${idx}`} sx={{ color: 'rgba(255,255,255,0.78)', fontSize: 12, whiteSpace: 'pre-wrap' }}>
                        • {String(item)}
                      </Typography>
                    ))}
                    {(!performanceSummary?.highlights || performanceSummary.highlights.length === 0) && (
                      <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                        APC se Performance Analyzer run karo, summary yahan show ho jayegi.
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ mt: 1.5, display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      onClick={() => setShowPerformanceReportModal(true)}
                      disabled={!performanceSummary?.report_markdown}
                      sx={{ color: NEON_CYAN, border: `1px solid ${NEON_CYAN}35`, borderRadius: '12px', fontWeight: 800 }}
                    >
                      View Report
                    </Button>
                  </Box>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card sx={{ bgcolor: GLASS_BG, border: GLASS_BORDER, borderRadius: '20px', p: 2.5, backdropFilter: 'blur(12px)' }}>
                  <Typography sx={{ color: NEON_CYAN, fontWeight: 900, letterSpacing: '0.06em' }}>Exam Feed</Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, mt: 0.5 }}>
                    Latest attempt snapshot
                  </Typography>

                  <Box sx={{ mt: 1.5, p: 1.5, borderRadius: '14px', bgcolor: 'rgba(255,255,255,0.04)', border: `1px solid ${NEON_CYAN}18` }}>
                    <Typography sx={{ color: '#E6EAF0', fontWeight: 900, fontSize: 14 }}>
                      {lastExam ? `${String(lastExam.subject || '—')} • ${String(lastExam.semester || '—')}` : 'No exam attempts yet'}
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, mt: 1 }}>
                      {lastExam ? `Score: ${Math.round(Number(lastExam.percentTotal || 0))}% • ${new Date(lastExam.at || Date.now()).toLocaleString()}` : 'Take your first exam to see trend here.'}
                    </Typography>
                    <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Button
                        size="small"
                        onClick={() => { setShowAdvancedTools(false); setShowExamSimulator(true); }}
                        sx={{
                          color: NEON_CYAN,
                          border: `1px solid ${NEON_CYAN}35`,
                          borderRadius: '12px',
                          fontWeight: 900,
                          '&:hover': { bgcolor: `${NEON_CYAN}12`, boxShadow: `0 0 14px ${NEON_CYAN}22` }
                        }}
                      >
                        Review
                      </Button>
                      <Button
                        size="small"
                        onClick={() => { setShowAdvancedTools(false); setShowExamSimulator(true); }}
                        sx={{
                          color: '#E6EAF0',
                          bgcolor: `${NEON_PURPLE}18`,
                          border: `1px solid ${NEON_PURPLE}35`,
                          borderRadius: '12px',
                          fontWeight: 900,
                          '&:hover': { bgcolor: `${NEON_PURPLE}24`, boxShadow: `0 0 14px ${NEON_PURPLE}22` }
                        }}
                      >
                        New Attempt
                      </Button>
                    </Box>
                  </Box>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card sx={{ bgcolor: GLASS_BG, border: GLASS_BORDER, borderRadius: '20px', p: 2.5, backdropFilter: 'blur(12px)' }}>
                  <Typography sx={{ color: NEON_CYAN, fontWeight: 900, letterSpacing: '0.06em' }}>Review Center</Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, mt: 0.5 }}>
                    Past mistakes with Supreme Answers
                  </Typography>

                  <Box sx={{ mt: 1.5, display: 'grid', gap: 1.5 }}>
                    {reviewItems.slice(0, 4).map((item, idx) => (
                      <Box
                        key={`${item.id}_${idx}`}
                        sx={{
                          p: 1.5,
                          borderRadius: '14px',
                          bgcolor: 'rgba(255,255,255,0.04)',
                          border: `1px solid ${NEON_PURPLE}18`,
                          display: 'grid',
                          gap: 1
                        }}
                      >
                        <Typography sx={{ color: NEON_PURPLE, fontWeight: 800, fontSize: 11, letterSpacing: '0.1em' }}>
                          {(item.type || 'review').toUpperCase()}
                        </Typography>
                        <Typography sx={{ color: '#E6EAF0', fontWeight: 800, mt: 1 }}>
                          {String(item.question || '')}
                        </Typography>
                        <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                          Your Answer: {String(item.user_answer || '—').slice(0, 90)}
                        </Typography>
                        <Typography sx={{ color: NEON_CYAN, fontSize: 12 }}>
                          Supreme Answer: {String(item.supreme_answer || '—').slice(0, 90)}
                        </Typography>
                      </Box>
                    ))}

                    {reviewItems.length === 0 && (
                      <Typography sx={{ color: 'rgba(255,255,255,0.6)' }}>
                        No review items yet. Attempt a quiz or exam.
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      size="small"
                      onClick={() => setReviewOpen(true)}
                      sx={{
                        color: NEON_CYAN,
                        border: `1px solid ${NEON_CYAN}35`,
                        borderRadius: '12px',
                        fontWeight: 900,
                        '&:hover': { bgcolor: `${NEON_CYAN}12`, boxShadow: `0 0 14px ${NEON_CYAN}22` }
                      }}
                    >
                      Open Review Center
                    </Button>
                  </Box>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card sx={{ bgcolor: GLASS_BG, border: GLASS_BORDER, borderRadius: '20px', p: 2.5, backdropFilter: 'blur(12px)' }}>
                  <Typography sx={{ color: NEON_CYAN, fontWeight: 900, letterSpacing: '0.06em' }}>Weak Topics</Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, mt: 0.5 }}>
                    Spaced repetition bucket (auto-resurface)
                  </Typography>

                  <Box sx={{ mt: 1.5, display: 'grid', gap: 1.5 }}>
                    {(dueWeakTopics.length > 0 ? dueWeakTopics : weakTopics).slice(0, 5).map((t) => (
                      <Box
                        key={t.key}
                        sx={{
                          p: 1.5,
                          borderRadius: '14px',
                          bgcolor: 'rgba(255,255,255,0.04)',
                          border: `1px solid ${NEON_CYAN}18`,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 1
                        }}
                      >
                        <Typography sx={{ color: '#E6EAF0', fontSize: 13, fontWeight: 700 }}>
                          {String(t.topic || 'Topic').slice(0, 60)}
                        </Typography>
                        <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
                          {String(t.due_at || '').slice(0, 10) || '—'}
                        </Typography>
                      </Box>
                    ))}
                    {weakTopics.length === 0 && (
                      <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                        No weak topics flagged yet.
                      </Typography>
                    )}
                  </Box>
                </Card>
              </motion.div>
            </motion.div>
            </Box>
        </motion.div>

        <Modal open={reviewOpen} onClose={() => setReviewOpen(false)}>
          <Box sx={{ p: 3, height: '100vh', overflowY: 'auto' }}>
            <Card sx={{ maxWidth: 980, mx: 'auto', p: 3, bgcolor: GLASS_BG, border: GLASS_BORDER, borderRadius: '20px', backdropFilter: 'blur(12px)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography sx={{ color: NEON_CYAN, fontSize: 22, fontWeight: 900 }}>
                  Review Center
                </Typography>
                <Button onClick={() => setReviewOpen(false)} sx={{ color: NEON_PURPLE, fontWeight: 800 }}>
                  Close
                </Button>
              </Box>

              <Box sx={{ display: 'grid', gap: 2 }}>
                {reviewItems.map((item, idx) => (
                  <Card key={`${item.id}_${idx}`} sx={{ bgcolor: 'rgba(255,255,255,0.04)', border: GLASS_BORDER, borderRadius: '14px', p: 2 }}>
                    <Typography sx={{ color: NEON_PURPLE, fontWeight: 800, fontSize: 11, letterSpacing: '0.1em' }}>
                      {(item.type || 'review').toUpperCase()} • {String(item.subject || '')}
                    </Typography>
                    <Typography sx={{ color: '#E6EAF0', fontWeight: 800, mt: 1 }}>
                      {String(item.question || '')}
                    </Typography>
                    <Box sx={{ mt: 1.2 }}>
                      <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>Your Answer</Typography>
                      <Typography sx={{ color: '#E6EAF0', whiteSpace: 'pre-wrap' }}>{String(item.user_answer || '—')}</Typography>
                    </Box>
                    <Box sx={{ mt: 1.2 }}>
                      <Typography sx={{ color: NEON_CYAN, fontSize: 12 }}>Supreme Answer</Typography>
                      <Typography sx={{ color: '#E6EAF0', whiteSpace: 'pre-wrap' }}>{String(item.supreme_answer || '—')}</Typography>
                    </Box>
                    {(item.feedback || item.tip) && (
                      <Box sx={{ mt: 1.2 }}>
                        <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>Improvement Tip</Typography>
                        <Typography sx={{ color: '#E6EAF0', whiteSpace: 'pre-wrap' }}>{String(item.feedback || item.tip || '—')}</Typography>
                      </Box>
                    )}
                  </Card>
                ))}
                {reviewItems.length === 0 && (
                  <Typography sx={{ color: 'rgba(255,255,255,0.6)' }}>
                    No review items yet.
                  </Typography>
                )}
              </Box>
            </Card>
          </Box>
        </Modal>
      </Box>
    );
  };

  return (
    <Box
      sx={{
        height: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
        bgcolor: '#000000',
        backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(187, 134, 252, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(3, 218, 198, 0.05) 0%, transparent 50%)'
      }}
    >
      <AppBar position="fixed" sx={{ width: '100%', bgcolor: GLASS_BG, border: GLASS_BORDER, backdropFilter: 'blur(12px)', zIndex: 1200, boxShadow: 'none' }}>
        <Toolbar sx={{ justifyContent: 'space-between', py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <IconButton color="inherit" onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: 2, display: { sm: 'none' }, color: NEON_CYAN }}>
                <Menu />
              </IconButton>
            </motion.div>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '18px', bgClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundImage: `linear-gradient(135deg, ${NEON_PURPLE}, ${NEON_CYAN})` }}>
              🚀 BCABuddy
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="caption" sx={{ color: NEON_CYAN, fontWeight: 500 }}>
              {subject ? `📚 ${subject}` : '✨ Ready to learn'}
            </Typography>
            
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <IconButton size="small" onClick={(e) => setExportMenuAnchor(e.currentTarget)} sx={{ color: NEON_PURPLE }}>
                <Download sx={{ fontSize: 18 }} />
              </IconButton>
            </motion.div>

            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Tooltip title="Settings">
                <IconButton size="small" onClick={(e) => setAdminMenuAnchor(e.currentTarget)} sx={{ color: NEON_CYAN }}>
                  <Settings sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </motion.div>

            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              <Tooltip title={userProfile.display_name || userProfile.username}>
                <Box onClick={(e) => setUserMenuAnchor(e.currentTarget)} sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: `${NEON_PURPLE}40`, border: `2px solid ${NEON_CYAN}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: NEON_CYAN, fontWeight: 700, fontSize: '14px', cursor: 'pointer', transition: 'all 200ms ease', '&:hover': { bgcolor: `${NEON_PURPLE}60`, boxShadow: `0 0 15px ${NEON_PURPLE}50` }, position: 'relative', overflow: 'hidden' }}>
                  {resolveAvatarUrl(userProfile?.profile_pic_url || userProfile?.profile_picture_url || profilePic) ? (
                    <img
                      src={resolveAvatarUrl(userProfile?.profile_pic_url || userProfile?.profile_picture_url || profilePic)}
                      alt="avatar"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }}
                    />
                  ) : (
                    getUserInitials()
                  )}

                  {isSupremeArchitect && (
                    <Box sx={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', bgcolor: 'rgba(10, 13, 23, 0.9)', border: `1px solid ${NEON_CYAN}80`, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(12px)' }}>
                      <WorkspacePremium sx={{ fontSize: 14, color: NEON_CYAN }} />
                    </Box>
                  )}
                </Box>
              </Tooltip>
            </motion.div>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Export Menu */}
      <MuiMenu open={Boolean(exportMenuAnchor)} anchorEl={exportMenuAnchor} onClose={() => setExportMenuAnchor(null)} sx={{ '& .MuiPaper-root': { bgcolor: GLASS_BG, border: GLASS_BORDER, backdropFilter: 'blur(12px)' } }}>
        <MenuItem onClick={() => { exportAsTXT(); setExportMenuAnchor(null); }}>📄 Export as TXT</MenuItem>
        <MenuItem onClick={async () => { await exportAsPDF(); setExportMenuAnchor(null); }}>📕 Export as PDF</MenuItem>
      </MuiMenu>

      {/* Admin Settings Menu */}
      <MuiMenu open={Boolean(adminMenuAnchor)} anchorEl={adminMenuAnchor} onClose={() => setAdminMenuAnchor(null)} sx={{ '& .MuiPaper-root': { bgcolor: GLASS_BG, border: GLASS_BORDER, backdropFilter: 'blur(12px)', minWidth: '220px' }, '& .MuiMenuItem-root': { color: '#E6EAF0', '&:hover': { bgcolor: `${NEON_CYAN}20` } } }}>
        <Typography sx={{ px: 2, py: 1, fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 600, textTransform: 'uppercase' }}>⚙️ Settings</Typography>
        <Divider sx={{ bgcolor: `${NEON_CYAN}20` }} />
        <MenuItem onClick={handleChangePassword} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <LockIcon sx={{ fontSize: 18, color: NEON_CYAN }} />
          <Typography sx={{ fontSize: '14px' }}>Change Password</Typography>
        </MenuItem>
        <MenuItem onClick={() => { setAdminMenuAnchor(null); alert('Clear chat history coming soon!'); }} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Delete sx={{ fontSize: 18, color: '#ff6b6b' }} />
          <Typography sx={{ fontSize: '14px' }}>Clear History</Typography>
        </MenuItem>
        <MenuItem onClick={() => { setAdminMenuAnchor(null); alert('App settings coming soon!'); }} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Settings sx={{ fontSize: 18, color: NEON_PURPLE }} />
          <Typography sx={{ fontSize: '14px' }}>App Settings</Typography>
        </MenuItem>
        <Divider sx={{ bgcolor: `${NEON_CYAN}20`, my: 1 }} />
        <MenuItem onClick={() => { setAdminMenuAnchor(null); alert('About coming soon!'); }} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Info sx={{ fontSize: 18, color: NEON_CYAN }} />
          <Typography sx={{ fontSize: '14px' }}>About BCABuddy</Typography>
        </MenuItem>
      </MuiMenu>

      {/* User Profile Menu */}
      <MuiMenu open={Boolean(userMenuAnchor)} anchorEl={userMenuAnchor} onClose={() => setUserMenuAnchor(null)} sx={{ '& .MuiPaper-root': { bgcolor: GLASS_BG, border: GLASS_BORDER, backdropFilter: 'blur(12px)', minWidth: '240px' }, '& .MuiMenuItem-root': { color: '#E6EAF0', '&:hover': { bgcolor: `${NEON_PURPLE}20` } } }}>
        <Box sx={{ px: 2, py: 2, display: 'flex', alignItems: 'center', gap: 2, borderBottom: `1px solid ${NEON_CYAN}20` }}>
          <Box sx={{ width: 50, height: 50, borderRadius: '50%', bgcolor: `${NEON_PURPLE}40`, border: `2px solid ${NEON_CYAN}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: NEON_CYAN, fontWeight: 700, fontSize: '18px', position: 'relative', overflow: 'hidden' }}>
            {resolveAvatarUrl(userProfile?.profile_pic_url || userProfile?.profile_picture_url || profilePic) ? (
              <img
                src={resolveAvatarUrl(userProfile?.profile_pic_url || userProfile?.profile_picture_url || profilePic)}
                alt="avatar"
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }}
              />
            ) : (
              getUserInitials()
            )}

            {isSupremeArchitect && (
              <Box sx={{ position: 'absolute', top: -7, right: -7, width: 22, height: 22, borderRadius: '50%', bgcolor: 'rgba(10, 13, 23, 0.9)', border: `1px solid ${NEON_CYAN}80`, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(12px)' }}>
                <WorkspacePremium sx={{ fontSize: 15, color: NEON_CYAN }} />
              </Box>
            )}
          </Box>
          <Box>
            <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#E6EAF0' }}>
              {userProfile.display_name || userProfile.username}
            </Typography>
            <Typography sx={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
              @{userProfile.username}
            </Typography>
          </Box>
        </Box>
        <Divider sx={{ bgcolor: `${NEON_CYAN}20` }} />
        <MenuItem onClick={handleEditProfile} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <EditIcon sx={{ fontSize: 18, color: NEON_CYAN }} />
          <Typography sx={{ fontSize: '14px' }}>Edit Profile</Typography>
        </MenuItem>
        <MenuItem onClick={() => { setUserMenuAnchor(null); setActiveView('dashboard'); }} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <DashboardIcon sx={{ fontSize: 18, color: NEON_PURPLE }} />
          <Typography sx={{ fontSize: '14px' }}>Dashboard</Typography>
        </MenuItem>
        <Divider sx={{ bgcolor: `${NEON_CYAN}20`, my: 1 }} />
        <MenuItem onClick={() => { setUserMenuAnchor(null); handleLogout(); }} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: '#ff6b6b', '&:hover': { bgcolor: 'rgba(255, 107, 107, 0.1)' } }}>
          <LogoutRounded sx={{ fontSize: 18 }} />
          <Typography sx={{ fontSize: '14px' }}>Logout</Typography>
        </MenuItem>
      </MuiMenu>

      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer 
          variant="temporary" 
          open={mobileOpen} 
          onClose={() => setMobileOpen(false)} 
          sx={{ 
            '& .MuiDrawer-paper': { 
              width: drawerWidth, 
              bgcolor: 'transparent', 
              backgroundImage: 'none',
              boxSizing: 'border-box'
            } 
          }}
        >
          {drawer}
        </Drawer>
        <Drawer 
          variant="permanent" 
          sx={{ 
            display: { xs: 'none', sm: 'block' }, 
            '& .MuiDrawer-paper': { 
              width: drawerWidth, 
              bgcolor: GLASS_BG,
              border: `1px solid rgba(255, 255, 255, 0.1)`,
              m: '12px', 
              borderRadius: '24px', 
              height: 'calc(100vh - 24px)', 
              backdropFilter: 'blur(12px)', 
              boxSizing: 'border-box',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 1100
            } 
          }} 
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      <Box sx={{ 
        display: 'flex',
        width: '100%',
        height: '100vh',
        pt: 8,
        boxSizing: 'border-box'
      }}>
        {/* PHASE 3: Conditional rendering for Quiz/Exam/Dashboard/Chat */}
        {showAdvancedTools ? (
          <AdvancedTools
            onBack={() => setShowAdvancedTools(false)}
            avatarUrl={resolveAvatarUrl(profilePic || userProfile?.profile_pic_url || userProfile?.profile_picture_url)}
            displayName={String(userProfile?.display_name || userProfile?.username || 'Student')}
            onSelectTool={(tool) => {
              setShowAdvancedTools(false);
              setShowQuizSection(false);
              setShowExamSimulator(false);
              const toolLabel = typeof tool === 'string' ? tool : (tool?.toolKey || tool?.title || 'Study Tool');
              const normalizedTool = normalizeToolKey(toolLabel);
              setActiveTool(toolLabel);
              setShowExamAskInput(false);
              setShowRoadmapAskInput(false);
              setExamPredictions([]);
              setRoadmapDraftText('');
              if (normalizedTool === 'performance analytics') {
                setInput('');
              } else if (normalizedTool === 'ai code architect') {
                setInput('Welcome! Do you want to fix an existing code or write a new one?');
              } else if (normalizedTool === 'study roadmap' || normalizedTool === 'exam predictor') {
                setApcSemesterInput(prev => prev || normalizeSemesterNumber(semester) || '1');
                setApcSubjectInput(prev => prev || String(subject || '').trim());
                setInput('');
              } else {
                const subjectLabel = subject || apcSubjectInput || 'current subject';
                setInput(`${toolLabel} for ${subjectLabel}`);
              }
              setActiveView('chat');
            }}
          />
        ) : showQuizSection ? (
          // PHASE 3: Quiz Section
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <QuizSection 
              onClose={() => setShowQuizSection(false)} 
              API_BASE={API_BASE}
            />
          </Box>
        ) : showExamSimulator ? (
          // Phase 4: Exam Simulator
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <ExamSimulator 
              semester={semester} 
              subject={subject} 
              onClose={() => setShowExamSimulator(false)}
              API_BASE={API_BASE}
            />
          </Box>
        ) : (
          // Main Content Area (Dashboard or Chat)
          <Box sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minHeight: 0,
            pl: { xs: 0, sm: 3 },
            pr: 2,
            boxSizing: 'border-box'
          }}>
          {activeView === 'dashboard' ? (
            <Box sx={{ flex: 1, overflow: 'auto', pb: 2 }}>
              <DashboardView />
            </Box>
          ) : (
            normalizeToolKey(activeTool) === 'performance analytics' ? (
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', pb: 3 }}>
                <Card sx={{ width: '100%', maxWidth: 760, bgcolor: GLASS_BG, border: GLASS_BORDER, borderRadius: '22px', p: 3, backdropFilter: 'blur(12px)' }}>
                  <Typography sx={{ color: NEON_CYAN, fontWeight: 900, fontSize: '24px', mb: 1 }}>Performance Analyzer</Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.72)', mb: 2 }}>
                    Chat interface yahan disabled hai. Direct report generation mode active.
                  </Typography>
                  <Button
                    onClick={runPerformanceAnalyzerReport}
                    disabled={isGeneratingPerformanceReport}
                    sx={{
                      bgcolor: `${NEON_CYAN}20`,
                      border: `1px solid ${NEON_CYAN}45`,
                      color: '#E6EAF0',
                      fontWeight: 900,
                      px: 3,
                      '&:hover': { bgcolor: `${NEON_CYAN}28` },
                    }}
                  >
                    Generate Report
                  </Button>
                  {isGeneratingPerformanceReport && (
                    <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1.2 }}>
                      <CircularProgress size={20} sx={{ color: NEON_CYAN }} />
                      <Typography sx={{ color: 'rgba(255,255,255,0.75)' }}>
                        Please wait for {performanceWaitMinutes} minutes. Scanning your data and progress...
                      </Typography>
                    </Box>
                  )}
                  {!isGeneratingPerformanceReport && performanceSummary?.report_markdown && (
                    <Button
                      onClick={() => setShowPerformanceReportModal(true)}
                      sx={{
                        mt: 2,
                        bgcolor: `${NEON_PURPLE}20`,
                        border: `1px solid ${NEON_PURPLE}45`,
                        color: '#E6EAF0',
                        fontWeight: 900,
                        px: 3,
                        '&:hover': { bgcolor: `${NEON_PURPLE}28` },
                      }}
                    >
                      View Report
                    </Button>
                  )}
                </Card>
              </Box>
            ) : (
            <>
              {/* Messages Area */}
              {( (normalizeToolKey(activeTool) !== 'exam predictor' || showExamAskInput)
                && (normalizeToolKey(activeTool) !== 'study roadmap' || showRoadmapAskInput)
              ) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}
              >
                <Paper sx={{ 
                  flex: 1,
                  bgcolor: normalizeToolKey(activeTool) === 'viva mentor' ? 'rgba(2, 10, 2, 0.92)' : 'transparent', 
                  border: normalizeToolKey(activeTool) === 'viva mentor' ? '1px solid rgba(57,255,20,0.35)' : 'none',
                  boxShadow: normalizeToolKey(activeTool) === 'viva mentor' ? '0 0 24px rgba(57,255,20,0.12)' : 'none',
                  borderRadius: 0, 
                  p: 2, 
                  overflowY: 'auto', 
                  overflowX: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  mb: 2,
                  fontFamily: normalizeToolKey(activeTool) === 'viva mentor' ? 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' : 'inherit',
                  '&::-webkit-scrollbar': {
                    width: '8px',
                  },
                  '&::-webkit-scrollbar-track': {
                    bgcolor: 'transparent',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    bgcolor: `${NEON_CYAN}30`,
                    borderRadius: '4px',
                    '&:hover': {
                      bgcolor: `${NEON_CYAN}50`,
                    }
                  }
                }}>
                  {messages.length === 0 && (
                    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'rgba(255, 255, 255, 0.4)' }}>
                      <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                        <Box sx={{ fontSize: '56px', mb: 2 }}>💭</Box>
                      </motion.div>
                      <Typography sx={{ fontSize: '18px', fontWeight: 500 }}>Start a conversation to learn</Typography>
                      <Typography sx={{ fontSize: '13px', mt: 1, color: 'rgba(255, 255, 255, 0.3)' }}>Ask anything about your studies</Typography>
                    </Box>
                  )}
                  
                  <AnimatePresence>
                    {messages.map((msg) => (
                      <motion.div key={msg.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} exit={{ opacity: 0, y: -20 }}>
                        <Box sx={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start', mb: 2.5, gap: 1.5, pr: msg.sender === 'user' ? 0 : 2 }}>
                          {msg.sender === 'ai' && (
                            <IconButton
                              size="small"
                              onClick={() => handleSpeak(msg.text, msg.id)}
                              sx={{ color: speakingId === msg.id ? NEON_PURPLE : NEON_CYAN, mt: 0.5 }}
                            >
                              {speakingId === msg.id ? <Stop sx={{ fontSize: '16px' }} /> : <VolumeUp sx={{ fontSize: '16px' }} />}
                            </IconButton>
                          )}
                          {msg.sender === 'ai' && <Avatar sx={{ width: 36, height: 36, bgcolor: `${NEON_CYAN}20`, color: NEON_CYAN, border: `1px solid ${NEON_CYAN}40`, flexShrink: 0 }}><SmartToy sx={{ fontSize: '18px' }} /></Avatar>}
                          <Box sx={{ maxWidth: msg.sender === 'user' ? '70%' : '75%', minWidth: 0 }}>
                            <motion.div whileHover={{ scale: 1.01 }}>
                              <Box sx={{ bgcolor: msg.sender === 'user' ? 'rgba(139, 134, 200, 0.15)' : (normalizeToolKey(activeTool) === 'viva mentor' ? 'rgba(1, 20, 1, 0.95)' : 'rgba(10, 13, 23, 0.9)'), border: msg.sender === 'user' ? `1px solid ${NEON_PURPLE}60` : (normalizeToolKey(activeTool) === 'viva mentor' ? '1px solid rgba(57,255,20,0.35)' : `1px solid rgba(255, 255, 255, 0.1)`), color: normalizeToolKey(activeTool) === 'viva mentor' && msg.sender === 'ai' ? '#9dff8a' : '#FFFFFF', p: 2, borderRadius: '16px', wordBreak: 'break-word', overflowWrap: 'break-word', overflowX: 'hidden', lineHeight: 1.6, fontSize: '15px', whiteSpace: 'pre-wrap', backdropFilter: 'blur(12px)', boxShadow: msg.sender === 'user' ? `0 0 15px ${NEON_PURPLE}15` : 'none', fontFamily: normalizeToolKey(activeTool) === 'viva mentor' ? 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' : 'inherit' }}>
                                {msg.sender === 'ai' && !msg.isTypingComplete ? (
                                  <TypewriterText
                                    text={msg.text}
                                    speed={25}
                                    onProgress={scrollToBottom}
                                    onComplete={() => {
                                      markTypingComplete(msg.id);
                                      setIsGenerating(false);
                                    }}
                                  />
                                ) : (
                                  <ReactMarkdown children={msg.text} remarkPlugins={[remarkGfm]} components={markdownComponents} />
                                )}
                              </Box>
                            </motion.div>
                            {msg.sender === 'ai' && Array.isArray(msg.nextSuggestions) && msg.nextSuggestions.length > 0 && (
                              <Box
                                sx={{
                                  mt: 1,
                                  display: 'flex',
                                  gap: 1,
                                  flexWrap: 'nowrap',
                                  overflowX: 'auto',
                                  pb: 0.5,
                                  '&::-webkit-scrollbar': { height: '4px' },
                                  '&::-webkit-scrollbar-thumb': { bgcolor: `${NEON_CYAN}55`, borderRadius: '6px' }
                                }}
                              >
                                {msg.nextSuggestions.map((text, idx) => (
                                  <Chip
                                    key={`${msg.id}-sugg-${idx}`}
                                    label={text}
                                    onClick={async () => {
                                      await handleSend(text);
                                    }}
                                    sx={{
                                      bgcolor: 'rgba(3, 218, 198, 0.12)',
                                      color: '#E6EAF0',
                                      border: '1px solid rgba(3, 218, 198, 0.3)',
                                      backdropFilter: 'blur(12px)',
                                      fontWeight: 500,
                                      fontSize: '12px',
                                      cursor: 'pointer',
                                      transition: 'all 200ms ease',
                                      '&:hover': {
                                        bgcolor: 'rgba(3, 218, 198, 0.2)',
                                        boxShadow: '0 0 12px rgba(3, 218, 198, 0.5)'
                                      }
                                    }}
                                  />
                                ))}
                              </Box>
                            )}
                          </Box>
                          {msg.sender === 'user' && <Avatar sx={{ width: 36, height: 36, bgcolor: `${NEON_PURPLE}30`, color: NEON_PURPLE, border: `1px solid ${NEON_PURPLE}40`, flexShrink: 0 }}><Person sx={{ fontSize: '18px' }} /></Avatar>}
                        </Box>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {isAiThinking && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2.5, gap: 1.5 }}>
                        <Avatar sx={{ width: 36, height: 36, bgcolor: `${NEON_CYAN}20`, color: NEON_CYAN, border: `1px solid ${NEON_CYAN}40`, flexShrink: 0 }}><SmartToy sx={{ fontSize: '18px' }} /></Avatar>
                        <Box sx={{ bgcolor: 'rgba(10, 13, 23, 0.9)', border: `1px solid rgba(255, 255, 255, 0.1)`, color: '#FFFFFF', p: 2, borderRadius: '16px', backdropFilter: 'blur(12px)' }}>
                          <TypingIndicator />
                        </Box>
                      </Box>
                    </motion.div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </Paper>
              </motion.div>
              )}

              {/* Input Area */}
              <Box sx={{ 
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                pb: 3
              }}>
                {(normalizeToolKey(activeTool) === 'study roadmap' || normalizeToolKey(activeTool) === 'exam predictor') && (
                  <Card sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.04)', border: GLASS_BORDER, borderRadius: '14px' }}>
                    <Typography sx={{ color: NEON_CYAN, fontWeight: 800, fontSize: 13, mb: 1 }}>APC Inputs</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <FormControl size="small" sx={{ minWidth: 190 }}>
                        <InputLabel>Select Semester (1-6)</InputLabel>
                        <Select
                          value={normalizeSemesterNumber(apcSemesterInput) || '1'}
                          label="Select Semester (1-6)"
                          onChange={(e) => {
                            const semNum = String(e.target.value || '');
                            setApcSemesterInput(semNum);
                            setApcSubjectInput('');
                          }}
                        >
                          {[1, 2, 3, 4, 5, 6].map((n) => (
                            <MenuItem key={`apc-sem-${n}`} value={String(n)}>{String(n)}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <FormControl size="small" sx={{ minWidth: 220 }}>
                        <InputLabel>Select Subject</InputLabel>
                        <Select
                          value={apcSubjectInput}
                          label="Select Subject"
                          onChange={(e) => setApcSubjectInput(String(e.target.value || ''))}
                        >
                          {Object.keys(IGNOU_SYLLABUS[semesterKeyFromNumber(apcSemesterInput || semester) || `Sem ${normalizeSemesterNumber(apcSemesterInput || semester) || 1}`] || {}).map((code) => (
                            <MenuItem key={`apc-sub-${code}`} value={code}>{`${code} - ${getSubjectLabel(code)}`}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      {normalizeToolKey(activeTool) === 'study roadmap' && (
                        <FormControl size="small" sx={{ minWidth: 170 }}>
                          <InputLabel>Duration</InputLabel>
                          <Select
                            value={String(apcDurationInput || '15')}
                            label="Duration"
                            onChange={(e) => setApcDurationInput(String(e.target.value || '15'))}
                          >
                            <MenuItem value="15">15 days</MenuItem>
                            <MenuItem value="30">30 days</MenuItem>
                          </Select>
                        </FormControl>
                      )}
                      <Button onClick={triggerApcToolAction} sx={{ color: NEON_CYAN, border: `1px solid ${NEON_CYAN}35`, borderRadius: '12px', fontWeight: 800 }}>
                        Generate
                      </Button>
                      {normalizeToolKey(activeTool) === 'exam predictor' && (
                        <Button
                          onClick={() => setShowExamAskInput((prev) => !prev)}
                          sx={{ color: NEON_PURPLE, border: `1px solid ${NEON_PURPLE}35`, borderRadius: '12px', fontWeight: 800 }}
                        >
                          Ask
                        </Button>
                      )}
                      {normalizeToolKey(activeTool) === 'study roadmap' && (
                        <>
                          <Button
                            onClick={acceptCurrentRoadmap}
                            disabled={!roadmapDraftText.trim()}
                            sx={{ color: '#10B981', border: '1px solid rgba(16,185,129,0.35)', borderRadius: '12px', fontWeight: 800 }}
                          >
                            Accept
                          </Button>
                          <Button
                            onClick={() => setShowRoadmapAskInput((prev) => !prev)}
                            sx={{ color: NEON_PURPLE, border: `1px solid ${NEON_PURPLE}35`, borderRadius: '12px', fontWeight: 800 }}
                          >
                            Ask
                          </Button>
                        </>
                      )}
                    </Box>
                    {normalizeToolKey(activeTool) === 'exam predictor' && examPredictions.length > 0 && (
                      <Box sx={{ mt: 1.4, display: 'grid', gap: 1 }}>
                        {examPredictions.map((item) => (
                          <Box key={`pred-${item.number}-${item.question.slice(0, 16)}`} sx={{ p: 1.2, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <Typography sx={{ color: '#E6EAF0', fontSize: 13, fontWeight: 700 }}>
                              {item.number}. {item.question}
                            </Typography>
                            <Button
                              size="small"
                              onClick={async () => {
                                setShowExamAskInput(true);
                                await handleSend(`Solve this in complete detail without cutting any part: ${item.question}`);
                              }}
                              sx={{ mt: 0.8, color: NEON_CYAN, border: `1px solid ${NEON_CYAN}35`, borderRadius: '10px', fontWeight: 800 }}
                            >
                              Solve This
                            </Button>
                          </Box>
                        ))}
                      </Box>
                    )}
                    {normalizeToolKey(activeTool) === 'study roadmap' && roadmapDraftText.trim() && (
                      <Box sx={{ mt: 1.4, p: 1.2, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', maxHeight: 220, overflowY: 'auto' }}>
                        <ReactMarkdown children={roadmapDraftText} remarkPlugins={[remarkGfm]} components={markdownComponents} />
                      </Box>
                    )}
                  </Card>
                )}

                {normalizeToolKey(activeTool) === 'cheat mode' && (
                  <Card sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.04)', border: GLASS_BORDER, borderRadius: '14px' }}>
                    <Typography sx={{ color: NEON_CYAN, fontWeight: 800, fontSize: 13, mb: 1 }}>Cheat Mode Setup</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <FormControl size="small" sx={{ minWidth: 240 }}>
                        <InputLabel>Select Subject</InputLabel>
                        <Select value={apcSubjectInput} label="Select Subject" onChange={(e) => setApcSubjectInput(String(e.target.value || ''))}>
                          {Object.keys(IGNOU_SYLLABUS[semesterKeyFromNumber(apcSemesterInput || semester) || `Sem ${normalizeSemesterNumber(apcSemesterInput || semester) || 1}`] || {}).map((code) => (
                            <MenuItem key={`cheat-sub-${code}`} value={code}>{`${code} - ${getSubjectLabel(code)}`}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Button onClick={triggerApcToolAction} sx={{ color: NEON_CYAN, border: `1px solid ${NEON_CYAN}35`, borderRadius: '12px', fontWeight: 800 }}>
                        Generate Flashcards
                      </Button>
                    </Box>
                  </Card>
                )}

                {normalizeToolKey(activeTool) === 'viva mentor' && (
                  <Card sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.04)', border: GLASS_BORDER, borderRadius: '14px' }}>
                    <Typography sx={{ color: NEON_CYAN, fontWeight: 800, fontSize: 13, mb: 1 }}>Viva Setup</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <TextField size="small" label="Subject" value={vivaSubjectInput} onChange={(e) => setVivaSubjectInput(e.target.value)} sx={{ minWidth: 220 }} />
                      <Button onClick={triggerApcToolAction} sx={{ color: NEON_CYAN, border: `1px solid ${NEON_CYAN}35`, borderRadius: '12px', fontWeight: 800 }}>
                        Start Viva
                      </Button>
                    </Box>
                  </Card>
                )}

                {normalizeToolKey(activeTool) === 'ai code architect' && (
                  <Card sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.04)', border: GLASS_BORDER, borderRadius: '14px' }}>
                    <Typography sx={{ color: NEON_CYAN, fontWeight: 800, fontSize: 13, mb: 1 }}>Code Architect Start</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Button onClick={() => handleSend('I have existing code. Please debug and fix it.')} sx={{ color: NEON_CYAN, border: `1px solid ${NEON_CYAN}35`, borderRadius: '12px', fontWeight: 800 }}>
                        Fix Existing Code
                      </Button>
                      <Button onClick={() => handleSend('I want new code from scratch.')} sx={{ color: NEON_PURPLE, border: `1px solid ${NEON_PURPLE}35`, borderRadius: '12px', fontWeight: 800 }}>
                        Write New Code
                      </Button>
                    </Box>
                  </Card>
                )}

                {normalizeToolKey(activeTool) === 'quiz master' && (
                  <Card sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.04)', border: GLASS_BORDER, borderRadius: '14px' }}>
                    <Typography sx={{ color: NEON_CYAN, fontWeight: 800, fontSize: 13, mb: 1 }}>Handwriting OCR to Quiz</Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, mb: 1.2 }}>Image ya PDF upload karo. Quiz strictly isi document se banega.</Typography>
                    <TextField
                      fullWidth
                      size="small"
                      label="Remarks / Instructions"
                      value={quizRemarks}
                      onChange={(e) => setQuizRemarks(e.target.value)}
                      placeholder="e.g., Create a practice quiz, Help me memorize this"
                    />
                  </Card>
                )}

                {( (normalizeToolKey(activeTool) !== 'exam predictor' || showExamAskInput)
                  && (normalizeToolKey(activeTool) !== 'study roadmap' || showRoadmapAskInput)
                ) && <QuickSuggestionsChips />}

                {( (normalizeToolKey(activeTool) !== 'exam predictor' || showExamAskInput)
                  && (normalizeToolKey(activeTool) !== 'study roadmap' || showRoadmapAskInput)
                ) && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} whileHover={{ scale: isAiThinking ? 1 : 1.01 }}>
                  <Paper sx={{ bgcolor: normalizeToolKey(activeTool) === 'viva mentor' ? 'rgba(0, 15, 0, 0.88)' : GLASS_BG, border: normalizeToolKey(activeTool) === 'viva mentor' ? '1.5px solid rgba(57,255,20,0.45)' : (isAiThinking ? `2px solid ${NEON_CYAN}` : GLASS_BORDER), borderRadius: '28px', p: 1.5, mx: 0, backdropFilter: 'blur(12px)', boxShadow: normalizeToolKey(activeTool) === 'viva mentor' ? '0 0 20px rgba(57,255,20,0.2)' : (isAiThinking ? `0 0 20px ${NEON_CYAN}50` : 'none'), transition: 'all 200ms' }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                      <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          if (normalizeToolKey(activeTool) === 'quiz master') {
                            await runApcOcrQuiz(file, quizRemarks);
                            return;
                          }
                          setIsUploading(true);
                          try {
                            const formData = new FormData();
                            formData.append('file', file);
                            // NOTE: /upload-notes-ocr is the correct backend endpoint
                            const res = await fetch(`${API_BASE}/upload-notes-ocr`, { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: formData });
                            if (!res.ok) throw new Error('Upload failed');
                            const data = await res.json();
                            const summary = data.points && data.points.length > 0
                              ? `📂 **${file.name}** uploaded!\n\n**Key Points:**\n${data.points.map((p, i) => `${i + 1}. ${p}`).join('\n')}`
                              : `📂 ${file.name} uploaded successfully!`;
                            setMessages(prev => [...prev, { id: Date.now(), text: summary, sender: 'ai', isTypingComplete: true }]);
                          } catch (error) {
                            console.error('Upload failed', error);
                            setMessages(prev => [...prev, { id: Date.now(), text: `Error uploading file: ${error.message}`, sender: 'ai', isTypingComplete: true }]);
                          } finally {
                            setIsUploading(false);
                          }
                        }
                      }} />
                      
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <IconButton size="small" onClick={() => fileInputRef.current.click()} disabled={isAiThinking} sx={{ color: NEON_CYAN, '&:hover': { bgcolor: `${NEON_CYAN}20` } }}>
                          {isUploading ? <CircularProgress size={20} sx={{ color: NEON_CYAN }} /> : <AttachFile sx={{ fontSize: '20px' }} />}
                        </IconButton>
                      </motion.div>

                      <TextField fullWidth placeholder={isAiThinking ? "AI is typing..." : "Ask your AI teacher..."} value={input} inputRef={inputRef} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !isAiThinking && handleSend()} disabled={isAiThinking} sx={{ '& .MuiOutlinedInput-root': { color: '#E6EAF0', fontSize: '15px', '& fieldset': { border: 'none' }, '&:hover fieldset': { border: 'none' }, '&.Mui-focused fieldset': { border: 'none' } }, '& .MuiOutlinedInput-input': { padding: '10px 0', '&::placeholder': { color: 'rgba(255, 255, 255, 0.4)', opacity: 1 } } }} size="small" variant="standard" />

                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <IconButton 
                          onClick={isGenerating ? handleStopResponse : handleSend} 
                          disabled={!isGenerating && !input.trim()}
                          sx={{ 
                            color: 'white', 
                            bgcolor: isGenerating ? '#ff6b6b' : NEON_PURPLE, 
                            borderRadius: '50%', 
                            width: '40px', 
                            height: '40px', 
                            '&:hover': { 
                              bgcolor: isGenerating ? '#ff4444' : NEON_CYAN, 
                              color: isGenerating ? 'white' : '#000' 
                            }, 
                            '&:disabled': { 
                              bgcolor: 'rgba(187, 134, 252, 0.5)', 
                              color: 'white' 
                            }, 
                            transition: 'all 200ms', 
                            flexShrink: 0 
                          }}
                        >
                          {isGenerating ? <Stop sx={{ fontSize: '18px' }} /> : <Send sx={{ fontSize: '18px' }} />}
                        </IconButton>
                      </motion.div>
                    </Box>
                  </Paper>
                </motion.div>
                )}
              </Box>
            </>  
            )
          )}
        </Box>
        )}
      </Box>

      <Modal
        open={showPerformanceReportModal}
        onClose={() => setShowPerformanceReportModal(false)}
        sx={{ display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end' }}
      >
        <AnimatePresence>
          {showPerformanceReportModal && (
            <Box
              component={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              sx={{
                width: '100%',
                height: '100%',
                bgcolor: 'rgba(0,0,0,0.45)',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <Box
                component={motion.div}
                initial={{ x: 480 }}
                animate={{ x: 0 }}
                exit={{ x: 480 }}
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                sx={{
                  width: { xs: '100%', md: '78%', lg: '64%' },
                  maxWidth: 980,
                  height: '100%',
                  bgcolor: 'rgba(15, 23, 42, 0.98)',
                  borderLeft: `1px solid ${NEON_CYAN}35`,
                  backdropFilter: 'blur(12px)',
                  p: 3,
                  overflowY: 'auto',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography sx={{ color: NEON_CYAN, fontWeight: 900, fontSize: 22 }}>Detailed Performance Report</Typography>
                  <Button
                    onClick={() => setShowPerformanceReportModal(false)}
                    sx={{ color: '#E6EAF0', border: '1px solid rgba(255,255,255,0.24)', borderRadius: '12px', fontWeight: 800 }}
                  >
                    Close
                  </Button>
                </Box>
                <Box sx={{ pr: 0.5, whiteSpace: 'pre-wrap' }}>
                  <ReactMarkdown
                    children={String(performanceSummary?.report_markdown || 'No report available.')}
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  />
                </Box>
              </Box>
            </Box>
          )}
        </AnimatePresence>
      </Modal>

      {ENABLE_LEGACY_QUICK_QUIZ && (
        <Modal open={quizModalOpen} onClose={closeQuickQuiz} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Card sx={{ width: '90%', maxWidth: '600px', bgcolor: GLASS_BG, border: GLASS_BORDER, borderRadius: '20px', p: 3, backdropFilter: 'blur(12px)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Button
                onClick={closeQuickQuiz}
                variant="text"
                sx={{
                  color: '#E6EAF0',
                  textTransform: 'none',
                  '&:hover': { bgcolor: `${NEON_CYAN}12` }
                }}
              >
                Back
              </Button>
              <Typography sx={{ color: NEON_CYAN, fontWeight: 700 }}>Quick Quiz</Typography>
              <Box sx={{ width: 56 }} />
            </Box>
            {quizCompleted ? (
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ color: NEON_CYAN, mb: 2, fontWeight: 700 }}>Quiz Completed! 🎉</Typography>
                <Typography variant="h4" sx={{ color: NEON_PURPLE, mb: 2 }}>Score: {quizScore}/5</Typography>
                <Typography sx={{ color: '#E6EAF0', mb: 3 }}>{getQuizRemark(quizScore)}</Typography>
                <Button onClick={closeQuickQuiz} variant="contained" sx={{ bgcolor: NEON_PURPLE, color: 'white', '&:hover': { bgcolor: NEON_CYAN, color: '#000' } }}>Close</Button>
              </Box>
            ) : quizQuestions.length > 0 ? (
              <Box>
                <Typography variant="h6" sx={{ color: NEON_CYAN, mb: 2 }}>Q{currentQuestionIndex + 1}: {quizQuestions[currentQuestionIndex]?.question}</Typography>
                <RadioGroup value={selectedAnswer} onChange={(e) => setSelectedAnswer(e.target.value)}>
                  {quizQuestions[currentQuestionIndex]?.options?.map((option, idx) => (
                    <FormControlLabel key={idx} value={option} control={<Radio />} label={option} sx={{ color: '#E6EAF0', mb: 1 }} />
                  ))}
                </RadioGroup>
                <Button onClick={handleAnswerSubmit} variant="contained" sx={{ bgcolor: NEON_PURPLE, color: 'white', mt: 2, '&:hover': { bgcolor: NEON_CYAN, color: '#000' } }}>Next</Button>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center' }}>
                <CircularProgress sx={{ color: NEON_CYAN }} />
                <Typography sx={{ color: '#E6EAF0', mt: 2 }}>Loading quiz questions...</Typography>
              </Box>
            )}
          </Card>
        </Modal>
      )}

      {/* Token Expiry Warning */}
      <Snackbar
        open={showTokenWarning}
        autoHideDuration={8000}
        onClose={() => setShowTokenWarning(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setShowTokenWarning(false)} 
          severity="warning" 
          sx={{ 
            width: '100%', 
            bgcolor: 'rgba(245, 158, 11, 0.1)', 
            borderLeft: `4px solid #F59E0B`,
            color: '#FEF3C7'
          }}
        >
          ⏰ {tokenWarning}
        </Alert>
      </Snackbar>

      {/* Global Footer Attribution */}
      <Box sx={{
        position: 'fixed',
        bottom: 0,
        left: { sm: drawerWidth },
        right: 0,
        bgcolor: 'rgba(13, 13, 20, 0.85)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        py: 1,
        px: 2,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        fontSize: '12px',
        color: 'rgba(255, 255, 255, 0.6)',
        fontWeight: 500
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          Architected with
          <span style={{ color: '#ef4444', fontSize: '14px' }}>❤️</span>
          by
          <Box component="span" sx={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: 0.3,
            fontWeight: 700,
            background: 'linear-gradient(to right, #06b6d4, #a855f7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            <span style={{ filter: 'none', WebkitTextFillColor: 'initial', background: 'none' }}>🔱</span>
            Supreme Architect
          </Box>
        </Box>
      </Box>

      <script async src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    </Box>
  );
};

export default Dashboard;
