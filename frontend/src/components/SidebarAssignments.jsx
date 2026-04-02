import React from 'react';
import { Box, Typography, Tooltip, Button, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { Summarize, ExpandMore } from '@mui/icons-material';
import { motion } from 'framer-motion';

const TOOL_DESCRIPTIONS = {
  Assignments: 'Problem-solving practice',
  PYQs: 'Previous year papers',
  Notes: 'Revision notes',
  Viva: 'Interview Q&A',
  'Lab Work': 'Practical code',
  Summary: 'Content condensed',
};

const SidebarAssignments = ({
  tools,
  activeTool,
  subject,
  semester,
  onToolClick,
  neonCyan,
  neonPurple,
  glassBg,
  glassBorder,
}) => {
  const isDisabled = !subject || !semester;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.5 }}>
      <Accordion defaultExpanded sx={{ bgcolor: 'transparent', '&.MuiAccordion-root:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMore />} sx={{ color: neonCyan, fontWeight: 600, p: '8px 0' }}>
          <Summarize sx={{ mr: 1.5, fontSize: '20px' }} /> Assignments
        </AccordionSummary>
        <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1 }}>
          {tools.map((tool, idx) => {
            const IconComp = tool.icon;
            const isActive = activeTool === tool.label;
            return (
              <motion.div key={idx} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Tooltip title={TOOL_DESCRIPTIONS[tool.label] || tool.label} placement="right">
                  <span style={{ display: 'block' }}>
                    <Button
                      fullWidth
                      size="small"
                      onClick={() => onToolClick(tool)}
                      disabled={isDisabled}
                      sx={{
                        bgcolor: isActive ? `${neonCyan}30` : glassBg,
                        border: isActive ? `1px solid ${neonCyan}` : glassBorder,
                        borderRadius: '8px',
                        color: '#E6EAF0',
                        textTransform: 'none',
                        justifyContent: 'flex-start',
                        backdropFilter: 'blur(12px)',
                        transition: 'all 200ms',
                        '&:hover': { backgroundColor: `${neonCyan}20`, borderColor: `${neonCyan}60` },
                        '&:disabled': { color: 'rgba(255, 255, 255, 0.3)', borderColor: 'rgba(255, 255, 255, 0.05)' },
                      }}
                    >
                      <IconComp sx={{ fontSize: 18, mr: 1.5, color: isActive ? neonCyan : neonPurple }} />
                      <Typography sx={{ fontSize: '14px', fontWeight: 500 }}>{tool.label}</Typography>
                      {isActive && <Box sx={{ ml: 'auto', width: '6px', height: '6px', borderRadius: '50%', bgcolor: neonCyan, boxShadow: `0 0 8px ${neonCyan}` }} />}
                    </Button>
                  </span>
                </Tooltip>
              </motion.div>
            );
          })}
        </AccordionDetails>
      </Accordion>
    </motion.div>
  );
};

export default SidebarAssignments;
