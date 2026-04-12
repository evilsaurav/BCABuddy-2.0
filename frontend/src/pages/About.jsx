import React from 'react';
import { Box, Button, Card, Chip, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import BrandLogo from '../components/BrandLogo';

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
        color: '#0f172a',
        p: { xs: 2, md: 3.5 },
        background: 'linear-gradient(135deg, #fef7ff 0%, #e0f2fe 42%, #ecfeff 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: '-160px',
          right: '-120px',
          width: 360,
          height: 360,
          borderRadius: '999px',
          background: 'radial-gradient(circle, rgba(14,165,233,0.22), rgba(14,165,233,0))',
          filter: 'blur(4px)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '-120px',
          left: '-120px',
          width: 320,
          height: 320,
          borderRadius: '999px',
          background: 'radial-gradient(circle, rgba(244,114,182,0.2), rgba(244,114,182,0))',
          filter: 'blur(4px)',
          pointerEvents: 'none',
        }}
      />
      <BackButton />
      <Box sx={{ maxWidth: 980, mx: 'auto' }}>
        <Card
          component={motion.div}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          sx={{
            p: { xs: 2.3, md: 3.4 },
            borderRadius: '24px',
            bgcolor: 'rgba(255, 255, 255, 0.84)',
            border: '1px solid rgba(15, 23, 42, 0.08)',
            backdropFilter: 'blur(14px)',
            boxShadow: '0 16px 45px rgba(2, 8, 23, 0.12)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, flexWrap: 'wrap', gap: 1.5 }}>
            <BrandLogo imgHeight={72} />
            <Chip
              label="Built for IGNOU BCA"
              sx={{
                bgcolor: 'rgba(14,165,233,0.12)',
                color: '#0c4a6e',
                border: '1px solid rgba(14,165,233,0.28)',
                fontWeight: 700,
              }}
            />
          </Box>

          <Typography sx={{ fontSize: { xs: 29, md: 36 }, fontWeight: 900, color: '#0f172a', mt: 1.8, mb: 1.2 }}>
            Not another boring study app.
          </Typography>
          <Typography sx={{ fontSize: { xs: 17, md: 20 }, fontWeight: 700, color: '#0369a1', mb: 2.2 }}>
            This is your high-energy AI prep zone.
          </Typography>

          <Typography sx={{ color: 'rgba(15, 23, 42, 0.84)', lineHeight: 1.85, mb: 2 }}>
            Navigating through a Bachelor of Computer Applications (BCA) degree can be overwhelming. Between decoding vast syllabuses, managing assignments, preparing for term-end exams, and figuring out how to clear backlogs, students often find themselves lost without a clear direction.
          </Typography>

          <Typography sx={{ color: 'rgba(15, 23, 42, 0.84)', lineHeight: 1.85, mb: 3 }}>
            That's exactly why BCABuddy was created.
          </Typography>

          <Typography sx={{ color: '#0ea5e9', fontWeight: 800, fontSize: 22, mb: 1.1 }}>
            Our Vision
          </Typography>
          <Typography sx={{ color: 'rgba(15, 23, 42, 0.84)', lineHeight: 1.85, mb: 3 }}>
            We believe that every student deserves a personalized, stress-free learning experience. Our vision is to bridge the gap between hard work and smart work by bringing advanced Artificial Intelligence directly to a student's study desk. We want to transform the way BCA students prepare, helping them transition from panicked cramming to structured, confident learning.
          </Typography>

          <Typography sx={{ color: '#0ea5e9', fontWeight: 800, fontSize: 22, mb: 1.1 }}>
            What We Do
          </Typography>
          <Typography sx={{ color: 'rgba(15, 23, 42, 0.84)', lineHeight: 1.85, mb: 1.2 }}>
            BCABuddy is not just another study app; it is an intelligent student assistant built to understand your unique academic needs. Powered by state-of-the-art AI (including Groq and advanced language models), BCABuddy offers:
          </Typography>

          <Box sx={{ pl: 1, mb: 3 }}>
            <Typography sx={{ color: 'rgba(15, 23, 42, 0.84)', lineHeight: 1.85, mb: 0.6 }}>
              • The Advance Preparation Center: A dedicated hub to strategize your exams.
            </Typography>
            <Typography sx={{ color: 'rgba(15, 23, 42, 0.84)', lineHeight: 1.85, mb: 0.6 }}>
              • Interactive Study Roadmaps: Generate custom, day-by-step timelines tailored to your specific subjects, current preparation level, and goals.
            </Typography>
            <Typography sx={{ color: 'rgba(15, 23, 42, 0.84)', lineHeight: 1.85 }}>
              • Targeted Backlog Support: Specialized planning to help you confidently tackle and clear back papers without derailing your current semester.
            </Typography>
          </Box>

          <Typography sx={{ color: '#0ea5e9', fontWeight: 800, fontSize: 22, mb: 1.1 }}>
            The Story Behind BCABuddy
          </Typography>
          <Typography sx={{ color: 'rgba(15, 23, 42, 0.84)', lineHeight: 1.85, mb: 2.2 }}>
            BCABuddy wasn't built in a corporate boardroom. It was born out of real student experiences, late-night coding sessions, and the genuine desire to solve the everyday academic struggles faced by BCA students. Built by Saurav, with the constant support and inspiration of Jiya, this platform is a passion project designed by a student, for the students.
          </Typography>

          <Typography sx={{ color: '#0f172a', fontWeight: 700, lineHeight: 1.85, mb: 2.6 }}>
            We know the journey is tough, but with BCABuddy, you don't have to walk it alone. Let's build your success roadmap together.
          </Typography>

          <Button
            variant="contained"
            onClick={goBack}
            sx={{
              bgcolor: '#0ea5e9',
              color: '#ffffff',
              fontWeight: 800,
              borderRadius: '12px',
              '&:hover': { bgcolor: '#0284c7' },
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
