import React from 'react';
import { Box, Typography } from '@mui/material';
import { TypewriterText } from './MarkdownRenderer';
import { getJiyaRemarkText } from '../utils/dashboardUtils';

const NEON_CYAN = '#03dac6';

const JiyaRemark = ({ score, candidateName }) => {
  const remark = getJiyaRemarkText(score, candidateName);
  return (
    <Box sx={{ mt: 1.2, p: 1.5, borderRadius: '14px', bgcolor: 'rgba(3, 218, 198, 0.06)', border: `1px solid ${NEON_CYAN}25` }}>
      <Typography sx={{ color: NEON_CYAN, fontWeight: 800, fontSize: '12px', letterSpacing: '0.12em' }}>
        JIYA REMARK
      </Typography>
      <Box sx={{ color: '#E6EAF0', mt: 0.8, fontSize: '13px', lineHeight: 1.55 }}>
        <TypewriterText key={String(score ?? 'na')} text={remark} speed={16} />
      </Box>
    </Box>
  );
};

export default JiyaRemark;
