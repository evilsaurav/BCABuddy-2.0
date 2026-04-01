import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  Grid,
  Avatar,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';

const AdvancedTools = ({ onBack, onSelectTool, avatarUrl, displayName }) => {
  const [activeTool, setActiveTool] = useState(null);
  const [formData, setFormData] = useState({ subjects: '', days_left: '', daily_hours: '' });
  const [loading, setLoading] = useState(false);
  const [studyPlan, setStudyPlan] = useState(null);

  const handleGeneratePlan = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/generate-study-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      setStudyPlan(data.study_plan);
    } catch (error) {
      console.error('Error generating study plan:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.body.classList.add('exam-mode-active');
    return () => document.body.classList.remove('exam-mode-active');
  }, []);

  const tools = [
    {
      id: 'study_roadmap',
      title: 'Study Roadmap',
      description: 'Personalized study plans for your semester.',
    },
    {
      id: 'cheat_mode',
      title: 'Cheat Mode',
      description: 'Quick revision with flashcards.',
    },
    {
      id: 'quiz_master',
      title: 'Quiz Master',
      description: 'Generate quizzes from your notes.',
    },
  ];

  if (activeTool === 'study_roadmap') {
    return (
      <Box sx={{ p: 3, backgroundColor: '#121212', color: '#fff', minHeight: '100vh' }}>
        <Button onClick={() => setActiveTool(null)} sx={{ color: '#03dac6', mb: 2 }}>
          Back to Tools
        </Button>

        {!studyPlan ? (
          <Box>
            <Typography variant="h5" gutterBottom>
              Generate Your Study Roadmap
            </Typography>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleGeneratePlan();
              }}
            >
              <input
                type="text"
                placeholder="Subjects (e.g., BCS12, MCS202)"
                value={formData.subjects}
                onChange={(e) => setFormData({ ...formData, subjects: e.target.value })}
              />
              <input
                type="number"
                placeholder="Days Left"
                value={formData.days_left}
                onChange={(e) => setFormData({ ...formData, days_left: e.target.value })}
              />
              <input
                type="number"
                placeholder="Daily Hours"
                value={formData.daily_hours}
                onChange={(e) => setFormData({ ...formData, daily_hours: e.target.value })}
              />
              <button type="submit" disabled={loading}>
                {loading ? 'Generating...' : 'Generate Plan'}
              </button>
            </form>
          </Box>
        ) : (
          <Box>
            <Typography variant="h5" gutterBottom>
              Your Study Plan
            </Typography>
            {studyPlan.map((day, index) => (
              <Box key={index}>
                <Typography>Day {day.day}</Typography>
                <Typography>Focus Subject: {day.focus_subject}</Typography>
                <Typography>Topics: {day.topics_to_cover.join(', ')}</Typography>
                <Typography>Hours: {day.allocated_hours}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: '#121212', color: '#fff', minHeight: '100vh' }}>
      <Button onClick={onBack} sx={{ color: '#03dac6', mb: 2 }}>
        Back to Dashboard
      </Button>

      <Typography variant="h4" gutterBottom>
        Advanced Preparation Center
      </Typography>

      <Typography variant="subtitle1" gutterBottom>
        Welcome, {displayName || 'Student'}! Explore the tools below:
      </Typography>

      <Grid container spacing={3}>
        {tools.map((tool) => (
          <Grid item xs={12} sm={6} md={4} key={tool.id}>
            <Card
              sx={{
                p: 2,
                backgroundColor: '#1e1e1e',
                color: '#fff',
                cursor: 'pointer',
                '&:hover': {
                  boxShadow: '0 0 10px #03dac6',
                },
              }}
              onClick={() => setActiveTool(tool.id)}
            >
              <Typography variant="h6">{tool.title}</Typography>
              <Typography variant="body2" color="textSecondary">
                {tool.description}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default AdvancedTools;