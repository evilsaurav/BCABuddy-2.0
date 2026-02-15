import React, { useEffect, useState } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BackButton = ({ onClick, showTooltip = false, tooltipText = 'Running away, Saurav? 😉' }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!showTooltip) return;
    setOpen(true);
    const t = setTimeout(() => setOpen(false), 1000);
    return () => clearTimeout(t);
  }, [showTooltip]);

  const handleClick = () => {
    if (onClick) return onClick();
    if (window.history.length > 1) navigate(-1);
    else navigate('/dashboard');
  };

  return (
    <Box sx={{ position: 'fixed', top: 16, left: 16, zIndex: 1400 }}>
      <Tooltip
        title={tooltipText}
        open={open}
        disableHoverListener
        disableFocusListener
        disableTouchListener
        placement="bottom"
      >
        <IconButton
          onClick={handleClick}
          sx={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            bgcolor: 'rgba(30, 41, 59, 0.45)',
            border: '1px solid rgba(3, 218, 198, 0.55)',
            backdropFilter: 'blur(10px)',
            color: '#E6EAF0',
            transition: 'all 200ms ease',
            '& svg': { transition: 'transform 200ms ease' },
            '&:hover': {
              boxShadow: '0 0 18px rgba(3, 218, 198, 0.55)',
              borderColor: 'rgba(3, 218, 198, 0.95)'
            },
            '&:hover svg': {
              transform: 'translateX(-2px)'
            }
          }}
        >
          <ChevronLeft size={20} />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default BackButton;
