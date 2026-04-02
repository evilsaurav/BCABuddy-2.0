import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Typography,
} from '@mui/material';
import { API_BASE as DEFAULT_API_BASE } from '../utils/apiConfig';

const PAGE_BG = '#090f1f';
const CARD_BG = 'rgba(18, 28, 52, 0.78)';
const BORDER = '1px solid rgba(255, 255, 255, 0.12)';
const ACCENT = '#03dac6';

const SEMESTERS = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6'];
const SUBJECTS = {
  'Sem 1': ['BCS-011', 'MCS-011', 'BCS-012'],
  'Sem 2': ['MCS-011', 'MCS-012', 'MCS-015', 'ECO-02'],
  'Sem 3': ['MCS-021', 'MCS-023', 'BCS-031', 'MCS-014'],
  'Sem 4': ['MCS-024', 'BCS-040', 'BCS-041', 'BCS-042'],
  'Sem 5': ['BCS-051', 'BCS-052', 'BCS-053', 'BCS-054'],
  'Sem 6': ['BCS-062', 'MCS-022', 'BCS-092'],
};

const toMMSS = (seconds) => {
  const safe = Math.max(0, Number(seconds) || 0);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const normalizeQuestionArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.questions)) return payload.questions;
  return [];
};

const isCorrectAnswer = (selected, question) => {
  const a = String(selected || '').trim().toLowerCase();
  const b = String(question?.correct_answer || '').trim().toLowerCase();
  return a && b && a === b;
};

