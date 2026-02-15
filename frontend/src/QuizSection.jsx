/**
 * QuizSection - Quick Practice Quiz (5-10 questions)
 * Instant feedback mode with immediate answer verification
 */

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Card, Radio, RadioGroup, FormControlLabel,
  CircularProgress, Alert, Select, MenuItem, FormControl, InputLabel, Chip
} from '@mui/material';
import { CheckCircle, Cancel, Home, Refresh, Assignment, BarChart } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { downloadResultPDF } from './utils/pdfExport';
import { normalizeChoice, resolveCorrectAnswerText, isAnswerCorrect } from './utils/answerNormalization';
import BackButton from './components/BackButton';

const NEON_PURPLE = '#bb86fc';
const NEON_CYAN = '#03dac6';
const GLASS_BG = 'rgba(30, 41, 59, 0.5)';
const GLASS_BORDER = '1px solid rgba(255, 255, 255, 0.1)';
const QUIZ_ATTEMPTS_KEY = 'bcabuddy_quiz_attempts';
const REVIEW_STORAGE_KEY = 'bcabuddy_review_items';
const WEAK_TOPICS_KEY = 'bcabuddy_weak_topics';

const SEMESTERS = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6'];
const SUBJECTS = {
  'Sem 1': ['BCS-011', 'MCS-011', 'BCS-012'],
  'Sem 2': ['MCS-011', 'MCS-012', 'MCS-015', 'ECO-02'],
  'Sem 3': ['MCS-021', 'MCS-023', 'BCS-031', 'MCS-014'],
  'Sem 4': ['MCS-024', 'BCS-040', 'BCS-041', 'BCS-042'],
  'Sem 5': ['BCS-051', 'BCS-052', 'BCS-053', 'BCS-054'],
  'Sem 6': ['BCS-062', 'MCS-022', 'BCS-092']
};

