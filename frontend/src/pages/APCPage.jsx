import React from 'react';
import { Box, Button, Card, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';

const APCPage = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#090f1f',
        color: '#E6EAF0',
        p: { xs: 2, md: 3 },
      }}
    >
      <BackButton />
      <Box sx={{ maxWidth: 980, mx: 'auto' }}>
        <Card
          sx={{
            p: 3,
            borderRadius: '18px',
            bgcolor: 'rgba(18, 28, 52, 0.78)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#03dac6' }}>
            Advanced Preparation Center
          </Typography>
          <Typography sx={{ mt: 1, opacity: 0.82 }}>
            Dedicated APC workspace. Start a full exam simulation from here.
          </Typography>

          <Box sx={{ display: 'flex', gap: 1.5, mt: 3, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              onClick={() => navigate('/exam-simulation')}
              sx={{ bgcolor: '#03dac6', color: '#031417', fontWeight: 800 }}
            >
              Open Exam Simulation
            </Button>
            <Button variant="outlined" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </Box>
        </Card>
      </Box>
    </Box>
  );
};

export default APCPage;
