import React, { useState } from 'react';
import { Box, Tabs, Tab, IconButton, Typography } from '@mui/material';
import { Close as CloseIcon, Quiz as QuizIcon, Timer as TimerIcon } from '@mui/icons-material';
import QuizSection from './QuizSection';
import ExamSimulator from './ExamSimulator';

const AssessmentCenter = ({ defaultTab = 'quiz', semester, subject, onClose, API_BASE, globalAbortRef }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  // Design Tokens for UI Consistency
  const NEON_CYAN = '#03DAC6';
  const NEON_PURPLE = '#BB86FC';
  const GLASS_BG = 'rgba(30, 30, 40, 0.7)';
  const GLASS_BORDER = '1px solid rgba(255,255,255,0.1)';

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      bgcolor: 'transparent'
    }}>
      {/* Header and Tabs */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        bgcolor: GLASS_BG,
        backdropFilter: 'blur(12px)',
        borderBottom: GLASS_BORDER,
        px: 2,
        pt: 1
      }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, val) => setActiveTab(val)}
          sx={{
            minHeight: '48px',
            '& .MuiTabs-indicator': {
              backgroundColor: activeTab === 'quiz' ? NEON_PURPLE : NEON_CYAN,
              height: '3px',
              borderTopLeftRadius: '3px',
              borderTopRightRadius: '3px',
            }
          }}
        >
          <Tab 
            icon={<QuizIcon sx={{ mr: 1, fontSize: 18 }} />} 
            iconPosition="start"
            label="Practice Quiz" 
            value="quiz"
            sx={{ 
              minHeight: '48px', 
              textTransform: 'none', 
              fontWeight: activeTab === 'quiz' ? 700 : 500,
              color: activeTab === 'quiz' ? NEON_PURPLE : 'rgba(255,255,255,0.7)',
              '&.Mui-selected': { color: NEON_PURPLE }
            }}
          />
          <Tab 
            icon={<TimerIcon sx={{ mr: 1, fontSize: 18 }} />} 
            iconPosition="start"
            label="Exam Simulator" 
            value="exam"
            sx={{ 
              minHeight: '48px', 
              textTransform: 'none', 
              fontWeight: activeTab === 'exam' ? 700 : 500,
              color: activeTab === 'exam' ? NEON_CYAN : 'rgba(255,255,255,0.7)',
              '&.Mui-selected': { color: NEON_CYAN }
            }}
          />
        </Tabs>
        
        <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#fff' } }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Main Content Area */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'quiz' && (
          <QuizSection 
            onClose={onClose} 
            API_BASE={API_BASE}
            globalAbortRef={globalAbortRef}
          />
        )}
        {activeTab === 'exam' && (
          <ExamSimulator 
            semester={semester} 
            subject={subject} 
            onClose={onClose}
            API_BASE={API_BASE}
            globalAbortRef={globalAbortRef}
          />
        )}
      </Box>
    </Box>
  );
};

export default AssessmentCenter;
