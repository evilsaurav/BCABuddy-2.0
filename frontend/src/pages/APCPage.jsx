import React, { useState } from 'react';
import { Box, Button, Card, Typography, Grid, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import FlashcardTool from '../components/FlashcardTool';
import { SEMESTERS, SUBJECTS } from '../utils/subjects';
import { API_BASE } from '../utils/apiConfig';

const GLASS_BG = 'rgba(18, 28, 52, 0.78)';
const GLASS_BORDER = '1px solid rgba(255, 255, 255, 0.12)';
const NEON_CYAN = '#03dac6';
const NEON_PURPLE = '#bb86fc';

const APCPage = () => {
  const navigate = useNavigate();
  const [activeTool, setActiveTool] = useState(null);
  
  // State for Flashcards
  const [semester, setSemester] = useState('Sem 1');
  const [subject, setSubject] = useState(SUBJECTS['Sem 1'][0]);

  const handleSemesterChange = (e) => {
    const sem = e.target.value;
    setSemester(sem);
    if (SUBJECTS[sem] && SUBJECTS[sem].length > 0) {
      setSubject(SUBJECTS[sem][0]);
    } else {
      setSubject('');
    }
  };

  const renderDashboard = () => (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 900, background: `linear-gradient(135deg, ${NEON_PURPLE}, ${NEON_CYAN})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Advance Preparation Center
        </Typography>
        <Typography sx={{ mt: 1, color: 'rgba(255,255,255,0.7)', fontSize: 16 }}>
          Your systematic hub for mastering exams. Choose a tool to begin.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Tool 1: Exam Simulator */}
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, borderRadius: '18px', bgcolor: GLASS_BG, border: GLASS_BORDER, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#fff', mb: 1 }}>📝 Exam Simulator</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', mb: 3, flexGrow: 1, fontSize: 14 }}>
              Take a full, timed, AI-generated mock exam specifically tailored to your syllabus to test your readiness.
            </Typography>
            <Button variant="contained" onClick={() => navigate('/exam-simulation')} sx={{ bgcolor: NEON_CYAN, color: '#000', fontWeight: 700 }}>
              Start Simulation
            </Button>
          </Card>
        </Grid>

        {/* Tool 2: AI Flashcards */}
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, borderRadius: '18px', bgcolor: GLASS_BG, border: GLASS_BORDER, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#fff', mb: 1 }}>🃏 AI Flashcards</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', mb: 3, flexGrow: 1, fontSize: 14 }}>
              Instantly generate high-yield concepts and definitions for any subject to memorize key terms fast.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <FormControl size="small" fullWidth sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}>
                <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Sem</InputLabel>
                <Select value={semester} onChange={handleSemesterChange} label="Sem">
                  {SEMESTERS.map(sem => <MenuItem key={sem} value={sem}>{sem}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}>
                <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Sub</InputLabel>
                <Select value={subject} onChange={(e) => setSubject(e.target.value)} label="Sub">
                  {(SUBJECTS[semester] || []).map(sub => <MenuItem key={sub} value={sub}>{sub}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
            <Button variant="contained" onClick={() => setActiveTool('flashcards')} sx={{ bgcolor: NEON_PURPLE, color: '#fff', fontWeight: 700 }} disabled={!subject}>
              Generate Cards
            </Button>
          </Card>
        </Grid>

        {/* Tool 3: Study Roadmap */}
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, borderRadius: '18px', bgcolor: GLASS_BG, border: GLASS_BORDER, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#fff', mb: 1 }}>🗺️ Study Roadmaps</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', mb: 3, flexGrow: 1, fontSize: 14 }}>
              Generate custom, day-by-step timelines tailored to your specific subjects and current preparation level.
            </Typography>
            <Button variant="outlined" onClick={() => navigate('/dashboard')} sx={{ color: NEON_CYAN, borderColor: NEON_CYAN, fontWeight: 700 }}>
              Go to Roadmap
            </Button>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#090f1f',
        color: '#E6EAF0',
        p: { xs: 2, md: 4 },
      }}
    >
      <BackButton />
      {activeTool === 'flashcards' ? (
        <FlashcardTool 
          API_BASE={API_BASE} 
          semester={semester} 
          subject={subject} 
          onBack={() => setActiveTool(null)} 
        />
      ) : (
        renderDashboard()
      )}
    </Box>
  );
};

export default APCPage;
