import React, { useMemo } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { getExamTrackerSummary } from '../utils/examSchedule';

const ExamCountdown = ({ semester, subject, tracker = null }) => {
  const summary = useMemo(() => {
    if (tracker && typeof tracker === 'object') return tracker;
    return getExamTrackerSummary(new Date());
  }, [tracker]);

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: '14px',
        background: 'linear-gradient(135deg, rgba(3, 218, 198, 0.12), rgba(187, 134, 252, 0.12))',
        border: '1px solid rgba(3, 218, 198, 0.28)',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
        <Typography sx={{ color: '#03dac6', fontWeight: 800, fontSize: '12px', letterSpacing: '0.06em' }}>
          EXAM TRACKER
        </Typography>
        <Chip
          size="small"
          label={`${summary.daysLeft} days left`}
          sx={{
            height: 22,
            bgcolor: 'rgba(3, 218, 198, 0.15)',
            color: '#7ff7ea',
            border: '1px solid rgba(3, 218, 198, 0.45)',
            fontWeight: 700,
          }}
        />
      </Box>

      <Typography sx={{ color: '#e6eaf0', mt: 1, fontSize: '13px', fontWeight: 700 }}>
        {summary.sessionName} - {summary.examDate.toLocaleDateString()}
      </Typography>

      <Typography sx={{ color: 'rgba(230, 234, 240, 0.92)', mt: 0.8, fontSize: '12px', lineHeight: 1.45 }}>
        {summary.daysLeft > 0
          ? `Teri exam ${summary.daysLeft} din baad hai${subject ? ` (${subject})` : ''}. ${summary.dailyPlan}`
          : 'Exam window start ho chuka hai. Aaj PYQ-first revision karo.'}
      </Typography>

      {!!semester && (
        <Typography sx={{ color: 'rgba(3, 218, 198, 0.78)', mt: 0.8, fontSize: '11px' }}>
          Active setup: {semester}{subject ? ` • ${subject}` : ''}
        </Typography>
      )}
    </Box>
  );
};

export default ExamCountdown;
