import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const IGNOU_BCA_FACTS = [
  "IGNOU is the largest university in the world, with over 3 million active students.",
  "The BCA programme consists of 39 courses worth 99 credits across 6 semesters.",
  "IGNOU study materials (eGyankosh) are widely referred to even by students of other universities.",
  "Assignments carry a huge 25-30% weightage in your final grade, so don't skip them!",
  "Term-end examinations (TEE) are held twice a year: June and December.",
  "BCS-011 (Computer Basics) is where every BCA journey officially begins.",
  "You need a minimum of 40% marks in both assignments and TEE to pass a BCA course.",
  "IGNOU was established in 1985 by an Act of Parliament.",
  "Practicing Previous Year Questions (PYQs) is the proven secret to scoring high in IGNOU exams.",
  "MCS-021 (Data and File Structures) is one of the most critical subjects for software engineering interviews.",
  "BCABuddy analyzes thousands of past IGNOU questions to predict your exact exam topics!"
];

const C = {
  accent: '#03dac6',
  purple: '#bb86fc',
  textSecondary: '#a0a0a0'
};

const LoadingFacts = ({ message = "Loading..." }) => {
  const [factIndex, setFactIndex] = useState(0);

  useEffect(() => {
    // Change fact every 3.5 seconds
    const interval = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % IGNOU_BCA_FACTS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px' }}>
      {/* Cool Spinning Loader */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: `3px solid rgba(255, 255, 255, 0.1)`,
          borderTopColor: C.accent,
          borderRightColor: C.purple,
          marginBottom: '24px'
        }}
      />
      
      {/* Primary Loading Message */}
      <motion.h3
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{ color: '#fff', fontSize: '18px', fontWeight: 600, margin: '0 0 16px 0' }}
      >
        {message}
      </motion.h3>

      {/* Dynamic Facts */}
      <div style={{ minHeight: '60px', maxWidth: '400px' }}>
        <AnimatePresence mode="wait">
          <motion.p
            key={factIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
            style={{ 
              color: C.textSecondary, 
              fontSize: '14px', 
              fontStyle: 'italic',
              lineHeight: 1.5,
              margin: 0
            }}
          >
            <span style={{ color: C.accent, fontWeight: 600, fontStyle: 'normal' }}>Did you know?</span><br />
            {IGNOU_BCA_FACTS[factIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LoadingFacts;
