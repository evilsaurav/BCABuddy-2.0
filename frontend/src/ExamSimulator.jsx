/**
 * BCABuddy Exam Simulator - Phase 4
 * Full-screen timed quiz interface with 45-minute countdown
 * Features: MCQ navigator, performance analytics, PDF export
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Button, Card, Grid, LinearProgress, Chip, Dialog, 
  DialogTitle, DialogContent, DialogActions, Radio, RadioGroup, FormControlLabel,
  CircularProgress, Tooltip, IconButton, Alert, Paper, Divider, TextField,
} from '@mui/material';
import {
  Timer, Flag, Check, Close,
  ArrowBack, ArrowForward, Home, Assignment
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Label } from 'recharts';
import { downloadResultPDF } from './utils/pdfExport';
import { normalizeChoice, resolveCorrectAnswerText, isAnswerCorrect } from './utils/answerNormalization';
import BackButton from './components/BackButton';

const NEON_PURPLE = '#bb86fc';
const NEON_CYAN = '#03dac6';
const GLASS_BG = 'rgba(30, 41, 59, 0.5)';
const GLASS_BORDER = '1px solid rgba(255, 255, 255, 0.1)';

function ExamSimulator({
  handleBackFromResults: handleBackFromResultsProp,
  semester,
  subject,
  onClose,
  API_BASE,
  ...otherProps
}) {
  // Use prop if provided, else define local
  const [showResults, setShowResults] = useState(false);
  const [step, setStep] = useState('initial');
  // Always define handleBackFromResults
  const handleBackFromResults =
    typeof handleBackFromResultsProp === 'function'
      ? handleBackFromResultsProp
      : () => {
          setShowResults(false);
          setStep('initial');
        };
    // ...existing code...
  const navigate = useNavigate();
  // State Management

  // Global BackButton handler for setup/loading/error
  const handleExit = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };
  const [quizData, setQuizData] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [markedQuestions, setMarkedQuestions] = useState(new Set());
  const [timeRemaining, setTimeRemaining] = useState(45 * 60); // Default 45 minutes (Phase 4 spec)
  const [isExamActive, setIsExamActive] = useState(false);
  const [score, setScore] = useState(0);
  const [resultStats, setResultStats] = useState(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reviewMode, setReviewMode] = useState(false); // Toggle between results and review
  const [userAnswers, setUserAnswers] = useState({}); // Track all user answers
  const [subjectiveGrades, setSubjectiveGrades] = useState({}); // idx -> grade payload
  const [isGradingSubjective, setIsGradingSubjective] = useState(false);
  const [gradingError, setGradingError] = useState('');
  const [showSetup, setShowSetup] = useState(true);
  const [questionCount, setQuestionCount] = useState(15);
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [showBackTooltip, setShowBackTooltip] = useState(false);
  const timerIntervalRef = useRef(null);
  const examRunIdRef = useRef(null);

  const getDurationByCount = (count) => {
    if (count === 15) return 45;
    if (count === 30) return 45;
    if (count === 50) return 90;
    return 20;
  };

  const shuffleArray = (arr) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const attemptStorageKey = 'bcabuddy_exam_attempts';
  const reviewStorageKey = 'bcabuddy_review_items';
  const weakTopicsKey = 'bcabuddy_weak_topics';

  const safeParse = (raw, fallback) => {
    try {
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  };

  const readReviewItems = () => {
    const items = safeParse(localStorage.getItem(reviewStorageKey), []);
    return Array.isArray(items) ? items : [];
  };

  const writeReviewItems = (items) => {
    try {
      localStorage.setItem(reviewStorageKey, JSON.stringify(items));
    } catch (e) {
      // ignore
    }
  };

  const upsertReviewItem = (item) => {
    const items = readReviewItems();
    const filtered = items.filter((i) => i?.id !== item.id);
    const next = [item, ...filtered].slice(0, 200);
    writeReviewItems(next);
  };

  const readWeakTopics = () => {
    const items = safeParse(localStorage.getItem(weakTopicsKey), []);
    return Array.isArray(items) ? items : [];
  };

  const writeWeakTopics = (items) => {
    try {
      localStorage.setItem(weakTopicsKey, JSON.stringify(items));
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

  const saveAttempt = (stats) => {
    const existing = JSON.parse(localStorage.getItem(attemptStorageKey) || '[]');
    const entry = {
      percentTotal: stats.percentTotal,
      correct: stats.correct,
      incorrect: stats.incorrect,
      skipped: stats.skipped,
      total: stats.total,
      subject,
      semester,
      duration_minutes: durationMinutes,
      at: new Date().toISOString()
    };
    localStorage.setItem(attemptStorageKey, JSON.stringify([...existing, entry]));
  };

  const startExam = () => {
    const minutes = getDurationByCount(questionCount);
    setDurationMinutes(minutes);
    setTimeRemaining(minutes * 60);
    setIsExamActive(true);
    setShowSetup(false);
  };

  // Load quiz questions
  useEffect(() => {
    if (showSetup || !isExamActive) return;

    const loadQuiz = async () => {
      try {
        setLoading(true);
        setLoadError('');
        setSubjectiveGrades({});
        setGradingError('');
        
        // Convert "Sem 1" to 1, "Sem 2" to 2, etc. (robust: pulls digits)
        const semesterInt = parseInt(String(semester).replace(/[^0-9]/g, ''), 10);
        if (!Number.isFinite(semesterInt)) {
          throw new Error('Invalid semester selected');
        }

        // Default split: ~20% subjective, rest MCQ (no extra UI added)
        const subjectiveCount = Math.max(0, Math.min(questionCount - 1, Math.round(questionCount * 0.2)));
        const mcqCount = Math.max(1, questionCount - subjectiveCount);
        
        // Prefer mixed-exam endpoint; fall back to MCQ-only endpoint if older backend.
        let res = await fetch(`${API_BASE}/generate-exam`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            semester: semesterInt,
            subject,
            mcq_count: mcqCount,
            subjective_count: subjectiveCount
          })
        });

        if (!res.ok) {
          res = await fetch(`${API_BASE}/generate-quiz`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              semester: semesterInt,
              subject,
              count: questionCount
            })
          });
        }

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(errText || `Failed to load quiz (HTTP ${res.status})`);
        }

        const data = await res.json();

        // Backend may return either:
        // 1) a JSON array of questions (current backend)
        // 2) { questions: [...] } or { questions: "[...]" }
        let questionsArray = [];
        if (Array.isArray(data)) {
          questionsArray = data;
        } else if (data && typeof data === 'object') {
          questionsArray = data.questions;
          if (typeof questionsArray === 'string') {
            questionsArray = JSON.parse(questionsArray);
          }
        }

        const cleaned = Array.isArray(questionsArray) ? questionsArray : [];
        const shuffled = shuffleArray(cleaned);
        setQuizData(shuffled.slice(0, questionCount));
      } catch (error) {
        console.error('Quiz load error:', error);
        setQuizData([]);
        setLoadError(error?.message || 'Failed to load quiz');
      }
      finally {
        setLoading(false);
      }
    };

    loadQuiz();
  }, [semester, subject, API_BASE, showSetup, isExamActive, questionCount]);

  const gradeSubjectiveAnswers = async (finalQuizData, finalResponses) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const semesterInt = parseInt(String(semester).replace(/[^0-9]/g, ''), 10);
    if (!Number.isFinite(semesterInt)) return;

    const items = Array.isArray(finalQuizData) ? finalQuizData : [];
    const pending = [];
    for (let idx = 0; idx < items.length; idx += 1) {
      const q = items[idx];
      if (getQuestionKind(q) !== 'subjective') continue;
      const ans = finalResponses?.[idx];
      if (!ans || !String(ans).trim()) continue;
      pending.push({ idx, q, ans });
    }
    if (pending.length === 0) return;

    setIsGradingSubjective(true);
    setGradingError('');

    try {
      for (const item of pending) {
        const maxMarks = Number.isFinite(item.q?.max_marks) ? item.q.max_marks : 10;
        const res = await fetch(`${API_BASE}/grade-subjective`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            semester: semesterInt,
            subject,
            question: item.q?.question || '',
            answer: String(item.ans),
            max_marks: maxMarks
          })
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          throw new Error(txt || `Failed to grade (HTTP ${res.status})`);
        }
        const grade = await res.json();
        setSubjectiveGrades(prev => ({
          ...prev,
          [item.idx]: grade
        }));

        const score = Number(grade?.score || 0);
        const maxMarksValue = Number.isFinite(Number(grade?.max_marks)) ? Number(grade?.max_marks) : maxMarks;
        const hasMistake = Number.isFinite(score) ? score < maxMarksValue : true;
        if (hasMistake) {
          const runId = examRunIdRef.current || `exam_${Date.now()}`;
          const topicKey = getTopicKey(item.q?.question);
          upsertReviewItem({
            id: `${runId}_subj_${item.idx}`,
            type: 'subjective',
            subject,
            semester,
            question: String(item.q?.question || ''),
            user_answer: String(item.ans || ''),
            supreme_answer: String(grade?.model_answer || ''),
            feedback: String(grade?.feedback || ''),
            missed_points: Array.isArray(grade?.missed_points) ? grade.missed_points : [],
            suggested_keywords: Array.isArray(grade?.suggested_keywords) ? grade.suggested_keywords : [],
            score: score,
            max_marks: maxMarksValue,
            at: new Date().toISOString(),
          });
          updateWeakTopic(topicKey, 'exam-subjective');
        }
      }
    } catch (e) {
      console.error('Subjective grading error:', e);
      setGradingError(e?.message || 'Subjective grading failed');
    } finally {
      setIsGradingSubjective(false);
    }
  };

  const getQuestionKind = (question) => {
    if (!question) return 'mcq';
    const explicit = String(question.type || question.question_type || question.kind || '').toLowerCase();
    if (explicit.includes('subject')) return 'subjective';
    if (explicit.includes('mcq') || explicit.includes('objective')) return 'mcq';
    if (Array.isArray(question.options) && question.options.length > 0) return 'mcq';
    return 'subjective';
  };

  // Timer Logic
  useEffect(() => {
    if (!isExamActive || showResults || isPaused) return;

    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerIntervalRef.current);
  }, [isExamActive, showResults, isPaused]);

  const computeResultStats = (responsesSnapshot = responses) => {
    const totalAll = Array.isArray(quizData) ? quizData.length : 0;
    let mcqTotal = 0;
    let subjectiveTotal = 0;

    let attempted = 0; // MCQ attempted
    let correct = 0;
    let incorrect = 0;
    let skipped = 0; // MCQ skipped

    let subjectiveAttempted = 0;
    let subjectiveSkipped = 0;

    for (let idx = 0; idx < totalAll; idx += 1) {
      const question = quizData[idx];
      const kind = getQuestionKind(question);
      const selected = responsesSnapshot?.[idx];

      if (kind === 'subjective') {
        subjectiveTotal += 1;
        if (selected && String(selected).trim()) subjectiveAttempted += 1;
        else subjectiveSkipped += 1;
        continue;
      }

      mcqTotal += 1;
      if (!selected) {
        skipped += 1;
        continue;
      }

      attempted += 1;
      const isCorrect = isAnswerCorrect(selected, question);
      if (isCorrect) correct += 1;
      else incorrect += 1;
    }

    const percentTotal = mcqTotal > 0 ? (correct / mcqTotal) * 100 : 0;
    const percentAttempted = attempted > 0 ? (correct / attempted) * 100 : 0;

    return {
      total: mcqTotal,
      attempted,
      correct,
      incorrect,
      skipped,
      percentTotal,
      percentAttempted,
      mcqTotal,
      subjectiveTotal,
      subjectiveAttempted,
      subjectiveSkipped,
    };
  };

  const recordExamMistakes = (responsesSnapshot, runId) => {
    const items = Array.isArray(quizData) ? quizData : [];
    const nowIso = new Date().toISOString();
    for (let idx = 0; idx < items.length; idx += 1) {
      const question = items[idx];
      const kind = getQuestionKind(question);
      if (kind !== 'mcq') continue;

      const userAnswer = responsesSnapshot?.[idx];
      const attempted = userAnswer !== undefined && userAnswer !== null && String(userAnswer).trim() !== '';
      const correctText = resolveCorrectAnswerText(question);
      const isCorrect = attempted ? isAnswerCorrect(userAnswer, question) : false;
      if (attempted && isCorrect) continue;

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
        at: nowIso,
      });

      updateWeakTopic(topicKey, 'exam-mcq');
    }
  };

  const finalizeExam = () => {
    if (!examRunIdRef.current) {
      examRunIdRef.current = `exam_${Date.now()}`;
    }
    const stats = computeResultStats(responses);
    setResultStats(stats);
    setScore(stats.percentTotal);
    setShowResults(true);
    setIsExamActive(false);
    setShowSubmitDialog(false);
    saveAttempt(stats);
    recordExamMistakes(responses, examRunIdRef.current);

    // Fire-and-forget subjective grading (results will appear as they arrive)
    gradeSubjectiveAnswers(quizData, responses);
  };

  useEffect(() => {
    if (!isExamActive || showResults) return;
    if (timeRemaining !== 0) return;

    clearInterval(timerIntervalRef.current);
    finalizeExam();
  }, [timeRemaining, isExamActive, showResults]);

  // Timer warning effects
  useEffect(() => {
    if (timeRemaining === 300) { // 5 minutes
      console.log('⚠️ 5 minutes remaining!');
    } else if (timeRemaining === 60) { // 1 minute
      console.log('🚨 1 minute remaining!');
    }
  }, [timeRemaining]);

  // Utility Functions
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const setResponseForIndex = (index, value) => {
    const nextValue = value === null || value === undefined ? '' : String(value);
    const shouldClear = !nextValue.trim();

    setResponses(prev => {
      const next = { ...prev };
      if (shouldClear) delete next[index];
      else next[index] = nextValue;
      return next;
    });
    setUserAnswers(prev => {
      const next = { ...prev };
      if (shouldClear) delete next[index];
      else next[index] = nextValue;
      return next;
    });
  };

  const handleSelectAnswer = (option) => {
    setResponseForIndex(currentQuestionIndex, option);
  };

  const handleSubjectiveChange = (text) => {
    setResponseForIndex(currentQuestionIndex, text);
  };

  const handleMarkQuestion = () => {
    const newMarked = new Set(markedQuestions);
    if (newMarked.has(currentQuestionIndex)) {
      newMarked.delete(currentQuestionIndex);
    } else {
      newMarked.add(currentQuestionIndex);
    }
    setMarkedQuestions(newMarked);
  };

  const goToQuestion = (index) => {
    setCurrentQuestionIndex(index);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizData.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitExam = () => {
    setShowResults(true);
    setShowSubmitDialog(false);
    // finalizeExam();
  };

  const getPerformanceRemarks = (stats) => {
    const attempted = stats?.attempted ?? Object.keys(responses).length;
    const total = stats?.total ?? quizData.length;
    const pct = stats?.percentTotal ?? score;

    if (attempted === 0) {
      return { emoji: '📝', text: 'Saurav bhai ne kaha tha padhna zaroori hai... koi baat nahi, next time!' };
    }
    
    // PHASE 3: Gen Z Persona Remarks
    if (pct >= 95) return { emoji: '👑', text: 'Jiya Bhabhi would be proud! QUEEN/KING ENERGY! 🔥' };
    if (pct >= 90) return { emoji: '🚀', text: 'Saurav bhai ke level ka performance! Absolutely SLAYING!' };
    if (pct >= 80) return { emoji: '😎', text: 'Crushing it bestie! That\'s some serious main character energy!' };
    if (pct >= 70) return { emoji: '🎉', text: 'Yaar bohot accha! Keep the grind going!' };
    if (pct >= 60) return { emoji: '👍', text: 'Decent hai, but thoda aur revision chahiye. You got this!' };
    if (pct >= 50) return { emoji: '📚', text: 'Bhai thoda focus! BCABuddy ke saath practice kar lo!' };
    return { emoji: '💪', text: `Arre yaar ${attempted}/${total} attempt kiye. Don\'t lose hope - next time full marks!` };
  };

  const getBadgeLabel = (pct) => {
    if (pct >= 90) return 'Supreme Architect 👑';
    if (pct >= 70) return 'Pro Coder 💻';
    if (pct < 50) return 'BCA Noob 👶';
    return 'Coder in Progress ⚡';
  };

  const getJiyaRemark = (pct) => {
    const username = String(localStorage.getItem('username') || '').toLowerCase();
    const isSaurav = username.includes('saurav');

    if (pct >= 90) {
      return isSaurav
        ? 'Jiya: Proud of you, Saurav. That focus is rare. Keep it sharp. 💙'
        : 'Jiya: Hmm. Top scorer? Don\'t get cocky. 😏';
    }

    if (pct >= 70) {
      return isSaurav
        ? 'Jiya: Solid work. A little more push and you will dominate. 🔥'
        : 'Jiya: Not bad. But standards? Fix them. 🤨';
    }

    return isSaurav
      ? 'Jiya: I believe in you. Next attempt, bring the fire. 💪'
      : 'Jiya: Falling standards. Fix your focus. 😤';
  };

  const resetExam = () => {
    setQuizData([]);
    setCurrentQuestionIndex(0);
    setResponses({});
    setMarkedQuestions(new Set());
    setTimeRemaining(getDurationByCount(questionCount) * 60);
    setIsExamActive(false);
    setShowResults(false);
    setScore(0);
    setResultStats(null);
    setShowSubmitDialog(false);
    setIsPaused(false);
    setLoading(false);
    setLoadError('');
    setReviewMode(false);
    setUserAnswers({});
    setSubjectiveGrades({});
    setIsGradingSubjective(false);
    setGradingError('');
    setShowSetup(true);
  };

  const handleDownloadPDF = () => {
    const fileName = `BCABuddy_Exam_${subject}_${new Date().toISOString().split('T')[0]}.pdf`;
    downloadResultPDF('exam-results-dashboard', fileName);
  };

  // Get question status colors
  const getQuestionStatus = (index) => {
    if (markedQuestions.has(index)) return NEON_PURPLE;
    if (responses[index]) return NEON_CYAN;
    return 'rgba(255, 255, 255, 0.1)';
  };

  if (showSetup) {
    return (
      <Box sx={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        bgcolor: 'rgba(10, 13, 23, 0.41)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        overflow: 'hidden'
      }}>
        <BackButton onClick={handleExit} showTooltip={showBackTooltip} />
        <Card sx={{
          maxWidth: 540,
          width: '100%',
          bgcolor: GLASS_BG,
          border: GLASS_BORDER,
          borderRadius: '20px',
          p: 4,
          backdropFilter: 'blur(12px)',
          textAlign: 'center'
        }}>
          <Typography sx={{ color: NEON_CYAN, fontSize: '24px', fontWeight: 700, mb: 2 }}>
            🧪 Test Setup
          </Typography>
          <Typography sx={{ color: '#E6EAF0', fontSize: '14px', mb: 3 }}>
            Select number of questions. Timer adjusts automatically.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', mb: 3 }}>
            {[15, 30, 50].map((count) => (
              <Button
                key={count}
                onClick={() => setQuestionCount(count)}
                sx={{
                  bgcolor: questionCount === count ? NEON_CYAN : GLASS_BG,
                  color: questionCount === count ? '#000' : '#E6EAF0',
                  border: GLASS_BORDER,
                  fontWeight: 600
                }}
              >
                {count} Questions
              </Button>
            ))}
          </Box>

          <Typography sx={{ color: NEON_PURPLE, fontSize: '13px', mb: 3 }}>
            ⏱️ Timer: {getDurationByCount(questionCount)} minutes
          </Typography>

          <Button onClick={startExam} sx={{ bgcolor: NEON_CYAN, color: '#000', fontWeight: 700, px: 4 }}>
            Start Test
          </Button>
        </Card>
      </Box>
    );
  }

  // Loading State
  if (loading) {
    return (
      <Box sx={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'rgba(10, 13, 23, 0.95)',
        flexDirection: 'column',
        gap: 2
      }}>
        <BackButton onClick={handleExit} />
        <CircularProgress sx={{ color: NEON_CYAN }} size={60} />
        <Typography sx={{ color: '#E6EAF0', fontSize: '18px' }}>Loading exam questions...</Typography>
        <Button onClick={onClose} startIcon={<Home />} sx={{
          bgcolor: GLASS_BG,
          color: '#E6EAF0',
          border: GLASS_BORDER,
          '&:hover': { bgcolor: `${NEON_PURPLE}20` }
        }}>
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  // Empty/Error State
  if (!quizData || quizData.length === 0) {
    return (
      <Box sx={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'rgba(10, 13, 23, 0.95)',
        flexDirection: 'column',
        gap: 2,
        p: 3
      }}>
        <BackButton onClick={handleExit} />
        <Alert severity="error" sx={{ maxWidth: 720, width: '100%', bgcolor: 'rgba(255, 107, 107, 0.15)', color: '#E6EAF0', border: '1px solid rgba(255, 107, 107, 0.35)' }}>
          {loadError || 'No questions generated for the selected subject/semester.'}
        </Alert>
        <Button onClick={onClose} startIcon={<Home />} sx={{
          bgcolor: GLASS_BG,
          color: '#E6EAF0',
          border: GLASS_BORDER,
          '&:hover': { bgcolor: `${NEON_PURPLE}20` }
        }}>
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  // Results View
  if (showResults) {
    const stats = resultStats || computeResultStats(responses);
    const percentScore = stats.percentTotal;
    const usedSeconds = Math.max(durationMinutes * 60 - timeRemaining, 0);
    const attempts = JSON.parse(localStorage.getItem(attemptStorageKey) || '[]');
    const relatedAttempts = attempts.filter(entry => entry.subject === subject && entry.semester === semester);
    const previousAttempts = relatedAttempts.slice(0, -1).slice(-3);
    const comparisonData = [
      ...previousAttempts.map((entry, index) => ({
        name: `Attempt ${relatedAttempts.length - previousAttempts.length + index}`,
        value: Number(entry.percentTotal.toFixed(2))
      })),
      { name: 'Current', value: Number(percentScore.toFixed(2)) }
    ];

    const performanceData = [
      { name: `Right: ${stats.correct}`, value: stats.correct, fill: '#4CAF50' },
      { name: `Wrong: ${stats.incorrect}`, value: stats.incorrect, fill: '#ff6b6b' },
      { name: `Skipped: ${stats.skipped}`, value: stats.skipped, fill: 'rgba(255, 255, 255, 0.18)' }
    ].filter(entry => entry.value > 0);

    const remark = getPerformanceRemarks(stats);
    const badgeLabel = getBadgeLabel(percentScore);
    const jiyaRemark = getJiyaRemark(percentScore);

    const candidateName = (() => {
      const displayName = String(localStorage.getItem('display_name') || '').trim();
      const username = String(localStorage.getItem('username') || '').trim();
      return displayName || username || 'Student';
    })();
    const usernameLower = String(localStorage.getItem('username') || '').toLowerCase();
    const showSupreme = usernameLower.includes('saurav') && percentScore >= 95;

    // Move handleBackFromResults to outer scope and add Back button in results view
    const handleBackFromResults = () => {
      const go = () => {
        if (window.history.length > 1) navigate(-1);
        else navigate('/dashboard');
      };
      if (percentScore < 50) {
        setShowBackTooltip(true);
        setTimeout(() => {
          setShowBackTooltip(false);
          go();
        }, 1000);
        return;
      }
      go();
    };

    const renderSubjectiveStatusChip = (grade) => {
      const maxMarks = Number(grade?.max_marks || 0);
      const scoreVal = Number(grade?.score || 0);
      const pct = maxMarks > 0 ? (scoreVal / maxMarks) * 100 : 0;

      if (!grade) {
        return (
          <Chip
            label="Pending"
            size="small"
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.08)',
              color: '#E6EAF0',
              border: '1px solid rgba(255, 255, 255, 0.18)'
            }}
          />
        );
      }

      let label = 'Average';
      let bg = `${NEON_PURPLE}25`;
      let border = `${NEON_PURPLE}60`;
      let color = NEON_PURPLE;
      if (pct >= 70) {
        label = 'Excellent';
        bg = 'rgba(76, 175, 80, 0.14)';
        border = 'rgba(76, 175, 80, 0.55)';
        color = '#4CAF50';
      } else if (pct < 40) {
        label = 'Poor';
        bg = 'rgba(255, 107, 107, 0.14)';
        border = 'rgba(255, 107, 107, 0.55)';
        color = '#ff6b6b';
      }

      return (
        <Chip
          label={label}
          size="small"
          sx={{
            bgcolor: bg,
            color,
            fontWeight: 700,
            border: `1px solid ${border}`
          }}
        />
      );
    };

    const getJiyaTipForReview = (questionText) => {
      const q = String(questionText || '').trim();
      const shortTopic = q ? q.split(/\s+/).slice(0, 6).join(' ') : 'ye topic';
      return `Jiya: ${candidateName}, ${shortTopic} pe thoda aur focus karo—notes revise karke keywords practice karo. Next attempt me phod dena.`;
    };

    const renderDetailedAnswerReviewList = () => {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {quizData.map((question, idx) => {
            const userAnswer = userAnswers[idx];
            const kind = getQuestionKind(question);
            const attempted = userAnswer !== undefined && userAnswer !== null && String(userAnswer).trim() !== '';

            if (kind === 'subjective') {
              const grade = subjectiveGrades[idx];
              const missedPoints = Array.isArray(grade?.missed_points) ? grade.missed_points : (Array.isArray(grade?.improvements) ? grade.improvements : []);
              const suggestedKeywords = Array.isArray(grade?.suggested_keywords) ? grade.suggested_keywords : [];
              const modelAnswer = String(grade?.model_answer || '').trim();

              return (
                <Card
                  key={idx}
                  sx={{
                    bgcolor: GLASS_BG,
                    border: `1px solid rgba(3, 218, 198, 0.35)`,
                    borderRadius: '16px',
                    p: 2.5,
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 0 18px rgba(3, 218, 198, 0.14)'
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ color: '#E6EAF0', fontWeight: 800 }}>
                        Q{idx + 1}: {question.question}
                      </Typography>
                      <Typography sx={{ color: 'rgba(255, 255, 255, 0.55)', fontSize: '12px', mt: 0.5 }}>
                        Written Answer
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      {renderSubjectiveStatusChip(grade)}
                      {grade && (
                        <Chip
                          label={`Marks: ${Number(grade.score || 0)}/${Number(grade.max_marks || 0)}`}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(255, 255, 255, 0.08)',
                            color: NEON_CYAN,
                            border: '1px solid rgba(3, 218, 198, 0.25)',
                            fontWeight: 700
                          }}
                        />
                      )}
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

                  <Typography sx={{ color: NEON_CYAN, fontWeight: 800, mb: 1 }}>
                    Your Answer
                  </Typography>
                  <Paper sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)', border: GLASS_BORDER, p: 2, borderRadius: '12px' }}>
                    <Typography sx={{ color: '#E6EAF0', whiteSpace: 'pre-wrap' }}>
                      {attempted ? String(userAnswer) : 'Not Attempted'}
                    </Typography>
                  </Paper>

                  <Box sx={{ mt: 2 }}>
                    <Typography sx={{ color: NEON_PURPLE, fontWeight: 800, mb: 1 }}>
                      AI Evaluation
                    </Typography>
                    <Paper sx={{ bgcolor: 'rgba(255, 255, 255, 0.04)', border: GLASS_BORDER, p: 2, borderRadius: '12px' }}>
                      <Typography sx={{ color: '#E6EAF0' }}>
                        {grade?.feedback ? String(grade.feedback) : (attempted ? 'Evaluating...' : 'No answer submitted.')}
                      </Typography>
                    </Paper>
                  </Box>

                  <Box sx={{ mt: 2 }}>
                    <Typography sx={{ color: NEON_CYAN, fontWeight: 800, mb: 1 }}>
                      Improvement Input
                    </Typography>
                    <Paper sx={{ bgcolor: 'rgba(255, 255, 255, 0.04)', border: GLASS_BORDER, p: 2, borderRadius: '12px' }}>
                      <Typography sx={{ color: '#E6EAF0', fontWeight: 700, mb: 0.75 }}>
                        What you missed
                      </Typography>
                      {missedPoints.length > 0 ? (
                        <Box sx={{ mb: 1.5 }}>
                          {missedPoints.slice(0, 6).map((p, i) => (
                            <Typography key={i} sx={{ color: '#E6EAF0', fontSize: '13px' }}>
                              • {String(p)}
                            </Typography>
                          ))}
                        </Box>
                      ) : (
                        <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '13px', mb: 1.5 }}>
                          —
                        </Typography>
                      )}

                      <Typography sx={{ color: '#E6EAF0', fontWeight: 700, mb: 0.75 }}>
                        Suggested Keywords
                      </Typography>
                      {suggestedKeywords.length > 0 ? (
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                          {suggestedKeywords.slice(0, 10).map((k, i) => (
                            <Chip
                              key={i}
                              label={String(k)}
                              size="small"
                              sx={{
                                bgcolor: 'rgba(3, 218, 198, 0.12)',
                                color: NEON_CYAN,
                                border: '1px solid rgba(3, 218, 198, 0.22)',
                                fontWeight: 700
                              }}
                            />
                          ))}
                        </Box>
                      ) : (
                        <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '13px', mb: 1.5 }}>
                          —
                        </Typography>
                      )}

                      <Typography sx={{ color: NEON_PURPLE, fontWeight: 700, fontSize: '13px' }}>
                        {getJiyaTipForReview(question.question)}
                      </Typography>
                    </Paper>
                  </Box>

                  <Box sx={{ mt: 2 }}>
                    <Typography sx={{ color: NEON_CYAN, fontWeight: 800, mb: 1 }}>
                      Model Answer
                    </Typography>
                    <Paper sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)', border: GLASS_BORDER, p: 2, borderRadius: '12px' }}>
                      <Typography sx={{ color: '#E6EAF0', whiteSpace: 'pre-wrap' }}>
                        {modelAnswer || (grade ? '—' : 'Pending evaluation')}
                      </Typography>
                    </Paper>
                  </Box>
                </Card>
              );
            }

            const correctText = resolveCorrectAnswerText(question);
            const isCorrect = attempted ? isAnswerCorrect(userAnswer, question) : false;
            const borderColor = attempted
              ? (isCorrect ? 'rgba(76, 175, 80, 0.7)' : 'rgba(255, 107, 107, 0.7)')
              : 'rgba(255, 255, 255, 0.2)';
            const glow = attempted
              ? (isCorrect ? '0 0 18px rgba(76, 175, 80, 0.35)' : '0 0 18px rgba(255, 107, 107, 0.28)')
              : 'none';

            return (
              <Card
                key={idx}
                sx={{
                  bgcolor: GLASS_BG,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '16px',
                  p: 2.5,
                  backdropFilter: 'blur(12px)',
                  boxShadow: glow
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ color: '#E6EAF0', fontWeight: 800 }}>
                      Q{idx + 1}: {question.question}
                    </Typography>
                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.55)', fontSize: '12px', mt: 0.5 }}>
                      MCQ
                    </Typography>
                  </Box>

                  {attempted ? (
                    isCorrect ? (
                      <Chip
                        label="Correct"
                        size="small"
                        sx={{
                          bgcolor: 'rgba(76, 175, 80, 0.14)',
                          color: '#4CAF50',
                          border: '1px solid rgba(76, 175, 80, 0.55)',
                          fontWeight: 800
                        }}
                      />
                    ) : (
                      <Chip
                        label="Wrong"
                        size="small"
                        sx={{
                          bgcolor: 'rgba(255, 107, 107, 0.14)',
                          color: '#ff6b6b',
                          border: '1px solid rgba(255, 107, 107, 0.55)',
                          fontWeight: 800
                        }}
                      />
                    )
                  ) : (
                    <Chip
                      label="Not Attempted"
                      size="small"
                      sx={{
                        bgcolor: 'rgba(255, 255, 255, 0.08)',
                        color: '#E6EAF0',
                        border: '1px solid rgba(255, 255, 255, 0.18)',
                        fontWeight: 700
                      }}
                    />
                  )}
                </Box>

                <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

                {!attempted ? (
                  <Typography sx={{ color: '#E6EAF0' }}>
                    Correct Answer: {correctText || '—'}
                  </Typography>
                ) : isCorrect ? (
                  <Typography sx={{ color: '#E6EAF0' }}>
                    Correct Answer: {correctText || '—'}
                  </Typography>
                ) : (
                  <>
                    <Typography sx={{ color: '#E6EAF0', mb: 0.75 }}>
                      Your Answer: {String(userAnswer)}
                    </Typography>
                    <Typography sx={{ color: '#E6EAF0' }}>
                      Correct Answer: {correctText || '—'}
                    </Typography>
                  </>
                )}
              </Card>
            );
          })}
        </Box>
      );
    };

    const subjectiveMarkSummary = (() => {
      let scored = 0;
      let max = 0;
      let gradedCount = 0;
      for (let idx = 0; idx < quizData.length; idx += 1) {
        const q = quizData[idx];
        if (getQuestionKind(q) !== 'subjective') continue;
        const grade = subjectiveGrades[idx];
        if (!grade) continue;
        gradedCount += 1;
        scored += Number(grade.score || 0);
        max += Number(grade.max_marks || 0);
      }
      return { scored, max, gradedCount };
    })();

    if (reviewMode) {
      return (
        <Box sx={{
          width: '100%',
          height: '100%',
          minHeight: 0,
          bgcolor: '#0a0d17',
          p: 4,
          overflowY: 'auto'
        }}>
          <button onClick={handleBackFromResults} style={{ marginBottom: 16, color: NEON_CYAN, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>
            ← Back
          </button>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography sx={{ fontSize: '24px', fontWeight: 700, color: NEON_CYAN }}>
              📖 Detailed Answer Review
            </Typography>
            <Button onClick={() => setReviewMode(false)} sx={{ color: NEON_PURPLE, textTransform: 'none', fontWeight: 600 }}>
              ← Back to Results
            </Button>
          </Box>

          {renderDetailedAnswerReviewList()}
        </Box>
      );
    }

    const stagger = {
      hidden: { opacity: 0 },
      show: { opacity: 1, transition: { staggerChildren: 0.12 } }
    };

    const item = {
      hidden: { opacity: 0, y: 12 },
      show: { opacity: 1, y: 0 }
    };

    return (
      <Box sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#0a0d17',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <BackButton />
        <Box sx={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 20% 20%, rgba(3, 218, 198, 0.18), transparent 40%), radial-gradient(circle at 80% 30%, rgba(187, 134, 252, 0.2), transparent 45%)',
          animation: 'meshPulse 10s ease-in-out infinite',
          '@keyframes meshPulse': {
            '0%, 100%': { opacity: 0.75 },
            '50%': { opacity: 1 }
          }
        }} />

        <Box id="exam-results-dashboard" sx={{ position: 'relative', zIndex: 1, p: 4, flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <motion.div variants={stagger} initial="hidden" animate="show">
            <motion.div variants={item}>
              <Typography sx={{ color: NEON_CYAN, fontSize: '28px', fontWeight: 700 }}>
                BCABuddy - Performance Report
              </Typography>
              <Typography sx={{ color: '#E6EAF0', fontSize: '14px' }}>
                Candidate: {candidateName} • Subject: {subject}
              </Typography>
            </motion.div>

            {showSupreme && (
              <motion.div variants={item}>
                <Card
                  sx={{
                    mt: 2,
                    bgcolor: 'rgba(10, 17, 30, 0.7)',
                    border: '1px solid rgba(168, 85, 247, 0.6)',
                    borderRadius: '18px',
                    p: 2.5,
                    textAlign: 'center',
                    boxShadow: '0 0 28px rgba(168, 85, 247, 0.45)',
                    animation: 'supremePulse 2.2s ease-in-out infinite',
                    '@keyframes supremePulse': {
                      '0%, 100%': { boxShadow: '0 0 28px rgba(168, 85, 247, 0.45)' },
                      '50%': { boxShadow: '0 0 48px rgba(3, 218, 198, 0.55)' }
                    }
                  }}
                >
                  <Typography sx={{ color: '#E6EAF0', fontWeight: 900, fontSize: '18px' }}>
                    Supreme Architect 👑
                  </Typography>
                  <Typography sx={{ color: NEON_CYAN, mt: 0.6 }}>
                    Jiya: Poise + power. Ye 95+ crown tumhara hi tha. 👑
                  </Typography>
                </Card>
              </motion.div>
            )}

            <Grid container spacing={3} sx={{ mt: 2 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <motion.div variants={item}>
                  <Card sx={{ bgcolor: GLASS_BG, border: GLASS_BORDER, p: 3, backdropFilter: 'blur(12px)' }}>
                    <Typography sx={{ color: NEON_CYAN, fontWeight: 600, mb: 2 }}>
                      Performance Donut
                    </Typography>
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={performanceData}
                          dataKey="value"
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={100}
                          paddingAngle={4}
                          label={({ name }) => name}
                        >
                          {performanceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                          <Label value={`${percentScore.toFixed(2)}%`} position="center" fill={NEON_CYAN} />
                        </Pie>
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>
                </motion.div>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <motion.div variants={item}>
                  <Card sx={{ bgcolor: GLASS_BG, border: GLASS_BORDER, p: 3, backdropFilter: 'blur(12px)' }}>
                    <Typography sx={{ color: NEON_CYAN, fontWeight: 600, mb: 2 }}>
                      Performance Comparison
                    </Typography>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={comparisonData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={`${NEON_PURPLE}40`} />
                        <XAxis dataKey="name" stroke="#E6EAF0" />
                        <YAxis stroke="#E6EAF0" />
                        <RechartsTooltip />
                        <Bar dataKey="value" fill={NEON_CYAN} label={{ position: 'top' }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </motion.div>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <motion.div variants={item}>
                  <Card sx={{ bgcolor: GLASS_BG, border: GLASS_BORDER, p: 3, backdropFilter: 'blur(12px)' }}>
                    <Typography sx={{ color: NEON_CYAN, fontWeight: 600, mb: 1 }}>
                      Dynamic Badge
                    </Typography>
                    <Typography sx={{ color: '#E6EAF0', fontSize: '22px', fontWeight: 700 }}>
                      {badgeLabel}
                    </Typography>
                    <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
                    <Typography sx={{ color: NEON_CYAN, fontWeight: 600, mb: 1 }}>
                      Score Formula
                    </Typography>
                    <Typography sx={{ color: '#E6EAF0', fontSize: '13px' }}>
                      Score = (MCQ Correct / MCQ Total) x 100
                    </Typography>
                  </Card>
                </motion.div>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <motion.div variants={item}>
                  <Card sx={{ bgcolor: GLASS_BG, border: GLASS_BORDER, p: 3, backdropFilter: 'blur(12px)' }}>
                    <Typography sx={{ color: NEON_CYAN, fontWeight: 600, mb: 1 }}>
                      Jiya Maurya
                    </Typography>
                    <Typography sx={{ color: '#E6EAF0' }}>
                      {jiyaRemark}
                    </Typography>
                  </Card>
                </motion.div>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <motion.div variants={item}>
                  <Card sx={{ bgcolor: GLASS_BG, border: GLASS_BORDER, p: 3, backdropFilter: 'blur(12px)' }}>
                    <Typography sx={{ color: NEON_CYAN, fontWeight: 600, mb: 2 }}>
                      Scorecard
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
                      <Box sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.04)', borderRadius: '12px' }}>
                        <Typography sx={{ color: '#E6EAF0', fontSize: '12px' }}>MCQ Total</Typography>
                        <Typography sx={{ color: NEON_CYAN, fontSize: '22px', fontWeight: 700 }}>{stats.mcqTotal}</Typography>
                      </Box>
                      <Box sx={{ p: 2, bgcolor: 'rgba(76, 175, 80, 0.12)', borderRadius: '12px' }}>
                        <Typography sx={{ color: '#E6EAF0', fontSize: '12px' }}>Correct</Typography>
                        <Typography sx={{ color: '#4CAF50', fontSize: '22px', fontWeight: 700 }}>{stats.correct}</Typography>
                      </Box>
                      <Box sx={{ p: 2, bgcolor: 'rgba(255, 107, 107, 0.12)', borderRadius: '12px' }}>
                        <Typography sx={{ color: '#E6EAF0', fontSize: '12px' }}>Wrong</Typography>
                        <Typography sx={{ color: '#ff6b6b', fontSize: '22px', fontWeight: 700 }}>{stats.incorrect}</Typography>
                      </Box>
                      <Box sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.06)', borderRadius: '12px' }}>
                        <Typography sx={{ color: '#E6EAF0', fontSize: '12px' }}>MCQ Skipped</Typography>
                        <Typography sx={{ color: '#E6EAF0', fontSize: '22px', fontWeight: 700 }}>{stats.skipped}</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                      <Typography sx={{ color: '#E6EAF0', fontSize: '13px' }}>
                        Time Used: {Math.floor(usedSeconds / 60)}m {usedSeconds % 60}s
                      </Typography>
                      <Typography sx={{ color: '#E6EAF0', fontSize: '13px' }}>
                        MCQ Attempted: {stats.attempted}/{stats.mcqTotal}
                      </Typography>
                      {stats.subjectiveTotal > 0 && (
                        <Typography sx={{ color: '#E6EAF0', fontSize: '13px' }}>
                          Subjective Attempted: {stats.subjectiveAttempted}/{stats.subjectiveTotal} (evaluation pending)
                        </Typography>
                      )}
                    </Box>

                    {stats.subjectiveTotal > 0 && (
                      <Box sx={{ mt: 2 }}>
                        {isGradingSubjective && (
                          <Typography sx={{ color: NEON_CYAN, fontSize: '13px' }}>
                            Evaluating subjective answers...
                          </Typography>
                        )}
                        {subjectiveMarkSummary.gradedCount > 0 && subjectiveMarkSummary.max > 0 && (
                          <Typography sx={{ color: NEON_PURPLE, fontSize: '13px', fontWeight: 700 }}>
                            Subjective Marks: {subjectiveMarkSummary.scored}/{subjectiveMarkSummary.max}
                          </Typography>
                        )}
                        {gradingError && (
                          <Typography sx={{ color: '#ff6b6b', fontSize: '13px' }}>
                            Subjective evaluation error: {gradingError}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Card>
                </motion.div>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <motion.div variants={item}>
                  <Card sx={{ bgcolor: GLASS_BG, border: GLASS_BORDER, p: 3, backdropFilter: 'blur(12px)' }}>
                    <Typography sx={{ color: NEON_CYAN, fontWeight: 700, mb: 2 }}>
                      Detailed Answer Review
                    </Typography>
                    <Box
                      data-pdf-expand="true"
                      sx={{
                        maxHeight: 540,
                        overflowY: 'auto',
                        pr: 1,
                        '&::-webkit-scrollbar': { width: '8px' },
                        '&::-webkit-scrollbar-thumb': { background: 'rgba(255, 255, 255, 0.18)', borderRadius: '8px' },
                        '&::-webkit-scrollbar-track': { background: 'rgba(255, 255, 255, 0.06)', borderRadius: '8px' }
                      }}
                    >
                      {renderDetailedAnswerReviewList()}
                    </Box>
                  </Card>
                </motion.div>
              </Grid>
            </Grid>

            <motion.div variants={item}>
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Typography sx={{ color: '#E6EAF0', fontSize: '14px' }}>
                  {remark.emoji} {remark.text}
                </Typography>
                <Button onClick={() => setReviewMode(true)} startIcon={<Assignment />} sx={{
                  bgcolor: NEON_PURPLE,
                  color: '#fff',
                  fontWeight: 600,
                  '&:hover': { bgcolor: NEON_CYAN }
                }}>
                  Review Answers
                </Button>
              </Box>
            </motion.div>

            <Box sx={{ position: 'relative', mt: 3 }}>
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.35)', position: 'absolute', right: 0, bottom: 0 }}>
                BCABuddy Certified
              </Typography>
            </Box>
          </motion.div>
        </Box>

        <Box sx={{
          position: 'sticky',
          bottom: 0,
          p: 2,
          bgcolor: GLASS_BG,
          borderTop: GLASS_BORDER,
          backdropFilter: 'blur(12px)',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 2,
          zIndex: 10,
          flexWrap: 'wrap'
        }}>
          <Button onClick={resetExam} sx={{ bgcolor: GLASS_BG, color: NEON_CYAN, border: GLASS_BORDER }}>
            Retake Exam
          </Button>
          <Button onClick={handleDownloadPDF} sx={{ bgcolor: NEON_CYAN, color: '#000', fontWeight: 700 }}>
            Download PDF
          </Button>
          <Button onClick={onClose} sx={{ bgcolor: GLASS_BG, color: '#E6EAF0', border: GLASS_BORDER }}>
            Back to Dashboard
          </Button>
        </Box>
      </Box>
    );
  }

  // Main Exam View
  const currentQuestion = quizData[currentQuestionIndex];
  const currentKind = getQuestionKind(currentQuestion);
  const answeredCount = Object.keys(responses).length;
  const progressPercent = (answeredCount / quizData.length) * 100;

  return (
    <Box sx={{
      width: '100%',
      height: '100%',
      minHeight: 0,
      bgcolor: 'rgba(10, 13, 23, 0.95)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <BackButton />
      {/* Top Bar */}
      <Box sx={{
        bgcolor: GLASS_BG,
        border: GLASS_BORDER,
        p: 2,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backdropFilter: 'blur(12px)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Tooltip title="Back to Dashboard">
            <IconButton onClick={onClose} sx={{
              color: NEON_CYAN,
              border: GLASS_BORDER,
              bgcolor: 'rgba(255, 255, 255, 0.04)',
              '&:hover': { bgcolor: `${NEON_CYAN}18` }
            }}>
              <Home />
            </IconButton>
          </Tooltip>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ color: NEON_CYAN, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {subject} - {durationMinutes} Minute Exam
            </Typography>
            <LinearProgress variant="determinate" value={progressPercent} sx={{
              mt: 1,
              borderRadius: '4px',
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              '& .MuiLinearProgress-bar': { bgcolor: NEON_CYAN }
            }} />
            <Typography sx={{ color: '#E6EAF0', fontSize: '12px', mt: 1 }}>
              {answeredCount} of {quizData.length} answered
            </Typography>
          </Box>
        </Box>

        {/* Timer */}
        <motion.div animate={{ scale: timeRemaining < 300 ? [1, 1.1, 1] : 1 }} transition={{ duration: 1, repeat: Infinity }}>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            bgcolor: timeRemaining < 300 ? '#ff6b6b30' : GLASS_BG,
            border: timeRemaining < 300 ? `2px solid #ff6b6b` : GLASS_BORDER,
            p: 2,
            borderRadius: '12px',
            backdropFilter: 'blur(8px)'
          }}>
            <Timer sx={{ color: timeRemaining < 300 ? '#ff6b6b' : NEON_CYAN, fontSize: '28px' }} />
            <Box>
              <Typography sx={{
                fontSize: '24px',
                fontWeight: 700,
                color: timeRemaining < 300 ? '#ff6b6b' : NEON_CYAN,
                fontFamily: 'monospace'
              }}>
                {formatTime(timeRemaining)}
              </Typography>
              <Button size="small" onClick={() => setIsPaused(!isPaused)} sx={{
                color: NEON_PURPLE,
                fontSize: '12px',
                textTransform: 'none'
              }}>
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
            </Box>
          </Box>
        </motion.div>
      </Box>

      {/* Main Content */}
      <Box sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: 2,
        p: 2,
        pb: 10,
        overflow: 'hidden'
      }}>
        {/* Question Panel */}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
          {currentQuestion && (
            <motion.div key={currentQuestionIndex} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card sx={{
                bgcolor: GLASS_BG,
                border: GLASS_BORDER,
                borderRadius: '16px',
                p: 3,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                backdropFilter: 'blur(12px)'
              }}>
                {/* Question Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                  <Box>
                    <Typography sx={{ color: NEON_CYAN, fontSize: '14px', fontWeight: 600 }}>
                      Question {currentQuestionIndex + 1} of {quizData.length}
                    </Typography>
                    <Typography sx={{ color: '#E6EAF0', fontSize: '20px', fontWeight: 600, mt: 1 }}>
                      {currentQuestion.question}
                    </Typography>
                  </Box>
                  <motion.div whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}>
                    <Tooltip title={markedQuestions.has(currentQuestionIndex) ? 'Unmark' : 'Mark for review'}>
                      <IconButton onClick={handleMarkQuestion} sx={{
                        color: markedQuestions.has(currentQuestionIndex) ? NEON_PURPLE : 'rgba(255, 255, 255, 0.5)',
                        border: `2px solid ${markedQuestions.has(currentQuestionIndex) ? NEON_PURPLE : 'rgba(255, 255, 255, 0.2)'}`
                      }}>
                        <Flag />
                      </IconButton>
                    </Tooltip>
                  </motion.div>
                </Box>

                {/* Options */}
                <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 1 }}>
                  {currentKind === 'subjective' ? (
                    <TextField
                      value={responses[currentQuestionIndex] || ''}
                      onChange={(e) => handleSubjectiveChange(e.target.value)}
                      placeholder="Write your answer here..."
                      multiline
                      minRows={6}
                      fullWidth
                      variant="outlined"
                      sx={{
                        mt: 1,
                        '& .MuiOutlinedInput-root': {
                          color: '#E6EAF0',
                          bgcolor: 'rgba(255, 255, 255, 0.03)',
                          borderRadius: '12px',
                          '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.12)' },
                          '&:hover fieldset': { borderColor: `${NEON_CYAN}55` },
                          '&.Mui-focused fieldset': { borderColor: NEON_CYAN }
                        },
                        '& .MuiOutlinedInput-input::placeholder': { color: 'rgba(255, 255, 255, 0.35)', opacity: 1 },
                      }}
                    />
                  ) : (
                    <RadioGroup value={responses[currentQuestionIndex] || ''} onChange={(e) => handleSelectAnswer(e.target.value)}>
                      {currentQuestion.options?.map((option, idx) => (
                        <motion.div key={idx} whileHover={{ x: 5 }} transition={{ type: 'spring', stiffness: 300 }}>
                          <FormControlLabel
                            value={option}
                            control={<Radio sx={{
                              color: NEON_CYAN,
                              '&.Mui-checked': { color: NEON_CYAN }
                            }} />}
                            label={<Typography sx={{ color: '#E6EAF0' }}>{option}</Typography>}
                            sx={{
                              p: 2,
                              m: 1,
                              borderRadius: '8px',
                              border: responses[currentQuestionIndex] === option ? `2px solid ${NEON_CYAN}` : `1px solid rgba(255, 255, 255, 0.1)`,
                              cursor: 'pointer',
                              transition: 'all 200ms',
                              '&:hover': {
                                bgcolor: `${NEON_PURPLE}10`,
                                borderColor: NEON_PURPLE
                              }
                            }}
                          />
                        </motion.div>
                      ))}
                    </RadioGroup>
                  )}
                </Box>
              </Card>
            </motion.div>
          )}
        </Box>

        {/* Navigation Panel */}
        <Box sx={{
          width: { xs: '100%', md: '280px' },
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          minHeight: 0
        }}>
          {/* Legend */}
          <Card sx={{
            bgcolor: GLASS_BG,
            border: GLASS_BORDER,
            borderRadius: '16px',
            p: 2,
            backdropFilter: 'blur(12px)'
          }}>
            <Typography sx={{ color: NEON_CYAN, fontSize: '14px', fontWeight: 600, mb: 2 }}>
              Status Legend
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ width: '24px', height: '24px', borderRadius: '4px', bgcolor: 'rgba(255, 255, 255, 0.1)', border: GLASS_BORDER }} />
                <Typography sx={{ color: '#E6EAF0', fontSize: '12px' }}>Not Answered</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ width: '24px', height: '24px', borderRadius: '4px', bgcolor: NEON_CYAN }} />
                <Typography sx={{ color: '#E6EAF0', fontSize: '12px' }}>Answered</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ width: '24px', height: '24px', borderRadius: '4px', bgcolor: NEON_PURPLE }} />
                <Typography sx={{ color: '#E6EAF0', fontSize: '12px' }}>Marked for Review</Typography>
              </Box>
            </Box>
          </Card>

          {/* Question Navigator Grid */}
          <Card sx={{
            bgcolor: GLASS_BG,
            border: GLASS_BORDER,
            borderRadius: '16px',
            p: 2,
            flex: 1,
            overflow: 'auto',
            backdropFilter: 'blur(12px)'
          }}>
            <Typography sx={{ color: NEON_CYAN, fontSize: '14px', fontWeight: 600, mb: 2 }}>
              Question Navigator
            </Typography>
            <Grid container spacing={1}>
              {quizData.map((_, idx) => (
                <Grid size={3} key={idx}>
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={() => goToQuestion(idx)}
                      sx={{
                        width: '100%',
                        aspectRatio: '1',
                        p: 0,
                        bgcolor: currentQuestionIndex === idx ? NEON_CYAN : getQuestionStatus(idx),
                        color: currentQuestionIndex === idx ? '#000' : '#E6EAF0',
                        fontWeight: 600,
                        borderRadius: '8px',
                        border: currentQuestionIndex === idx ? `2px solid ${NEON_PURPLE}` : 'none',
                        fontSize: '12px',
                        '&:hover': {
                          transform: 'scale(1.05)',
                          bgcolor: NEON_CYAN
                        }
                      }}
                    >
                      {idx + 1}
                    </Button>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </Card>
        </Box>
      </Box>

      {/* Bottom Action Bar (always visible) */}
      <Box sx={{
        p: 2,
        bgcolor: GLASS_BG,
        borderTop: GLASS_BORDER,
        backdropFilter: 'blur(12px)',
        display: 'flex',
        gap: 2,
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        bottom: 0,
        zIndex: 10
      }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', flex: 1 }}>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} style={{ flex: '1 1 180px' }}>
            <Button fullWidth startIcon={<ArrowBack />} onClick={handlePrevQuestion} disabled={currentQuestionIndex === 0} sx={{
              bgcolor: GLASS_BG,
              color: '#E6EAF0',
              border: GLASS_BORDER,
              '&:hover': { bgcolor: `${NEON_PURPLE}20` }
            }}>
              Previous
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} style={{ flex: '1 1 180px' }}>
            <Button fullWidth endIcon={<ArrowForward />} onClick={handleNextQuestion} disabled={currentQuestionIndex === quizData.length - 1} sx={{
              bgcolor: GLASS_BG,
              color: '#E6EAF0',
              border: GLASS_BORDER,
              '&:hover': { bgcolor: `${NEON_CYAN}20` }
            }}>
              Next
            </Button>
          </motion.div>
        </Box>

        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
          <Button onClick={() => setShowSubmitDialog(true)} sx={{
            bgcolor: NEON_CYAN,
            color: '#000',
            fontWeight: 700,
            px: 3,
            whiteSpace: 'nowrap',
            '&:hover': { bgcolor: NEON_PURPLE }
          }}>
            Submit Exam
          </Button>
        </motion.div>
      </Box>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onClose={() => setShowSubmitDialog(false)}>
        <DialogTitle sx={{ color: NEON_CYAN, fontWeight: 700 }}>Submit Exam?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Questions Answered: {answeredCount}/{quizData.length}
            {quizData.length - answeredCount > 0 && ` (${quizData.length - answeredCount} unanswered)`}
          </Alert>
          <Typography sx={{ mt: 2, color: '#666' }}>
            Are you sure you want to submit? You cannot change your answers after submission.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} sx={{ color: '#666' }}>
            Exit to Dashboard
          </Button>
          <Button onClick={() => setShowSubmitDialog(false)}>Continue Exam</Button>
          <Button onClick={handleSubmitExam} variant="contained" sx={{
            bgcolor: NEON_CYAN,
            color: '#000'
          }}>
            Submit & View Results
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExamSimulator;
