import React, { useState } from 'react';
import { Box, Typography, Button, CircularProgress, Card, IconButton } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import FlipCameraAndroidIcon from '@mui/icons-material/FlipCameraAndroid';

const GLASS_BG = 'rgba(30, 41, 59, 0.5)';
const NEON_CYAN = '#03dac6';
const NEON_PURPLE = '#bb86fc';

const FlashcardTool = ({ API_BASE, semester, subject, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [flashcards, setFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [error, setError] = useState('');

  const generateFlashcards = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/apc/flashcards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ semester, subject })
      });
      if (!res.ok) throw new Error('Failed to generate flashcards');
      const data = await res.json();
      if (data.flashcards && data.flashcards.length > 0) {
        setFlashcards(data.flashcards);
        setCurrentIndex(0);
        setIsFlipped(false);
      } else {
        throw new Error('No flashcards returned from AI');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % flashcards.length);
    }, 150);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
    }, 150);
  };

  if (flashcards.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h5" sx={{ color: '#fff', mb: 2, fontWeight: 700 }}>
          AI Flashcards for {subject}
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.7)', mb: 4 }}>
          Generate 10-12 highly important concepts tailored to your exams.
        </Typography>
        {error && <Typography sx={{ color: '#ff6b6b', mb: 2 }}>{error}</Typography>}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button variant="outlined" onClick={onBack} sx={{ color: '#fff' }}>Back</Button>
          <Button 
            variant="contained" 
            onClick={generateFlashcards}
            disabled={loading}
            sx={{ bgcolor: NEON_CYAN, color: '#000', fontWeight: 800 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Generate Flashcards'}
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto', textAlign: 'center' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Button onClick={onBack} sx={{ color: '#fff' }}>&larr; Exit</Button>
        <Typography sx={{ color: NEON_PURPLE, fontWeight: 700 }}>
          {currentIndex + 1} / {flashcards.length}
        </Typography>
      </Box>

      <Box sx={{ perspective: 1000, width: '100%', height: 350, position: 'relative', mb: 4 }}>
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={currentIndex + (isFlipped ? '-back' : '-front')}
            initial={{ rotateY: isFlipped ? -90 : 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: isFlipped ? 90 : -90, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ width: '100%', height: '100%', position: 'absolute' }}
          >
            <Card
              onClick={() => setIsFlipped(!isFlipped)}
              sx={{
                width: '100%',
                height: '100%',
                bgcolor: isFlipped ? 'rgba(3, 218, 198, 0.05)' : GLASS_BG,
                border: `1px solid ${isFlipped ? NEON_CYAN : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 4,
                cursor: 'pointer',
                boxShadow: isFlipped ? `0 0 20px ${NEON_CYAN}40` : 'none'
              }}
            >
              {!isFlipped ? (
                <>
                  <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, mb: 2 }}>
                    Question / Term
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#fff', fontWeight: 800 }}>
                    {flashcards[currentIndex].term}
                  </Typography>
                </>
              ) : (
                <>
                  <Typography sx={{ color: NEON_CYAN, fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, mb: 2 }}>
                    Answer / Definition
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#E6EAF0', fontWeight: 500, lineHeight: 1.6 }}>
                    {flashcards[currentIndex].definition}
                  </Typography>
                </>
              )}
              <FlipCameraAndroidIcon sx={{ position: 'absolute', bottom: 16, right: 16, color: 'rgba(255,255,255,0.2)' }} />
            </Card>
          </motion.div>
        </AnimatePresence>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, alignItems: 'center' }}>
        <IconButton onClick={handlePrev} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' }}>
          <ArrowBackIosNewIcon />
        </IconButton>
        <Button onClick={() => setIsFlipped(!isFlipped)} variant="outlined" sx={{ color: NEON_CYAN, borderColor: NEON_CYAN }}>
          FLIP CARD
        </Button>
        <IconButton onClick={handleNext} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' }}>
          <ArrowForwardIosIcon />
        </IconButton>
      </Box>
    </Box>
  );
};

export default FlashcardTool;
