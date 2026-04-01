import React, { useEffect } from 'react';
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

  return (
    <Box sx={{ p: 3, backgroundColor: '#121212', color: '#fff', minHeight: '100vh' }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={onBack}
        sx={{ color: '#03dac6', mb: 2 }}
      >
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
              onClick={() => onSelectTool(tool)}
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