// Color System for BCABuddy - Light & Dark Modes
// CSS variables are defined in theme.css

export const LIGHT_THEME = {
  // Background
  bg: {
    primary: '#f7f6f3',
    secondary: '#efefed',
    tertiary: '#e8e7e4',
    overlay: 'rgba(255, 255, 255, 0.7)',
  },
  
  // Text
  text: {
    primary: '#111827',
    secondary: '#4b5563',
    tertiary: '#767e89',
    muted: 'rgba(17, 24, 39, 0.5)',
  },
  
  // Accent Colors
  neon: {
    cyan: '#03dac6',
    purple: '#bb86fc',
    green: '#39FF14',
  },
  
  // Chat Messages
  chat: {
    userBg: 'rgba(187, 134, 252, 0.15)',
    userBorder: 'rgba(187, 134, 252, 0.4)',
    aiBg: 'rgba(230, 234, 240, 0.6)',
    aiBorder: 'none',
    userText: '#111827',
    aiText: '#111827',
  },
  
  // Components
  card: {
    bg: 'rgba(255, 255, 255, 0.85)',
    border: 'rgba(17, 24, 39, 0.12)',
  },
  
  input: {
    bg: 'rgba(255, 255, 255, 0.8)',
    border: 'rgba(17, 24, 39, 0.15)',
    text: '#111827',
    placeholder: 'rgba(17, 24, 39, 0.4)',
  },
};

export const DARK_THEME = {
  // Background
  bg: {
    primary: '#0a0d17',
    secondary: '#0f1419',
    tertiary: '#1a1f2e',
    overlay: 'rgba(10, 13, 23, 0.85)',
  },
  
  // Text
  text: {
    primary: '#E6EAF0',
    secondary: '#c5cad4',
    tertiary: '#a8b0be',
    muted: 'rgba(230, 234, 240, 0.5)',
  },
  
  // Accent Colors
  neon: {
    cyan: '#03dac6',
    purple: '#bb86fc',
    green: '#39FF14',
  },
  
  // Chat Messages
  chat: {
    userBg: 'rgba(139, 134, 200, 0.15)',
    userBorder: 'none',
    aiBg: 'rgba(10, 13, 23, 0.9)',
    aiBorder: 'none',
    userText: '#E6EAF0',
    aiText: '#E6EAF0',
  },
  
  // Components
  card: {
    bg: 'rgba(18, 26, 52, 0.78)',
    border: 'rgba(255, 255, 255, 0.08)',
  },
  
  input: {
    bg: 'rgba(30, 41, 59, 0.5)',
    border: 'rgba(255, 255, 255, 0.1)',
    text: '#E6EAF0',
    placeholder: 'rgba(255, 255, 255, 0.4)',
  },
};

export const COLORS = {
  light: LIGHT_THEME,
  dark: DARK_THEME,
};

export const getTheme = (isDark = true) => {
  return isDark ? DARK_THEME : LIGHT_THEME;
};
