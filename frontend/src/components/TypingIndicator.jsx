import React from 'react';
import { Box } from '@mui/material';
import { motion } from 'framer-motion';

const NEON_PURPLE = '#bb86fc';
const NEON_CYAN = '#03dac6';

const TypingIndicator = () => (
  <Box sx={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
    {[0, 1, 2].map(i => (
      <motion.div
        key={i}
        animate={{ y: [0, -8, 0], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }}
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${NEON_CYAN}, ${NEON_PURPLE})`,
          boxShadow: `0 0 10px ${NEON_CYAN}`,
        }}
      />
    ))}
  </Box>
);

export default TypingIndicator;
