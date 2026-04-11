import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = ({ className = '' }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`theme-toggle-btn ${className}`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      style={{
        background: isDark ? 'rgba(187, 134, 252, 0.2)' : 'rgba(3, 218, 198, 0.2)',
        border: isDark ? '1px solid rgba(187, 134, 252, 0.4)' : '1px solid rgba(3, 218, 198, 0.4)',
        borderRadius: '50%',
        width: '44px',
        height: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        color: isDark ? '#bb86fc' : '#03dac6',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = isDark ? 'rgba(187, 134, 252, 0.3)' : 'rgba(3, 218, 198, 0.3)';
        e.currentTarget.style.boxShadow = isDark ? '0 0 12px rgba(187, 134, 252, 0.4)' : '0 0 12px rgba(3, 218, 198, 0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = isDark ? 'rgba(187, 134, 252, 0.2)' : 'rgba(3, 218, 198, 0.2)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
};

export default ThemeToggle;
