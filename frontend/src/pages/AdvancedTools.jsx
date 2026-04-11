import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, Grid, Button, Avatar, Chip, Divider,
} from '@mui/material';
import {
  BugReport, QueryStats, Route, RecordVoiceOver, Quiz, Analytics,
  ArrowBack, Bolt, AutoAwesome, School, Assessment, TrendingUp,
  PlayArrow, ChevronRight, EmojiObjects, Star,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import BackButton from '../components/BackButton';

// ── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:          'rgba(10, 14, 26, 0.98)',
  surface:     'rgba(18, 26, 46, 0.80)',
  border:      'rgba(255,255,255,0.08)',
  cyan:        '#03dac6',
  cyanDim:     'rgba(3,218,198,0.10)',
  purple:      '#bb86fc',
  purpleDim:   'rgba(187,134,252,0.10)',
  green:       '#39FF14',
  greenDim:    'rgba(57,255,20,0.09)',
  gold:        '#FFD700',
  goldDim:     'rgba(255,215,0,0.10)',
  text:        '#E6EAF0',
  textMuted:   'rgba(230,234,240,0.55)',
  textDim:     'rgba(230,234,240,0.30)',
};

// ── Tool catalogue ───────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: 'study',
    label: 'Study & Learning',
    icon: School,
    accent: C.cyan,
    accentDim: C.cyanDim,
    description: 'Master concepts, plan your schedule, and revise smarter.',
    tools: [
      {
        toolId: 'study_roadmap',
        toolKey: 'Study Roadmap',
        title: 'Study Roadmap',
        subtitle: 'Personalised day-by-day plan',
        description: 'Generate a realistic 7–60 day study plan tailored to your subject, semester, and weak areas. Includes revision windows and exam checkpoints.',
        icon: Route,
        accent: C.cyan,
        accentDim: C.cyanDim,
        badge: 'AI Planner',
      },
      {
        toolId: 'cheat_mode',
        toolKey: 'Cheat Mode',
        title: 'Cheat Mode',
        subtitle: 'Flashcard-style rapid revision',
        description: 'Scan PYQ patterns and get concise exam-focused flashcards. Each card has a likely exam question, a crisp answer, and a memory hook.',
        icon: Bolt,
        accent: C.gold,
        accentDim: C.goldDim,
        badge: 'PYQ Powered',
      },
      {
        toolId: 'ai_code_architect',
        toolKey: 'AI Code Architect',
        title: 'AI Code Architect',
        subtitle: 'Debug, write & understand code',
        description: 'Fix broken code or write programs from scratch. Get step-by-step explanations, time complexity analysis, and working test cases.',
        icon: BugReport,
        accent: C.purple,
        accentDim: C.purpleDim,
        badge: 'Java · Python · C',
      },
      {
        toolId: 'ai_viva_mentor',
        toolKey: 'AI Viva Mentor',
        title: 'AI Viva Mentor',
        subtitle: 'Mock viva with live scoring',
        description: 'Face a strict AI examiner that asks real viva-style questions, scores each answer, and delivers a final verdict with strengths and gaps.',
        icon: RecordVoiceOver,
        accent: C.green,
        accentDim: C.greenDim,
        badge: 'Live Session',
      },
    ],
  },
  {
    id: 'assessment',
    label: 'Assessment & Practice',
    icon: Assessment,
    accent: C.purple,
    accentDim: C.purpleDim,
    description: 'Test yourself with smart quizzes and exam-level questions.',
    tools: [
      {
        toolId: 'quiz_master',
        toolKey: 'Quiz Master',
        title: 'Quiz Master',
        subtitle: 'OCR your notes → instant quiz',
        description: 'Upload a photo of handwritten or printed notes and instantly get a structured MCQ + short-answer quiz generated directly from your material.',
        icon: Quiz,
        accent: C.cyan,
        accentDim: C.cyanDim,
        badge: 'OCR + AI',
      },
      {
        toolId: 'exam_predictor',
        toolKey: 'Exam Predictor',
        title: 'Exam Predictor',
        subtitle: '90% probability questions',
        description: 'Analyses 4 years of IGNOU PYQs to surface the topics most likely to appear. Get a ranked list of predicted questions before you sit the exam.',
        icon: QueryStats,
        accent: C.gold,
        accentDim: C.goldDim,
        badge: 'PYQ Analysis',
      },
    ],
  },
  {
    id: 'analytics',
    label: 'Performance Analytics',
    icon: TrendingUp,
    accent: C.green,
    accentDim: C.greenDim,
    description: 'Know where you stand and what to fix next.',
    tools: [
      {
        toolId: 'performance_analytics',
        toolKey: 'Performance Analytics',
        title: 'Performance Analytics',
        subtitle: 'Weak area detection & action plan',
        description: 'Aggregates your quiz and exam history to detect recurring mistake patterns, show subject-wise accuracy, and create a prioritised corrective action plan.',
        icon: Analytics,
        accent: C.green,
        accentDim: C.greenDim,
        badge: 'AI Insights',
      },
    ],
  },
];

