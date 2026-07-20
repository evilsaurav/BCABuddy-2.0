import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, Grid, Button, Avatar, Chip, Divider, Tabs, Tab
} from '@mui/material';
import {
  BugReport, QueryStats, Route, RecordVoiceOver, Quiz, Analytics,
  ArrowBack, Bolt, AutoAwesome, School, Assessment, TrendingUp,
  PlayArrow, ChevronRight, EmojiObjects, Star,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import TiltCard from '../components/TiltCard';
import BackButton from '../components/BackButton';

// ── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:          'rgba(10, 14, 26, 0.98)',
  surface:     'rgba(18, 26, 46, 0.80)',
  border:      'rgba(255,255,255,0.08)',
  cyan:        '#00F0FF',
  cyanDim:     'rgba(0, 240, 255, 0.10)',
  purple:      '#8B5CF6',
  purpleDim:   'rgba(139, 92, 246, 0.10)',
  green:       '#10B981',
  greenDim:    'rgba(16, 185, 129, 0.10)',
  gold:        '#FBBF24',
  goldDim:     'rgba(251, 191, 36, 0.10)',
  text:        '#FFFFFF',
  textMuted:   '#9CA3AF',
  textDim:     'rgba(156, 163, 175, 0.30)',
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
      {
        toolId: 'assignment_evaluator',
        toolKey: 'Assignment Evaluator',
        title: 'Assignment Evaluator',
        subtitle: 'Smart OCR Handwriting Grading',
        description: 'Upload your handwritten answer along with the question. AI will evaluate it like an IGNOU examiner, assign marks, and give actionable feedback.',
        icon: Assessment,
        accent: C.purple,
        accentDim: C.purpleDim,
        badge: 'Smart OCR',
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
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.05, type: 'spring' }}
      whileHover={{ y: -6, scale: 1.02 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{ height: '100%' }}
    >
      <TiltCard onClick={() => onSelectTool(tool)}>
      <Card
        sx={{
          height: '100%',
          minHeight: '260px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: { xs: 2, sm: 2.5 },
          borderRadius: '24px',
          bgcolor: C.surface,
          border: `1px solid ${hovered ? tool.accent + '80' : C.border}`,
          backdropFilter: 'blur(14px)',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: hovered ? `0 0 30px ${tool.accent}40` : 'none',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Hover glow */}
        <Box sx={{
          position: 'absolute', top: -50, right: -50,
          width: 150, height: 150, borderRadius: '50%',
          background: tool.accentDim,
          filter: 'blur(40px)',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.4s',
          pointerEvents: 'none',
        }} />

        {/* Content */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.8 }}>
            <Box sx={{
              p: 1.2, borderRadius: '14px',
              bgcolor: tool.accentDim,
              border: `1px solid ${tool.accent}40`,
              display: 'flex',
            }}>
              <motion.div animate={hovered ? { rotate: [0, -10, 10, 0] } : {}} transition={{ duration: 0.4 }}>
                <Icon sx={{ color: tool.accent, fontSize: '24px' }} />
              </motion.div>
            </Box>
            <Chip
              label={tool.badge}
              size="small"
              sx={{
                height: 22, fontSize: '11px', fontWeight: 800,
                bgcolor: tool.accentDim, color: tool.accent,
                border: `1px solid ${tool.accent}40`,
                '& .MuiChip-label': { px: 1.2 },
              }}
            />
          </Box>

          <Typography sx={{ color: C.text, fontWeight: 800, fontSize: '15px', mb: 0.3, lineHeight: 1.3 }}>
            {tool.title}
          </Typography>
          <Typography sx={{ color: tool.accent, fontSize: '11.5px', fontWeight: 700, mb: 1, opacity: 0.9 }}>
            {tool.subtitle}
          </Typography>
          <Typography sx={{ color: C.textMuted, fontSize: '12px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {tool.description}
          </Typography>
        </Box>

        {/* CTA */}
        <Box sx={{ mt: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Button
            size="small"
            endIcon={<PlayArrow sx={{ fontSize: '14px !important' }} />}
            onClick={(e) => { e.stopPropagation(); onSelectTool(tool); }}
            sx={{
              color: tool.accent,
              bgcolor: tool.accentDim,
              border: `1px solid ${tool.accent}50`,
              fontWeight: 800, fontSize: '12px',
              borderRadius: '999px', px: 2, py: 0.6,
              '&:hover': { bgcolor: tool.accentDim, filter: 'brightness(1.3)' },
            }}
          >
            Launch
          </Button>
          <motion.div animate={hovered ? { x: 5 } : { x: 0 }}>
            <ChevronRight sx={{ color: hovered ? tool.accent : C.textDim, fontSize: '20px', transition: 'color 0.3s' }} />
          </motion.div>
        </Box>
      </Card>
      </TiltCard>
    </motion.div>
  );
}

// ── Pro-Chat Card ────────────────────────────────────────────────────────────
function ProChatCard({ onSelectTool, avatarUrl, displayName }) {
  const quickStart = ALL_TOOLS.find(t => t.toolId === 'study_roadmap') || ALL_TOOLS[0];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Card sx={{
        mb: 4, p: { xs: 2.5, md: 3 },
        borderRadius: '24px',
        background: `linear-gradient(135deg, rgba(0,240,255,0.1) 0%, rgba(139,92,246,0.1) 100%)`,
        border: `1px solid ${C.cyan}40`,
        backdropFilter: 'blur(20px)',
        position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{ position:'absolute', top:-60, right:-60, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle, rgba(0,240,255,0.15), transparent 70%)', pointerEvents:'none' }} />
        <Box sx={{ position:'absolute', bottom:-40, left:-40, width:150, height:150, borderRadius:'50%', background:'radial-gradient(circle, rgba(139,92,246,0.15), transparent 70%)', pointerEvents:'none' }} />

        <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2.5, position: 'relative' }}>
          {/* Avatar */}
          <Box sx={{ position: 'relative', flexShrink: 0 }}>
            <Avatar
              src={avatarUrl || undefined}
              alt={displayName || 'Student'}
              sx={{ width: 60, height: 60, border: `2px solid ${C.cyan}`, boxShadow: `0 0 20px ${C.cyan}50` }}
            >
              {String(displayName || 'S').slice(0, 1).toUpperCase()}
            </Avatar>
            <Box sx={{ position:'absolute', bottom:2, right:2, width:12, height:12, borderRadius:'50%', bgcolor: C.green, border:`2px solid ${C.bg}`, boxShadow:`0 0 8px ${C.green}` }} />
          </Box>

          {/* Info */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.5 }}>
              <Typography sx={{ color: C.text, fontWeight: 900, fontSize: { xs:'18px', md:'22px' } }}>
                APC Pro-Chat
              </Typography>
              <Chip
                icon={<AutoAwesome sx={{ fontSize:'12px !important', color:`${C.cyan} !important` }} />}
                label="EXAM MODE ON"
                size="small"
                sx={{ height:20, fontSize:'10px', fontWeight:800, bgcolor:C.cyanDim, color:C.cyan, border:`1px solid ${C.cyan}50`, '& .MuiChip-label':{ px:1 } }}
              />
            </Box>
            <Typography sx={{ color: C.textMuted, fontSize:'13px', fontWeight: 500 }}>
              All 7 tools active · Fast structured responses · Focused study mode
            </Typography>
          </Box>

          <Button
            onClick={() => onSelectTool(quickStart)}
            startIcon={<PlayArrow sx={{ fontSize:'16px' }} />}
            sx={{
              flexShrink:0, display:{ xs:'none', sm:'flex' },
              color: C.green, border:`1px solid ${C.green}60`,
              bgcolor: C.greenDim, fontWeight:900, fontSize:'13px',
              borderRadius:'999px', px:3, py:1,
              '&:hover':{ bgcolor:C.greenDim, filter:'brightness(1.3)', boxShadow:`0 0 20px ${C.green}40` },
            }}
          >
            Start Now
          </Button>
        </Box>

        <Button
          fullWidth onClick={() => onSelectTool(quickStart)}
          startIcon={<PlayArrow />}
          sx={{
            mt:2.5, display:{ xs:'flex', sm:'none' },
            color:C.green, border:`1px solid ${C.green}60`,
            bgcolor:C.greenDim, fontWeight:900, borderRadius:'999px', py:1,
            '&:hover':{ bgcolor:C.greenDim, filter:'brightness(1.3)' },
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
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    document.body.classList.add('exam-mode-active');
    return () => document.body.classList.remove('exam-mode-active');
  }, []);

  const handleBack = () => {
    document.body.classList.remove('exam-mode-active');
    onBack?.();
  };

  const currentCategory = CATEGORIES[activeTab];

  return (
    <Box sx={{
      flex: 1, overflowY: 'auto',
      minHeight: '100vh',
      bgcolor: C.bg,
      backgroundImage: `
        radial-gradient(circle at 15% 0%, ${C.cyan}15 0%, transparent 40%),
        radial-gradient(circle at 85% 20%, ${C.purple}15 0%, transparent 40%)
      `
    }}>
      <BackButton onClick={handleBack} />
      <Box sx={{ maxWidth: 1100, mx: 'auto', p: { xs: 2, md: 4 } }}>

        {/* ── Top bar ── */}
        <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb:4 }}>
          <Button
            onClick={handleBack}
            startIcon={<ArrowBack />}
            sx={{
              color:C.text, border:`1px solid ${C.border}`,
              bgcolor:C.surface, borderRadius:'999px',
              fontWeight:700, fontSize:'13px', px: 2,
              '&:hover':{ bgcolor:C.border },
            }}
          >
            Dashboard
          </Button>

          <Box sx={{ display:'flex', gap:1.5, flexWrap:'wrap', justifyContent:'flex-end' }}>
            {[
              { icon: EmojiObjects, label: '7 AI Tools', color: C.cyan },
              { icon: Star,         label: 'Exam Mode',  color: C.gold },
            ].map(({ icon: Icon, label, color }) => (
              <Box key={label} sx={{
                display:'flex', alignItems:'center', gap:1,
                px:1.5, py:0.6, borderRadius:'999px',
                bgcolor:`${color}15`, border:`1px solid ${color}30`,
              }}>
                <Icon sx={{ color, fontSize:'14px' }} />
                <Typography sx={{ color, fontSize:'11px', fontWeight:800 }}>{label}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* ── Page title ── */}
        <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }}>
          <Box sx={{ mb:4 }}>
            <Typography sx={{ color:C.text, fontWeight:900, fontSize:{ xs:'24px', md:'32px' }, mb:1 }}>
              Advanced Preparation Center
            </Typography>
            <Typography sx={{ color:C.textMuted, fontSize:'15px', maxWidth: 600 }}>
              AI-powered tools designed to help IGNOU BCA students study smarter, test faster, and score higher.
            </Typography>
          </Box>
        </motion.div>

        {/* ── Pro-Chat card ── */}
        <ProChatCard onSelectTool={onSelectTool} avatarUrl={avatarUrl} displayName={displayName} />

        {/* ── Systematic Tabs ── */}
        <Box sx={{ borderBottom: 1, borderColor: C.border, mb: 4 }}>
          <Tabs 
            value={activeTab} 
            onChange={(_, nv) => setActiveTab(nv)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTabs-indicator': { backgroundColor: CATEGORIES[activeTab].accent, height: 3, borderRadius: '3px 3px 0 0' },
              '& .MuiTab-root': { color: C.textMuted, fontWeight: 700, fontSize: '14px', textTransform: 'none', minWidth: 120 },
              '& .Mui-selected': { color: `${CATEGORIES[activeTab].accent} !important` }
            }}
          >
            {CATEGORIES.map((cat, i) => (
              <Tab 
                key={cat.id} 
                icon={<cat.icon sx={{ fontSize: '20px', mb: '4px !important' }} />} 
                label={cat.label} 
              />
            ))}
          </Tabs>
        </Box>

        {/* ── Category Tools Grid ── */}
        <Box sx={{ minHeight: 400 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Grid container spacing={3}>
                {currentCategory.tools.map((tool, i) => (
                  <Grid item xs={12} sm={6} md={4} key={tool.toolId}>
                    <ToolCard
                      tool={tool}
                      onSelectTool={onSelectTool}
                      index={i}
                    />
                  </Grid>
                ))}
              </Grid>
            </motion.div>
          </AnimatePresence>
        </Box>

      </Box>
    </Box>
  );
};

export default AdvancedTools;
