import React from 'react';
import { Box, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { Add } from '@mui/icons-material';
import { motion } from 'framer-motion';

const SidebarNewChatButton = ({ onNewChat, neonPurple }) => {
  return (
    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }}>
      <Box sx={{ px: 1 }}>
        <ListItem
          component="div"
          role="button"
          onClick={onNewChat}
          sx={{
            borderRadius: '12px',
            bgcolor: `${neonPurple}15`,
            border: `1.5px solid ${neonPurple}40`,
            '&:hover': {
              backgroundColor: `${neonPurple}25`,
              borderColor: `${neonPurple}60`
            },
            backdropFilter: 'blur(12px)',
            cursor: 'pointer',
            py: 1.2,
            px: 1.5,
            transition: 'all 200ms ease'
          }}
        >
          <ListItemIcon sx={{ color: neonPurple, minWidth: '36px' }}>
            <Add sx={{ fontSize: '20px' }} />
          </ListItemIcon>
          <ListItemText
            primary="New Chat"
            primaryTypographyProps={{ sx: { fontSize: '14px', fontWeight: 600 } }}
          />
        </ListItem>
      </Box>
    </motion.div>
  );
};

export default SidebarNewChatButton;