const ALL_TOOLS = CATEGORIES.flatMap(c => c.tools);

// ── Tool Card ────────────────────────────────────────────────────────────────
function ToolCard({ tool, onSelectTool, index }) {
  const [hovered, setHovered] = useState(false);
  const Icon = tool.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, delay: index * 0.04 }}
      whileHover={{ y: -4 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{ height: '100%' }}
    >
      <Card
        onClick={() => onSelectTool(tool)}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 2.5,
          borderRadius: '18px',
          bgcolor: C.surface,
          border: `1px solid ${hovered ? tool.accent + '50' : C.border}`,
          backdropFilter: 'blur(14px)',
          cursor: 'pointer',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          boxShadow: hovered ? `0 0 24px ${tool.accent}20` : 'none',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Hover glow */}
        <Box sx={{
          position: 'absolute', top: -50, right: -50,
          width: 120, height: 120, borderRadius: '50%',
          background: tool.accentDim,
          filter: 'blur(35px)',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.3s',
          pointerEvents: 'none',
        }} />

        {/* Content */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.8 }}>
            <Box sx={{
              p: 1.1, borderRadius: '12px',
              bgcolor: tool.accentDim,
              border: `1px solid ${tool.accent}28`,
              display: 'flex',
            }}>
              <Icon sx={{ color: tool.accent, fontSize: '21px' }} />
            </Box>
            <Chip
              label={tool.badge}
              size="small"
              sx={{
                height: 20, fontSize: '10px', fontWeight: 700,
                bgcolor: tool.accentDim, color: tool.accent,
                border: `1px solid ${tool.accent}28`,
                '& .MuiChip-label': { px: 1 },
              }}
            />
          </Box>

          <Typography sx={{ color: C.text, fontWeight: 700, fontSize: '14.5px', mb: 0.3 }}>
            {tool.title}
          </Typography>
          <Typography sx={{ color: tool.accent, fontSize: '11px', fontWeight: 600, mb: 1.2, opacity: 0.85 }}>
            {tool.subtitle}
          </Typography>
          <Typography sx={{ color: C.textMuted, fontSize: '12px', lineHeight: 1.65 }}>
            {tool.description}
          </Typography>
        </Box>

        {/* CTA */}
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Button
            size="small"
            endIcon={<PlayArrow sx={{ fontSize: '13px !important' }} />}
            onClick={(e) => { e.stopPropagation(); onSelectTool(tool); }}
            sx={{
              color: tool.accent,
              bgcolor: tool.accentDim,
              border: `1px solid ${tool.accent}38`,
              fontWeight: 700, fontSize: '11.5px',
              borderRadius: '999px', px: 1.8, py: 0.5,
              '&:hover': { bgcolor: tool.accentDim, filter: 'brightness(1.3)', boxShadow: `0 0 10px ${tool.accent}35` },
            }}
          >
            Open Tool
          </Button>
          <ChevronRight sx={{ color: C.textDim, fontSize: '17px' }} />
        </Box>
      </Card>
    </motion.div>
  );
}

// ── Category Section ─────────────────────────────────────────────────────────
function CategorySection({ category, onSelectTool, sectionIndex }) {
  const CatIcon = category.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: sectionIndex * 0.08 }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Box sx={{
          p: 0.85, borderRadius: '10px',
          bgcolor: category.accentDim,
          border: `1px solid ${category.accent}28`,
          display: 'flex',
        }}>
          <CatIcon sx={{ color: category.accent, fontSize: '17px' }} />
        </Box>
        <Box>
          <Typography sx={{ color: C.text, fontWeight: 800, fontSize: '14.5px' }}>
            {category.label}
          </Typography>
          <Typography sx={{ color: C.textMuted, fontSize: '11.5px' }}>
            {category.description}
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={2}>
        {category.tools.map((tool, i) => (
          <Grid item xs={12} sm={6} md={4} key={tool.toolId}>
            <ToolCard
              tool={tool}
              onSelectTool={onSelectTool}
              index={sectionIndex * 4 + i}
            />
          </Grid>
        ))}
      </Grid>
    </motion.div>
  );
}

