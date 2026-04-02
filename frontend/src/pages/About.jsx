import React from 'react';
import { Box, Button, Card, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const About = () => {
  const navigate = useNavigate();

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#090f1f',
        color: '#E6EAF0',
        p: { xs: 2, md: 3 },
      }}
    >
      <Box sx={{ maxWidth: 980, mx: 'auto' }}>
        <Card
          sx={{
            p: { xs: 2.2, md: 3.2 },
            borderRadius: '18px',
            bgcolor: 'rgba(18, 28, 52, 0.78)',
            border: '1px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Typography sx={{ fontSize: { xs: 28, md: 32 }, fontWeight: 900, color: '#03dac6', mb: 1.2 }}>
            🎓 About BCABuddy
          </Typography>
          <Typography sx={{ fontSize: { xs: 17, md: 19 }, fontWeight: 700, mb: 2.2 }}>
            Your Personal AI Study Companion
          </Typography>

          <Typography sx={{ opacity: 0.9, lineHeight: 1.9, mb: 2 }}>
            Navigating through a Bachelor of Computer Applications (BCA) degree can be overwhelming. Between decoding vast syllabuses, managing assignments, preparing for term-end exams, and figuring out how to clear backlogs, students often find themselves lost without a clear direction.
          </Typography>

          <Typography sx={{ opacity: 0.9, lineHeight: 1.9, mb: 3 }}>
            That's exactly why BCABuddy was created.
          </Typography>

          <Typography sx={{ color: '#03dac6', fontWeight: 800, fontSize: 22, mb: 1.1 }}>
            Our Vision
          </Typography>
          <Typography sx={{ opacity: 0.9, lineHeight: 1.9, mb: 3 }}>
            We believe that every student deserves a personalized, stress-free learning experience. Our vision is to bridge the gap between hard work and smart work by bringing advanced Artificial Intelligence directly to a student's study desk. We want to transform the way BCA students prepare, helping them transition from panicked cramming to structured, confident learning.
          </Typography>

          <Typography sx={{ color: '#03dac6', fontWeight: 800, fontSize: 22, mb: 1.1 }}>
            What We Do
          </Typography>
          <Typography sx={{ opacity: 0.9, lineHeight: 1.9, mb: 1.2 }}>
            BCABuddy is not just another study app; it is an intelligent student assistant built to understand your unique academic needs. Powered by state-of-the-art AI (including Groq and advanced language models), BCABuddy offers:
          </Typography>

          <Box sx={{ pl: 1, mb: 3 }}>
            <Typography sx={{ opacity: 0.9, lineHeight: 1.85, mb: 0.6 }}>
              • The Advance Preparation Center: A dedicated hub to strategize your exams.
            </Typography>
            <Typography sx={{ opacity: 0.9, lineHeight: 1.85, mb: 0.6 }}>
              • Interactive Study Roadmaps: Generate custom, day-by-step timelines tailored to your specific subjects, current preparation level, and goals.
            </Typography>
            <Typography sx={{ opacity: 0.9, lineHeight: 1.85 }}>
              • Targeted Backlog Support: Specialized planning to help you confidently tackle and clear back papers without derailing your current semester.
            </Typography>
          </Box>

          <Typography sx={{ color: '#03dac6', fontWeight: 800, fontSize: 22, mb: 1.1 }}>
            The Story Behind BCABuddy
          </Typography>
          <Typography sx={{ opacity: 0.9, lineHeight: 1.9, mb: 2.2 }}>
            BCABuddy wasn't built in a corporate boardroom. It was born out of real student experiences, late-night coding sessions, and the genuine desire to solve the everyday academic struggles faced by BCA students. Built by Saurav, with the constant support and inspiration of Jiya, this platform is a passion project designed by a student, for the students.
          </Typography>

          <Typography sx={{ fontWeight: 700, lineHeight: 1.9, mb: 2.6 }}>
            We know the journey is tough, but with BCABuddy, you don't have to walk it alone. Let's build your success roadmap together.
          </Typography>

          <Button
            variant="outlined"
            onClick={goBack}
            sx={{
              borderColor: 'rgba(3,218,198,0.6)',
              color: '#03dac6',
              fontWeight: 800,
              '&:hover': { borderColor: '#03dac6', backgroundColor: 'rgba(3,218,198,0.08)' },
            }}
          >
            Back
          </Button>
        </Card>
      </Box>
    </Box>
  );
};

export default About;
