import React from 'react';
import { Box, Typography, Divider, ListItem, ListItemText, IconButton } from '@mui/material';
import { Timer, Edit as EditIcon, Delete } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

const SidebarRecentHistory = ({
  recentChats,
  sessionId,
  neonCyan,
  onOpenSession,
  onRenameSession,
  onDeleteSession,
}) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25, duration: 0.5 }}>
      <Box sx={{ px: 1.5, py: 1 }}>
        <Typography sx={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Recent History
        </Typography>
      </Box>
      <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)' }} />
      <Box
        sx={{
          maxHeight: '220px',
          overflowY: 'auto',
          px: 1,
          pb: 1,
          '&::-webkit-scrollbar': { width: '6px' },
          '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
          '&::-webkit-scrollbar-thumb': { bgcolor: `${neonCyan}40`, borderRadius: '3px', '&:hover': { bgcolor: `${neonCyan}60` } },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {recentChats && recentChats.length > 0 ? (
            <AnimatePresence>
              {recentChats.map((session, idx) => (
                <motion.div key={session.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + idx * 0.04, duration: 0.35 }} exit={{ opacity: 0, x: -20 }}>
                  <ListItem
                    component="div"
                    role="button"
                    onClick={() => onOpenSession(session.id)}
                    sx={{
                      borderRadius: '8px',
                      bgcolor: sessionId === session.id ? `${neonCyan}20` : 'rgba(255, 255, 255, 0.03)',
                      border: sessionId === session.id ? `1.5px solid ${neonCyan}` : '1.5px solid rgba(255, 255, 255, 0.05)',
                      '&:hover': {
                        backgroundColor: sessionId === session.id ? `${neonCyan}25` : 'rgba(255, 255, 255, 0.08)',
                        borderColor: neonCyan,
                      },
                      backdropFilter: 'blur(12px)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      overflow: 'hidden',
                      py: 1,
                      px: 1.5,
                      cursor: 'pointer',
                      transition: 'all 200ms ease',
                    }}
                  >
                    <Timer sx={{ fontSize: 16, color: neonCyan }} />
                    <ListItemText
                      primary={session.title}
                      primaryTypographyProps={{ noWrap: true, className: 'truncate max-w-[150px] inline-block', sx: { fontSize: '13px', fontWeight: sessionId === session.id ? 600 : 400 } }}
                      sx={{ minWidth: 0, overflow: 'hidden' }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={(event) => {
                          event.stopPropagation();
                          onRenameSession(event, session.id);
                        }}
                        sx={{ color: neonCyan, '&:hover': { bgcolor: `${neonCyan}20` } }}
                      >
                        <EditIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteSession(event, session.id);
                        }}
                        sx={{ color: '#ff6b6b', '&:hover': { bgcolor: 'rgba(255, 107, 107, 0.15)' } }}
                      >
                        <Delete sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  </ListItem>
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              <Box sx={{ p: 2, textAlign: 'center', color: 'rgba(255, 255, 255, 0.3)', fontSize: '12px' }}>
                No chats yet. Start a new chat!
              </Box>
            </motion.div>
          )}
        </Box>
      </Box>
    </motion.div>
  );
};

export default SidebarRecentHistory;
