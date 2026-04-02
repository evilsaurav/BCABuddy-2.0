import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { School, ExpandMore } from '@mui/icons-material';
import { motion } from 'framer-motion';

const SidebarAcademicSetup = ({
  semester,
  subject,
  syllabus,
  onSemesterChange,
  onSubjectChange,
  neonCyan,
  neonPurple,
  glassBg,
  glassBorder,
}) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }}>
      <Accordion defaultExpanded sx={{ bgcolor: 'transparent', '&.MuiAccordion-root:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMore />} sx={{ color: neonCyan, fontWeight: 600, p: '8px 0' }}>
          <School sx={{ mr: 1.5, fontSize: '20px' }} /> Academic Setup
        </AccordionSummary>
        <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Semester</InputLabel>
            <Select
              value={semester}
              onChange={(event) => onSemesterChange(event.target.value)}
              sx={{
                color: '#E6EAF0',
                bgcolor: glassBg,
                border: glassBorder,
                borderRadius: '10px',
                backdropFilter: 'blur(12px)',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: neonPurple },
              }}
            >
              {Object.keys(syllabus || {}).map((item) => (
                <MenuItem key={item} value={item}>{item}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {semester && (
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Subject</InputLabel>
              <Select
                value={subject}
                onChange={(event) => onSubjectChange(event.target.value)}
                sx={{
                  color: '#E6EAF0',
                  bgcolor: glassBg,
                  border: glassBorder,
                  borderRadius: '10px',
                  backdropFilter: 'blur(12px)',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: neonCyan },
                }}
              >
                {Object.keys((syllabus && syllabus[semester]) || {}).map((item) => (
                  <MenuItem key={item} value={item}>{item}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </AccordionDetails>
      </Accordion>
    </motion.div>
  );
};

export default SidebarAcademicSetup;
