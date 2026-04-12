import React, { useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import logoImage from '../assets/BcaBuddy.png';

const BrandLogo = ({
  variant = 'full',
  animated = true,
  imgHeight = 58,
  showTagline = false,
  align = 'left',
}) => {
  const [imageError, setImageError] = useState(false);

  const justifyContent = useMemo(() => {
    if (align === 'center') return 'center';
    if (align === 'right') return 'flex-end';
    return 'flex-start';
  }, [align]);

  const MotionWrap = animated ? motion.div : 'div';
  const motionProps = animated
    ? {
        initial: { opacity: 0, y: 6 },
        animate: {
          opacity: 1,
          y: [0, -2, 0],
          filter: [
            'drop-shadow(0 0 0 rgba(3,218,198,0))',
            'drop-shadow(0 6px 16px rgba(3,218,198,0.2))',
            'drop-shadow(0 0 0 rgba(3,218,198,0))',
          ],
        },
        transition: {
          opacity: { duration: 0.3 },
          y: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
          filter: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
        },
      }
    : {};

  return (
    <Box sx={{ display: 'flex', justifyContent, width: '100%' }}>
      <MotionWrap {...motionProps}>
        {imageError ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: align === 'center' ? 'center' : 'flex-start' }}>
            <Typography
              sx={{
                fontWeight: 900,
                fontSize: variant === 'compact' ? 18 : 24,
                letterSpacing: '-0.02em',
                background: 'linear-gradient(120deg, #1d4ed8, #06b6d4)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              BCABuddy
            </Typography>
            {showTagline && (
              <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                AI Study Companion
              </Typography>
            )}
          </Box>
        ) : (
          <img
            src={logoImage}
            alt="BCABuddy"
            style={{
              height: variant === 'compact' ? Math.max(30, Math.floor(imgHeight * 0.7)) : imgHeight,
              width: 'auto',
              maxWidth: variant === 'compact' ? '170px' : '100%',
              objectFit: 'contain',
            }}
            onError={() => setImageError(true)}
          />
        )}
      </MotionWrap>
    </Box>
  );
};

export default BrandLogo;
