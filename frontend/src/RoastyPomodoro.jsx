import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Play, Pause, RefreshCw, Flame } from 'lucide-react';

const roasts = [
  "Caught you slacking! Get back to MCS-024!",
  "Are you studying or just staring at the wall? The timer is running!",
  "Tick tock... BCA isn't going to pass itself.",
  "Your streak is crying right now. Focus!",
  "I see you opening that new tab. Close it!"
];

export default function RoastyPomodoro() {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [roastMessage, setRoastMessage] = useState("");

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0) {
      clearInterval(interval);
      setRoastMessage("Time's up! Take a break, you earned it (barely).");
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  // Tab visibility roast
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isActive) {
        setRoastMessage(roasts[Math.floor(Math.random() * roasts.length)]);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isActive]);

  const toggleTimer = () => {
    setIsActive(!isActive);
    if (!isActive) setRoastMessage("");
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(25 * 60);
    setRoastMessage("");
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      style={{
        background: "rgba(19, 19, 32, 0.6)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        borderRadius: "var(--bento-radius, 24px)",
        padding: "2rem",
        backdropFilter: "blur(12px)",
        textAlign: "center",
        color: "white"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "1rem", color: "#F87171" }}>
        <Flame size={24} />
        <h3 style={{ margin: 0, fontSize: "1.2rem" }}>Roasty Pomodoro</h3>
      </div>
      
      <div style={{ fontSize: "3rem", fontWeight: "bold", fontFamily: "monospace", margin: "1rem 0", color: "#00F0FF" }}>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginBottom: "1rem" }}>
        <button onClick={toggleTimer} style={{ background: isActive ? "#F87171" : "#10B981", color: "white", border: "none", padding: "0.8rem 1.5rem", borderRadius: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "bold" }}>
          {isActive ? <><Pause size={18} /> Pause</> : <><Play size={18} /> Start</>}
        </button>
        <button onClick={resetTimer} style={{ background: "rgba(255,255,255,0.1)", color: "white", border: "none", padding: "0.8rem", borderRadius: "12px", cursor: "pointer" }}>
          <RefreshCw size={18} />
        </button>
      </div>

      {roastMessage && (
        <motion.p 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          style={{ color: "#FBBF24", fontWeight: "bold", fontStyle: "italic", marginTop: "1rem" }}
        >
          {roastMessage}
        </motion.p>
      )}
    </motion.div>
  );
}