const ExamSimulationPage = ({ API_BASE: apiBaseOverride }) => {
  const API_BASE = apiBaseOverride || DEFAULT_API_BASE;
  const navigate = useNavigate();

  const [examState, setExamState] = useState('setup');
  const [semester, setSemester] = useState('');
  const [subject, setSubject] = useState('');
  const [questionCount, setQuestionCount] = useState(20);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(60);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const timerRef = useRef(null);
  const submitGuardRef = useRef(false);

  const totalDurationSeconds = useMemo(() => {
    return Math.max(300, Number(questionCount || 20) * 60);
  }, [questionCount]);

  const activeQuestion = questions[currentIndex] || null;

  const handleAnswerChange = (value) => {
    setAnswers((prev) => ({ ...prev, [currentIndex]: value }));
  };

  const logApcResult = async (summaryText) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const params = new URLSearchParams({
      tool: 'exam_simulation',
      subject: String(subject || ''),
      response: summaryText,
    });

    try {
      await fetch(`${API_BASE}/apc/log?${params.toString()}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // Non-blocking: exam result should still render even if log fails.
    }
  };

  const buildResult = () => {
    const total = questions.length;
    let attempted = 0;
    let correct = 0;

    questions.forEach((q, idx) => {
      const ans = answers[idx];
      if (ans !== undefined && String(ans).trim() !== '') {
        attempted += 1;
      }
      if (isCorrectAnswer(ans, q)) {
        correct += 1;
      }
    });

    const incorrect = attempted - correct;
    const skipped = total - attempted;
    const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

    return { total, attempted, correct, incorrect, skipped, percent };
  };

  const handleAutoSubmit = async () => {
    if (submitGuardRef.current) return;
    submitGuardRef.current = true;

    clearInterval(timerRef.current);
    setExamState('submitted');

    const computed = buildResult();
    setResult(computed);

    const summary = `Exam Simulation Result | Subject=${subject || 'NA'} | Score=${computed.correct}/${computed.total} (${computed.percent}%) | Attempted=${computed.attempted}`;
    await logApcResult(summary);

    setExamState('results');
  };

  useEffect(() => {
    if (examState !== 'active') return undefined;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });

      setQuestionTimeLeft((prev) => {
        if (prev <= 1) {
          const atLast = currentIndex >= questions.length - 1;
          if (atLast) {
            handleAutoSubmit();
            return 0;
          }
          setCurrentIndex((idx) => Math.min(idx + 1, Math.max(0, questions.length - 1)));
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [examState, currentIndex, questions.length]);

  useEffect(() => {
    if (examState === 'active') {
      setQuestionTimeLeft(60);
    }
  }, [currentIndex, examState]);

  const startExam = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }

    if (!semester || !subject) {
      setError('Please select semester and subject first.');
      return;
    }

    setLoading(true);
    setError('');
    submitGuardRef.current = false;

    try {
      const semNum = parseInt(String(semester).replace(/\D/g, ''), 10);
      const payload = {
        semester: semNum,
        subject,
        mcq_count: questionCount,
        subjective_count: 0,
      };

      let res = await fetch(`${API_BASE}/generate-exam`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        res = await fetch(`${API_BASE}/generate-quiz`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ semester: semNum, subject, count: questionCount }),
        });
      }

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `Failed to load exam (HTTP ${res.status})`);
      }

      const data = await res.json();
      const normalized = normalizeQuestionArray(data).slice(0, questionCount);
      if (!normalized.length) {
        throw new Error('No questions received for this selection.');
      }

      setQuestions(normalized);
      setAnswers({});
      setCurrentIndex(0);
      setTimeLeft(totalDurationSeconds);
      setQuestionTimeLeft(60);
      setResult(null);
      setExamState('active');
    } catch (e) {
      setError(String(e?.message || 'Unable to start exam.'));
    } finally {
      setLoading(false);
    }
  };

  const goNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      return;
    }
    handleAutoSubmit();
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const restart = () => {
    clearInterval(timerRef.current);
    setExamState('setup');
    setQuestions([]);
    setAnswers({});
    setCurrentIndex(0);
    setResult(null);
    setError('');
    submitGuardRef.current = false;
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: PAGE_BG,
        color: '#E6EAF0',
        p: { xs: 2, md: 3 },
      }}
    >
      <Box sx={{ maxWidth: 980, mx: 'auto' }}>
        <Card sx={{ p: 2.5, border: BORDER, bgcolor: CARD_BG, borderRadius: '18px', mb: 2 }}>
          <Typography sx={{ fontSize: 24, fontWeight: 800, color: ACCENT }}>
            APC Exam Simulation
          </Typography>
          <Typography sx={{ mt: 0.5, opacity: 0.8, fontSize: 13 }}>
            Full-screen exam mode. No hints shown during the attempt.
          </Typography>
        </Card>

        {examState === 'setup' && (
          <Card sx={{ p: 2.5, border: BORDER, bgcolor: CARD_BG, borderRadius: '18px' }}>
            <Box sx={{ display: 'grid', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: '#cbd5e1' }}>Semester</InputLabel>
                <Select
                  value={semester}
                  label="Semester"
                  onChange={(e) => {
                    setSemester(e.target.value);
                    setSubject('');
                  }}
                  sx={{ color: '#fff' }}
                >
                  {SEMESTERS.map((s) => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth disabled={!semester}>
                <InputLabel sx={{ color: '#cbd5e1' }}>Subject</InputLabel>
                <Select
                  value={subject}
                  label="Subject"
                  onChange={(e) => setSubject(e.target.value)}
                  sx={{ color: '#fff' }}
                >
                  {(SUBJECTS[semester] || []).map((sub) => (
                    <MenuItem key={sub} value={sub}>{sub}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel sx={{ color: '#cbd5e1' }}>Questions</InputLabel>
                <Select
                  value={questionCount}
                  label="Questions"
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  sx={{ color: '#fff' }}
                >
                  {[10, 15, 20, 30].map((count) => (
                    <MenuItem key={count} value={count}>{count}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {error && <Alert severity="error">{error}</Alert>}

              <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
                <Button
                  variant="contained"
                  onClick={startExam}
                  disabled={loading}
                  sx={{ bgcolor: ACCENT, color: '#031417', fontWeight: 800 }}
                >
                  {loading ? <CircularProgress size={20} /> : 'Start Exam'}
                </Button>
                <Button variant="outlined" onClick={() => navigate('/dashboard')}>
                  Back to Dashboard
                </Button>
              </Box>
            </Box>
          </Card>
        )}

        {examState === 'active' && activeQuestion && (
          <Card sx={{ p: 2.5, border: BORDER, bgcolor: CARD_BG, borderRadius: '18px' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, gap: 2, flexWrap: 'wrap' }}>
              <Typography sx={{ fontWeight: 700 }}>
                Question {currentIndex + 1} / {questions.length}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Typography sx={{ color: '#ffd166', fontWeight: 700 }}>
                  Total: {toMMSS(timeLeft)}
                </Typography>
                <Typography sx={{ color: '#ff9f1c', fontWeight: 700 }}>
                  This Q: {toMMSS(questionTimeLeft)}
                </Typography>
              </Box>
            </Box>

            <Typography sx={{ fontSize: 16, fontWeight: 650, mb: 2 }}>
              {String(activeQuestion.question || '')}
            </Typography>

            <RadioGroup
              value={answers[currentIndex] || ''}
              onChange={(e) => handleAnswerChange(e.target.value)}
            >
              {(Array.isArray(activeQuestion.options) ? activeQuestion.options : []).map((opt, idx) => (
                <Card key={`${idx}-${String(opt)}`} sx={{ p: 1.2, mb: 1, bgcolor: 'rgba(255,255,255,0.03)', border: BORDER }}>
                  <Radio value={String(opt)} />
                  <Typography component="span">{String(opt)}</Typography>
                </Card>
              ))}
            </RadioGroup>

            <Box sx={{ display: 'flex', gap: 1.5, mt: 2 }}>
              <Button variant="outlined" onClick={goPrev} disabled={currentIndex === 0}>Previous</Button>
              <Button variant="contained" onClick={goNext} sx={{ bgcolor: ACCENT, color: '#031417', fontWeight: 800 }}>
                {currentIndex < questions.length - 1 ? 'Next' : 'Submit Exam'}
              </Button>
            </Box>
          </Card>
        )}

        {examState === 'submitted' && (
          <Card sx={{ p: 2.5, border: BORDER, bgcolor: CARD_BG, borderRadius: '18px', textAlign: 'center' }}>
            <CircularProgress sx={{ color: ACCENT }} />
            <Typography sx={{ mt: 1.5 }}>Submitting exam...</Typography>
          </Card>
        )}

        {examState === 'results' && result && (
          <Card sx={{ p: 2.5, border: BORDER, bgcolor: CARD_BG, borderRadius: '18px' }}>
            <Typography sx={{ fontSize: 22, fontWeight: 800, color: ACCENT }}>Results</Typography>
            <Typography sx={{ mt: 1 }}>Score: {result.correct}/{result.total} ({result.percent}%)</Typography>
            <Typography>Attempted: {result.attempted}</Typography>
            <Typography>Incorrect: {result.incorrect}</Typography>
            <Typography>Skipped: {result.skipped}</Typography>

            <Typography sx={{ mt: 2, mb: 1, fontWeight: 700 }}>Detailed Analysis</Typography>
            <Box sx={{ display: 'grid', gap: 1 }}>
              {questions.map((q, idx) => {
                const selected = answers[idx];
                const ok = isCorrectAnswer(selected, q);
                return (
                  <Card key={`analysis-${idx}`} sx={{ p: 1.2, border: BORDER, bgcolor: ok ? 'rgba(57,255,20,0.08)' : 'rgba(255,95,109,0.08)' }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                      Q{idx + 1}. {String(q.question || '')}
                    </Typography>
                    <Typography sx={{ fontSize: 12, mt: 0.5 }}>
                      Your Answer: {selected ? String(selected) : 'Not Attempted'}
                    </Typography>
                    <Typography sx={{ fontSize: 12 }}>
                      Correct: {String(q.correct_answer || '')}
                    </Typography>
                  </Card>
                );
              })}
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5, mt: 2 }}>
              <Button variant="contained" onClick={restart} sx={{ bgcolor: ACCENT, color: '#031417', fontWeight: 800 }}>
                Restart
              </Button>
              <Button variant="outlined" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </Button>
            </Box>
          </Card>
        )}
      </Box>
    </Box>
  );
};

export default ExamSimulationPage;