// ── Pro-Chat Card ────────────────────────────────────────────────────────────
function ProChatCard({ onSelectTool, avatarUrl, displayName }) {
  const quickStart = ALL_TOOLS.find(t => t.toolId === 'study_roadmap') || ALL_TOOLS[0];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.32 }}
    >
      <Card sx={{
        mb: 3.5, p: { xs: 2, md: 2.6 },
        borderRadius: '22px',
        background: `linear-gradient(135deg, rgba(3,218,198,0.09) 0%, rgba(57,255,20,0.05) 100%)`,
        border: `1px solid ${C.cyan}30`,
        backdropFilter: 'blur(16px)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* BG orbs */}
        <Box sx={{ position:'absolute', top:-60, right:-60, width:180, height:180, borderRadius:'50%', background:'radial-gradient(circle, rgba(3,218,198,0.10), transparent 70%)', pointerEvents:'none' }} />
        <Box sx={{ position:'absolute', bottom:-40, left:-40, width:140, height:140, borderRadius:'50%', background:'radial-gradient(circle, rgba(57,255,20,0.07), transparent 70%)', pointerEvents:'none' }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative' }}>
          {/* Avatar */}
          <Box sx={{ position: 'relative', flexShrink: 0 }}>
            <Avatar
              src={avatarUrl || undefined}
              alt={displayName || 'Student'}
              sx={{ width: 54, height: 54, border: `2px solid ${C.cyan}`, boxShadow: `0 0 14px ${C.cyan}40` }}
            >
              {String(displayName || 'S').slice(0, 1).toUpperCase()}
            </Avatar>
            {/* Online dot */}
            <Box sx={{ position:'absolute', bottom:2, right:2, width:11, height:11, borderRadius:'50%', bgcolor: C.green, border:`2px solid rgba(10,14,26,0.98)`, boxShadow:`0 0 5px ${C.green}` }} />
          </Box>

          {/* Info */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.3 }}>
              <Typography sx={{ color: C.text, fontWeight: 800, fontSize: { xs:'15px', md:'18px' } }}>
                APC Pro-Chat
              </Typography>
              <Chip
                icon={<AutoAwesome sx={{ fontSize:'10px !important', color:`${C.cyan} !important` }} />}
                label="EXAM MODE ON"
                size="small"
                sx={{ height:18, fontSize:'9px', fontWeight:800, bgcolor:C.cyanDim, color:C.cyan, border:`1px solid ${C.cyan}35`, '& .MuiChip-label':{ px:0.8 } }}
              />
            </Box>
            <Typography sx={{ color: C.textMuted, fontSize:'12px' }}>
              All 7 tools active · Fast structured responses · Focused study mode
            </Typography>
          </Box>

          {/* Start button — desktop */}
          <Button
            onClick={() => onSelectTool(quickStart)}
            startIcon={<PlayArrow sx={{ fontSize:'15px' }} />}
            sx={{
              flexShrink:0, display:{ xs:'none', sm:'flex' },
              color: C.green, border:`1px solid ${C.green}55`,
              bgcolor: C.greenDim, fontWeight:900, fontSize:'12px',
              borderRadius:'999px', px:2, py:0.8,
              '&:hover':{ bgcolor:C.greenDim, filter:'brightness(1.25)', boxShadow:`0 0 12px ${C.green}35` },
            }}
          >
            Start Now
          </Button>
        </Box>

        {/* Start button — mobile */}
        <Button
          fullWidth onClick={() => onSelectTool(quickStart)}
          startIcon={<PlayArrow />}
          sx={{
            mt:2, display:{ xs:'flex', sm:'none' },
            color:C.green, border:`1px solid ${C.green}55`,
            bgcolor:C.greenDim, fontWeight:900, borderRadius:'999px',
            '&:hover':{ bgcolor:C.greenDim, filter:'brightness(1.25)' },
          }}
        >
          Start Pro-Chat
        </Button>
      </Card>
    </motion.div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────
const AdvancedTools = ({ onBack, onSelectTool, avatarUrl, displayName, globalAbortRef = null }) => {

  useEffect(() => {
    document.body.classList.add('exam-mode-active');
    return () => document.body.classList.remove('exam-mode-active');
  }, []);

  const handleBack = () => {
    document.body.classList.remove('exam-mode-active');
    onBack?.();
  };

  return (
    <Box sx={{
      flex: 1, overflowY: 'auto',
      minHeight: '100vh',
      background: `
        radial-gradient(ellipse at 15% 0%,  rgba(3,218,198,0.08)  0%, transparent 50%),
        radial-gradient(ellipse at 85% 5%,  rgba(57,255,20,0.06)  0%, transparent 45%),
        radial-gradient(ellipse at 50% 85%, rgba(187,134,252,0.04) 0%, transparent 50%),
        ${C.bg}
      `,
    }}>
      <BackButton />
      <Box sx={{ maxWidth: 1080, mx: 'auto', p: { xs: 2, md: 3 } }}>

        {/* ── Top bar ── */}
        <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb:3 }}>
          <Button
            onClick={handleBack}
            startIcon={<ArrowBack />}
            sx={{
              color:C.green, border:`1px solid ${C.green}40`,
              bgcolor:C.greenDim, borderRadius:'999px',
              fontWeight:700, fontSize:'13px',
              '&:hover':{ bgcolor:C.greenDim, filter:'brightness(1.2)' },
            }}
          >
            Dashboard
          </Button>

          <Box sx={{ display:'flex', gap:1, flexWrap:'wrap', justifyContent:'flex-end' }}>
            {[
              { icon: EmojiObjects, label: '7 AI Tools', color: C.cyan },
              { icon: Star,         label: 'Exam Mode',  color: C.gold },
            ].map(({ icon: Icon, label, color }) => (
              <Box key={label} sx={{
                display:'flex', alignItems:'center', gap:0.7,
                px:1.3, py:0.45, borderRadius:'999px',
                bgcolor:`${color}10`, border:`1px solid ${color}28`,
              }}>
                <Icon sx={{ color, fontSize:'12px' }} />
                <Typography sx={{ color, fontSize:'10.5px', fontWeight:700 }}>{label}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* ── Page title ── */}
        <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.3 }}>
          <Box sx={{ mb:3 }}>
            <Typography sx={{ color:C.text, fontWeight:900, fontSize:{ xs:'21px', md:'27px' }, lineHeight:1.2, mb:0.5 }}>
              Advanced Preparation Center
            </Typography>
            <Typography sx={{ color:C.textMuted, fontSize:'13px' }}>
              7 AI-powered tools designed to help IGNOU BCA students study smarter, not harder.
            </Typography>
          </Box>
        </motion.div>

        {/* ── Pro-Chat card ── */}
        <ProChatCard onSelectTool={onSelectTool} avatarUrl={avatarUrl} displayName={displayName} />

        {/* ── Divider ── */}
        <Box sx={{ display:'flex', alignItems:'center', gap:2, mb:3.5 }}>
          <Divider sx={{ flex:1, borderColor:C.border }} />
          <Typography sx={{ color:C.textDim, fontSize:'10.5px', fontWeight:700, whiteSpace:'nowrap', letterSpacing:1.5 }}>
            CHOOSE A TOOL
          </Typography>
          <Divider sx={{ flex:1, borderColor:C.border }} />
        </Box>

        {/* ── Categories ── */}
        <Box sx={{ display:'flex', flexDirection:'column', gap:4 }}>
          {CATEGORIES.map((cat, i) => (
            <CategorySection
              key={cat.id}
              category={cat}
              onSelectTool={onSelectTool}
              sectionIndex={i}
            />
          ))}
        </Box>

        {/* ── Pro tip footer ── */}
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.5 }}>
          <Box sx={{
            mt:4, mb:2, p:2, borderRadius:'14px',
            bgcolor:C.purpleDim, border:`1px solid ${C.purple}22`,
            display:'flex', alignItems:'flex-start', gap:1.5,
          }}>
            <AutoAwesome sx={{ color:C.purple, fontSize:'17px', flexShrink:0, mt:0.2 }} />
            <Typography sx={{ color:C.textMuted, fontSize:'12px', lineHeight:1.65 }}>
              <b style={{ color:C.purple }}>Recommended flow:</b>{' '}
              Start with <b style={{ color:C.text }}>Study Roadmap</b> to build your schedule →
              use <b style={{ color:C.text }}>Cheat Mode</b> for quick revision →
              test yourself with <b style={{ color:C.text }}>Quiz Master</b> →
              and finish with <b style={{ color:C.text }}>Exam Predictor</b> right before the exam.
            </Typography>
          </Box>
        </motion.div>

      </Box>
    </Box>
  );
};

export default AdvancedTools;
