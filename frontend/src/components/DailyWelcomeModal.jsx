import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BCA_MOTIVATIONAL_QUOTES } from '../utils/motivationalQuotes';
import BrandLogo from './BrandLogo';

const DailyWelcomeModal = ({ username }) => {
  const [show, setShow] = useState(false);
  const [quote, setQuote] = useState('');

  useEffect(() => {
    const lastSeen = localStorage.getItem('last_welcome_date');
    const today = new Date().toDateString();
    
    if (lastSeen !== today) {
      if (BCA_MOTIVATIONAL_QUOTES && BCA_MOTIVATIONAL_QUOTES.length > 0) {
        setQuote(BCA_MOTIVATIONAL_QUOTES[Math.floor(Math.random() * BCA_MOTIVATIONAL_QUOTES.length)]);
      } else {
        setQuote("Success is not final, failure is not fatal: it is the courage to continue that counts.");
      }
      setShow(true);
      localStorage.setItem('last_welcome_date', today);
    }
  }, []);

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(5, 5, 5, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
        onClick={() => setShow(false)}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          style={{
            background: 'linear-gradient(145deg, rgba(30, 30, 35, 0.9), rgba(15, 15, 20, 0.95))',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '24px',
            padding: '40px',
            maxWidth: '500px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            position: 'relative',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle glow effect behind */}
          <div style={{
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: 'radial-gradient(circle, rgba(3,218,198,0.15) 0%, transparent 50%)',
            pointerEvents: 'none',
            zIndex: 0
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <BrandLogo imgHeight={48} showTagline={false} />
            </div>
            
            <h2 style={{ 
              color: '#fff', 
              fontSize: '28px', 
              fontWeight: 800, 
              marginBottom: '16px',
              fontFamily: "'Outfit', sans-serif" 
            }}>
              Welcome Back, {username}! 👋
            </h2>
            
            <p style={{ 
              color: '#03dac6', 
              fontSize: '16px', 
              fontWeight: 600, 
              textTransform: 'uppercase', 
              letterSpacing: '1px',
              marginBottom: '24px' 
            }}>
              Ready to crush your goals today?
            </p>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '24px',
              borderRadius: '16px',
              borderLeft: '4px solid #bb86fc',
              marginBottom: '32px'
            }}>
              <p style={{ 
                color: 'rgba(255, 255, 255, 0.9)', 
                fontSize: '18px', 
                lineHeight: 1.6,
                fontStyle: 'italic',
                fontFamily: 'serif'
              }}>
                "{quote}"
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShow(false)}
              style={{
                background: 'linear-gradient(135deg, #03dac6, #bb86fc)',
                color: '#000',
                border: 'none',
                padding: '14px 40px',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(3, 218, 198, 0.3)',
                fontFamily: "'Outfit', sans-serif"
              }}
            >
              Let's Go! 🚀
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DailyWelcomeModal;