const QuizSection = ({ onClose, API_BASE }) => {
  const [semester, setSemester] = useState('');
  const [subject, setSubject] = useState('');
  const [quizData, setQuizData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [reviewMode, setReviewMode] = useState(false); // Toggle between results and review
  const [userAnswers, setUserAnswers] = useState({}); // Track all user answers

  const safeParse = (raw, fallback) => {
    try {
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  };

  const readReviewItems = () => {
    const items = safeParse(localStorage.getItem(REVIEW_STORAGE_KEY), []);
    return Array.isArray(items) ? items : [];
  };

  const writeReviewItems = (items) => {
    try {
      localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      // ignore
    }
  };

  const upsertReviewItem = (item) => {
    const items = readReviewItems();
    const filtered = items.filter((i) => i?.id !== item.id);
    writeReviewItems([item, ...filtered].slice(0, 200));
  };

  const readWeakTopics = () => {
    const items = safeParse(localStorage.getItem(WEAK_TOPICS_KEY), []);
    return Array.isArray(items) ? items : [];
  };

  const writeWeakTopics = (items) => {
    try {
      localStorage.setItem(WEAK_TOPICS_KEY, JSON.stringify(items));
    } catch (e) {
      // ignore
    }
  };

  const getTopicKey = (questionText) => {
    const text = String(questionText || '').trim();
    if (!text) return 'general';
    return text.split(/\s+/).slice(0, 6).join(' ');
  };

  const updateWeakTopic = (topic, source) => {
    const now = Date.now();
    const items = readWeakTopics();
    const key = `${subject || ''}__${topic}`;
    const existing = items.find((i) => i?.key === key);
    const lastInterval = Number(existing?.last_interval || 3);
    const nextInterval = existing ? lastInterval * 2 : 3;
    const dueAt = now + nextInterval * 24 * 60 * 60 * 1000;
    const updated = {
      key,
      topic,
      subject,
      source,
      last_interval: nextInterval,
      due_at: new Date(dueAt).toISOString(),
      updated_at: new Date(now).toISOString(),
    };
    const next = [updated, ...items.filter((i) => i?.key !== key)].slice(0, 200);
    writeWeakTopics(next);
  };

  const loadQuiz = async () => {
    if (!semester || !subject) {
      alert('Please select semester and subject');
      return;
    }

    setLoading(true);
    try {
      // Convert "Sem 1" to 1, "Sem 2" to 2, etc. using regex
      const semesterInt = parseInt(semester.replace(/\D/g, ''), 10);
      
      const res = await fetch(`${API_BASE}/generate-quiz`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ semester: semesterInt, subject, count: 10 })
      });

      if (!res.ok) throw new Error('Failed to load quiz');

      const data = await res.json();
      const questions = Array.isArray(data) ? data : data.questions || [];
      setQuizData(questions.slice(0, 10));
      setCurrentIndex(0);
      setScore(0);
      setQuizCompleted(false);
    } catch (error) {
      console.error('Quiz load error:', error);
      alert('Failed to load quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSubmit = (answerValue = selectedAnswer) => {
    if (!answerValue) return;

    const currentQuestion = quizData[currentIndex];
    const isCorrect = isAnswerCorrect(answerValue, currentQuestion);
    
    // Store user answer
    setUserAnswers(prev => ({
      ...prev,
      [currentIndex]: answerValue
    }));
    
    if (isCorrect) {
      setScore(score + 1);
    }
    
    setShowFeedback(true);
    
    // Auto-advance after 2 seconds
    setTimeout(() => {
      if (currentIndex < quizData.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setSelectedAnswer('');
        setShowFeedback(false);
      } else {
        setQuizCompleted(true);
      }
    }, 2000);
  };

  useEffect(() => {
    if (!quizCompleted || quizData.length === 0) return;

    const attempt = {
      score,
      total: quizData.length,
      percent: quizData.length > 0 ? Math.round((score / quizData.length) * 100) : 0,
      subject,
      semester,
      at: new Date().toISOString(),
    };

    const existing = safeParse(localStorage.getItem(QUIZ_ATTEMPTS_KEY), []);
    const attempts = Array.isArray(existing) ? existing : [];
    localStorage.setItem(QUIZ_ATTEMPTS_KEY, JSON.stringify([...attempts, attempt]));

    const runId = `quiz_${Date.now()}`;
    quizData.forEach((question, idx) => {
      const userAnswer = userAnswers[idx];
      const attempted = userAnswer !== undefined && userAnswer !== null && String(userAnswer).trim() !== '';
      const correctText = resolveCorrectAnswerText(question);
      const isCorrect = attempted ? isAnswerCorrect(userAnswer, question) : false;
      if (attempted && isCorrect) return;

      const topicKey = getTopicKey(question?.question);
      upsertReviewItem({
        id: `${runId}_mcq_${idx}`,
        type: 'mcq',
        subject,
        semester,
        question: String(question?.question || ''),
        user_answer: attempted ? String(userAnswer) : 'Not Attempted',
        supreme_answer: String(correctText || ''),
        tip: `Revise ${topicKey} and solve 5 MCQs.`,
        at: new Date().toISOString(),
      });
      updateWeakTopic(topicKey, 'quiz-mcq');
    });
  }, [quizCompleted, quizData, score, subject, semester, userAnswers]);

  const resetQuiz = () => {
    setQuizData([]);
    setCurrentIndex(0);
    setScore(0);
    setQuizCompleted(false);
    setSelectedAnswer('');
    setShowFeedback(false);
    setReviewMode(false);
    setUserAnswers({});
  };

  const getRemarks = () => {
    const percentage = (score / quizData.length) * 100;
    if (percentage === 100) return { emoji: '🔥', text: 'Perfect Score! Genius vibes!' };
    if (percentage >= 80) return { emoji: '😎', text: 'Killing it! Keep going!' };
    if (percentage >= 60) return { emoji: '👍', text: 'Good job! Thoda aur practice!' };
    return { emoji: '📚', text: 'Padhai kar bhai! Practice more!' };
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', bgcolor: 'rgba(10, 13, 23, 0.95)' }}>
        <BackButton />
        <CircularProgress sx={{ color: NEON_CYAN }} />
      </Box>
    );
  }

  if (quizCompleted) {
    const remarks = getRemarks();
    
    // Review Mode - Show Answer Breakdown
    if (reviewMode) {
      return (
        <Box sx={{ p: 4, height: '100vh', bgcolor: 'rgba(10, 13, 23, 0.95)', overflowY: 'auto' }}>
          <BackButton />
          <Card sx={{ maxWidth: 800, mx: 'auto', p: 4, bgcolor: GLASS_BG, border: GLASS_BORDER, borderRadius: '16px' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography sx={{ fontSize: '24px', fontWeight: 700, color: NEON_CYAN }}>
                📖 Answer Review
              </Typography>
              <Button onClick={() => setReviewMode(false)} sx={{ color: NEON_PURPLE, textTransform: 'none', fontWeight: 600 }}>
                ← Back
              </Button>
            </Box>

            {/* Review List */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {quizData.map((question, idx) => {
                const userAnswer = userAnswers[idx];
                const correctText = resolveCorrectAnswerText(question);
                const isCorrect = normalizeChoice(userAnswer) === normalizeChoice(correctText);
                const isAttempted = userAnswer !== undefined;

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card sx={{
                      bgcolor: 'rgba(255, 255, 255, 0.05)',
                      border: `2px solid ${
                        !isAttempted ? 'rgba(255, 255, 255, 0.1)' :
                        isCorrect ? '#4CAF50' : '#ff6b6b'
                      }`,
                      borderRadius: '12px',
                      p: 2,
                      mb: 1
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Chip
                          label={`Q${idx + 1}`}
                          sx={{
                            bgcolor: isCorrect ? '#4CAF5030' : isAttempted ? '#ff6b6b30' : 'rgba(255, 255, 255, 0.1)',
                            color: isCorrect ? '#4CAF50' : isAttempted ? '#ff6b6b' : '#E6EAF0',
                            fontWeight: 600
                          }}
                        />
                        <Typography sx={{ color: '#E6EAF0', fontSize: '14px', flex: 1, fontWeight: 500 }}>
                          {question.question}
                        </Typography>
                        <Typography sx={{
                          fontSize: '18px',
                          color: isCorrect ? '#4CAF50' : isAttempted ? '#ff6b6b' : 'rgba(255, 255, 255, 0.5)'
                        }}>
                          {!isAttempted ? '—' : isCorrect ? '✅' : '❌'}
                        </Typography>
                      </Box>

                      {/* Options */}
                      {question.options?.map((option, optIdx) => {
                        const isUserSelected = normalizeChoice(userAnswer) === normalizeChoice(option);
                        const isCorrectOption = normalizeChoice(option) === normalizeChoice(correctText);
                        let bgColor = 'transparent';
                        let borderColor = 'rgba(255, 255, 255, 0.1)';
                        let textColor = '#E6EAF0';

                        if (isCorrectOption) {
                          bgColor = '#4CAF5015';
                          borderColor = '#4CAF50';
                          textColor = '#4CAF50';
                        } else if (isUserSelected && !isCorrect) {
                          bgColor = '#ff6b6b15';
                          borderColor = '#ff6b6b';
                          textColor = '#ff6b6b';
                        }

                        return (
                          <Box
                            key={optIdx}
                            sx={{
                              p: 1.5,
                              mb: 1,
                              borderRadius: '8px',
                              border: `1px solid ${borderColor}`,
                              bgcolor: bgColor,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              transition: 'all 200ms'
                            }}
                          >
                            <Radio
                              checked={isUserSelected}
                              disabled
                              size="small"
                              sx={{ color: textColor }}
                            />
                            <Typography sx={{ fontSize: '13px', color: textColor, flex: 1, fontWeight: 500 }}>
                              {option}
                            </Typography>
                            {isCorrectOption && <Typography sx={{ color: '#4CAF50', fontSize: '12px', fontWeight: 600 }}>✓</Typography>}
                            {isUserSelected && !isCorrect && <Typography sx={{ color: '#ff6b6b', fontSize: '12px', fontWeight: 600 }}>✗</Typography>}
                          </Box>
                        );
                      })}
                    </Card>
                  </motion.div>
                );
              })}
            </Box>

            {/* Footer */}
            <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button onClick={() => setReviewMode(false)} startIcon={<BarChart />} sx={{ bgcolor: GLASS_BG, color: NEON_CYAN, border: GLASS_BORDER, fontWeight: 600 }}>
                View Summary
              </Button>
              <Button onClick={onClose} startIcon={<Home />} sx={{ bgcolor: NEON_CYAN, color: '#000', fontWeight: 600 }}>
                Dashboard
              </Button>
            </Box>
          </Card>
        </Box>
      );
    }

    // Summary View
    return (
      <Box id="quiz-results-dashboard" sx={{ p: 4, height: '100vh', bgcolor: 'rgba(10, 13, 23, 0.95)', overflowY: 'auto' }}>
        <BackButton />
        <Card sx={{ maxWidth: 600, mx: 'auto', p: 4, bgcolor: GLASS_BG, border: GLASS_BORDER, borderRadius: '16px', textAlign: 'center' }}>
          <Typography sx={{ fontSize: '48px', mb: 2 }}>{remarks.emoji}</Typography>
          <Typography sx={{ fontSize: '32px', fontWeight: 700, color: NEON_CYAN, mb: 1 }}>
            {score}/{quizData.length}
          </Typography>
          <Typography sx={{ fontSize: '18px', color: '#E6EAF0', mb: 3 }}>
            {remarks.text}
          </Typography>
          
          {/* Stats Grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
            <Box sx={{ bgcolor: '#4CAF5015', p: 2, borderRadius: '12px', borderLeft: '3px solid #4CAF50' }}>
              <Typography sx={{ color: '#4CAF50', fontSize: '24px', fontWeight: 700 }}>{score}</Typography>
              <Typography sx={{ color: '#E6EAF0', fontSize: '12px' }}>Correct</Typography>
            </Box>
            <Box sx={{ bgcolor: '#ff6b6b15', p: 2, borderRadius: '12px', borderLeft: '3px solid #ff6b6b' }}>
              <Typography sx={{ color: '#ff6b6b', fontSize: '24px', fontWeight: 700 }}>{quizData.length - score}</Typography>
              <Typography sx={{ color: '#E6EAF0', fontSize: '12px' }}>Wrong</Typography>
            </Box>
          </Box>

          {/* Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button startIcon={<Assignment />} onClick={() => setReviewMode(true)} sx={{ bgcolor: NEON_PURPLE, color: '#fff', fontWeight: 600 }}>
              Review Answers
            </Button>
            <Button
              startIcon={<BarChart />}
              onClick={() => downloadResultPDF('quiz-results-dashboard', `BCABuddy_Quiz_${subject || 'Quiz'}.pdf`)}
              sx={{ bgcolor: NEON_CYAN, color: '#000', fontWeight: 600 }}
            >
              Download PDF
            </Button>
            <Button startIcon={<Refresh />} onClick={resetQuiz} sx={{ bgcolor: GLASS_BG, color: NEON_CYAN, border: GLASS_BORDER, fontWeight: 600 }}>
              Try Again
            </Button>
            <Button startIcon={<Home />} onClick={onClose} sx={{ bgcolor: GLASS_BG, color: '#E6EAF0', border: GLASS_BORDER }}>
              Dashboard
            </Button>
          </Box>
        </Card>
      </Box>
    );
  }

  if (quizData.length === 0) {
    return (
      <Box sx={{ p: 4, height: '100vh', bgcolor: 'rgba(10, 13, 23, 0.95)' }}>
        <BackButton />
        <Card sx={{ maxWidth: 600, mx: 'auto', p: 4, bgcolor: GLASS_BG, border: GLASS_BORDER, borderRadius: '16px' }}>
          <Typography sx={{ fontSize: '24px', fontWeight: 700, color: NEON_CYAN, mb: 3 }}>
            📚 Practice Quiz
          </Typography>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Semester</InputLabel>
            <Select 
              value={semester} 
              onChange={(e) => { setSemester(e.target.value); setSubject(''); }}
              sx={{
                color: '#E6EAF0',
                bgcolor: GLASS_BG,
                border: GLASS_BORDER,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: NEON_PURPLE }
              }}
            >
              {SEMESTERS.map(sem => <MenuItem key={sem} value={sem}>{sem}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Subject</InputLabel>
            <Select 
              value={subject} 
              onChange={(e) => setSubject(e.target.value)} 
              disabled={!semester}
              sx={{
                color: '#E6EAF0',
                bgcolor: GLASS_BG,
                border: GLASS_BORDER,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: NEON_CYAN }
              }}
            >
              {(SUBJECTS[semester] || []).map(sub => <MenuItem key={sub} value={sub}>{sub}</MenuItem>)}
            </Select>
          </FormControl>

          <Button fullWidth onClick={loadQuiz} disabled={!semester || !subject} sx={{ bgcolor: NEON_CYAN, color: '#000', py: 1.5 }}>
            Start Quiz (10 Questions)
          </Button>
        </Card>
      </Box>
    );
  }

  const currentQuestion = quizData[currentIndex];
  const resolvedCorrect = resolveCorrectAnswerText(currentQuestion);
  const isCorrect = normalizeChoice(selectedAnswer) === normalizeChoice(resolvedCorrect);

  return (
    <Box sx={{ p: 4, height: '100vh', bgcolor: 'rgba(10, 13, 23, 0.95)', overflowY: 'auto' }}>
      <BackButton />
      <Card sx={{ maxWidth: 800, mx: 'auto', p: 4, bgcolor: GLASS_BG, border: GLASS_BORDER, borderRadius: '16px' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Chip label={`Question ${currentIndex + 1}/${quizData.length}`} sx={{ bgcolor: NEON_PURPLE, color: '#fff' }} />
          <Chip label={`Score: ${score}/${quizData.length}`} sx={{ bgcolor: NEON_CYAN, color: '#000' }} />
        </Box>

        <Typography sx={{ fontSize: '20px', fontWeight: 600, color: '#E6EAF0', mb: 3 }}>
          {currentQuestion.question}
        </Typography>

        <RadioGroup value={selectedAnswer} onChange={(e) => setSelectedAnswer(e.target.value)}>
          {currentQuestion.options.map((option, idx) => (
            <FormControlLabel
              key={idx}
              value={option}
              control={<Radio />}
              label={option}
              disabled={showFeedback}
              sx={{
                mb: 1,
                p: 1.5,
                borderRadius: '8px',
                bgcolor: showFeedback && normalizeChoice(option) === normalizeChoice(resolvedCorrect) 
                  ? 'rgba(76, 175, 80, 0.2)' 
                  : showFeedback && normalizeChoice(selectedAnswer) === normalizeChoice(option) && !isCorrect
                    ? 'rgba(244, 67, 54, 0.2)'
                    : 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                '& .MuiFormControlLabel-label': { color: '#E6EAF0' }
              }}
            />
          ))}
        </RadioGroup>

        {showFeedback && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Alert 
              severity={isCorrect ? 'success' : 'error'} 
              icon={isCorrect ? <CheckCircle /> : <Cancel />}
              sx={{ mt: 2 }}
            >
              {isCorrect ? 'Correct! Well done!' : `Incorrect. Correct answer: ${resolvedCorrect}`}
            </Alert>
          </motion.div>
        )}

        {!showFeedback && (
          <Button 
            fullWidth 
            onClick={() => handleAnswerSubmit(selectedAnswer)} 
            disabled={!selectedAnswer}
            sx={{ mt: 3, bgcolor: NEON_CYAN, color: '#000', py: 1.5 }}
          >
            Submit Answer
          </Button>
        )}
      </Card>
    </Box>
  );
};

export default QuizSection;
