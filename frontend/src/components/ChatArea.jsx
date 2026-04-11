import React from 'react';
import { Avatar, Box, Chip, IconButton, Paper, Typography } from '@mui/material';
import { SmartToy, Person, Stop, VolumeUp } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ChatArea = ({
  messages,
  isAiThinking,
  activeTool,
  normalizeToolKey,
  NEON_CYAN,
  NEON_PURPLE,
  speakingId,
  handleSpeak,
  TypewriterText,
  markTypingComplete,
  setIsGenerating,
  scrollToBottom,
  markdownComponents,
  handleSend,
  messagesEndRef,
  TypingIndicator,
  chatContainerRef,
  onChatScroll,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}
    >
      <Paper
        ref={chatContainerRef}
        onScroll={onChatScroll}
        sx={{
          flex: 1,
          bgcolor: normalizeToolKey(activeTool) === 'viva mentor' ? 'rgba(2, 10, 2, 0.92)' : 'transparent',
          border: normalizeToolKey(activeTool) === 'viva mentor' ? '1px solid rgba(57,255,20,0.35)' : 'none',
          boxShadow: normalizeToolKey(activeTool) === 'viva mentor' ? '0 0 24px rgba(57,255,20,0.12)' : 'none',
          borderRadius: 0,
          p: 2,
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          mb: 2,
          fontFamily: normalizeToolKey(activeTool) === 'viva mentor' ? 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' : 'inherit',
          '&::-webkit-scrollbar': { width: '8px' },
          '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: `${NEON_CYAN}30`,
            borderRadius: '4px',
            '&:hover': { bgcolor: `${NEON_CYAN}50` },
          },
        }}
      >
        {messages.length === 0 && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'rgba(255, 255, 255, 0.4)' }}>
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}>
              <Box sx={{ fontSize: '56px', mb: 2 }}>💭</Box>
            </motion.div>
            <Typography sx={{ fontSize: '18px', fontWeight: 500 }}>Start a conversation to learn</Typography>
            <Typography sx={{ fontSize: '13px', mt: 1, color: 'rgba(255, 255, 255, 0.3)' }}>Ask anything about your studies</Typography>
          </Box>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} exit={{ opacity: 0, y: -20 }}>
              <Box sx={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start', mb: 2.5, gap: 1.5, pr: msg.sender === 'user' ? 0 : 2 }}>
                {msg.sender === 'ai' && (
                  <IconButton size="small" onClick={() => handleSpeak(msg.text, msg.id)} sx={{ color: speakingId === msg.id ? NEON_PURPLE : NEON_CYAN, mt: 0.5 }}>
                    {speakingId === msg.id ? <Stop sx={{ fontSize: '16px' }} /> : <VolumeUp sx={{ fontSize: '16px' }} />}
                  </IconButton>
                )}
                {msg.sender === 'ai' && <Avatar sx={{ width: 36, height: 36, bgcolor: `${NEON_CYAN}20`, color: NEON_CYAN, border: `1px solid ${NEON_CYAN}40`, flexShrink: 0 }}><SmartToy sx={{ fontSize: '18px' }} /></Avatar>}
                <Box sx={{ maxWidth: msg.sender === 'user' ? '70%' : '75%', minWidth: 0 }}>
                  <motion.div whileHover={{ scale: 1.01 }}>
                    <Box sx={{ bgcolor: msg.sender === 'user' ? 'rgba(139, 134, 200, 0.15)' : (normalizeToolKey(activeTool) === 'viva mentor' ? 'rgba(1, 20, 1, 0.95)' : 'rgba(10, 13, 23, 0.9)'), border: 'none', color: normalizeToolKey(activeTool) === 'viva mentor' && msg.sender === 'ai' ? '#9dff8a' : '#FFFFFF', p: 2, borderRadius: '16px', wordBreak: 'break-word', overflowWrap: 'break-word', overflowX: 'hidden', lineHeight: 1.6, fontSize: '15px', whiteSpace: 'pre-wrap', backdropFilter: 'blur(12px)', boxShadow: msg.sender === 'user' ? `0 0 15px ${NEON_PURPLE}15` : 'none', fontFamily: normalizeToolKey(activeTool) === 'viva mentor' ? 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' : 'inherit' }}>
                      {msg.sender === 'ai' && !msg.isTypingComplete ? (
                        <TypewriterText
                          text={msg.text}
                          speed={25}
                          onProgress={scrollToBottom}
                          onComplete={() => {
                            markTypingComplete(msg.id);
                            setIsGenerating(false);
                          }}
                        />
                      ) : (
                        <ReactMarkdown children={msg.text} remarkPlugins={[remarkGfm]} components={markdownComponents} />
                      )}
                    </Box>
                  </motion.div>
                  {msg.sender === 'ai' && Array.isArray(msg.nextSuggestions) && msg.nextSuggestions.length > 0 && (
                    <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'nowrap', overflowX: 'auto', pb: 0.5, '&::-webkit-scrollbar': { height: '4px' }, '&::-webkit-scrollbar-thumb': { bgcolor: `${NEON_CYAN}55`, borderRadius: '6px' } }}>
                      {msg.nextSuggestions.map((text, idx) => (
                        <Chip
                          key={`${msg.id}-sugg-${idx}`}
                          label={text}
                          onClick={async () => {
                            await handleSend(text);
                          }}
                          sx={{
                            bgcolor: 'rgba(3, 218, 198, 0.12)',
                            color: '#E6EAF0',
                            border: '1px solid rgba(3, 218, 198, 0.3)',
                            backdropFilter: 'blur(12px)',
                            fontWeight: 500,
                            fontSize: '12px',
                            cursor: 'pointer',
                            transition: 'all 200ms ease',
                            '&:hover': {
                              bgcolor: 'rgba(3, 218, 198, 0.2)',
                              boxShadow: '0 0 12px rgba(3, 218, 198, 0.5)',
                            },
                          }}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
                {msg.sender === 'user' && <Avatar sx={{ width: 36, height: 36, bgcolor: `${NEON_PURPLE}30`, color: NEON_PURPLE, border: `1px solid ${NEON_PURPLE}40`, flexShrink: 0 }}><Person sx={{ fontSize: '18px' }} /></Avatar>}
              </Box>
            </motion.div>
          ))}
        </AnimatePresence>

        {isAiThinking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2.5, gap: 1.5 }}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: `${NEON_CYAN}20`, color: NEON_CYAN, border: `1px solid ${NEON_CYAN}40`, flexShrink: 0 }}><SmartToy sx={{ fontSize: '18px' }} /></Avatar>
              <Box sx={{ bgcolor: 'rgba(10, 13, 23, 0.9)', border: `1px solid rgba(255, 255, 255, 0.1)`, color: '#FFFFFF', p: 2, borderRadius: '16px', backdropFilter: 'blur(12px)' }}>
                <TypingIndicator />
              </Box>
            </Box>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </Paper>
    </motion.div>
  );
};

export default ChatArea;
