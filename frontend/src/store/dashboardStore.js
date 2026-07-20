import { create } from 'zustand';

export const useDashboardStore = create((set) => ({
  mobileOpen: false,
  activeView: 'chat',
  semester: '',
  subject: '',
  mode: 'auto',
  isOffline: false,
  
  // Modals / Overlays
  quizModalOpen: false,
  showExamSimulator: false,
  showQuizSection: false,
  showAdvancedTools: false,
  
  // Dashboard overall stats
  dashboardStats: { total_sessions: 0, last_subject: 'N/A', study_hours: 0, avg_quiz_score: 85 },
  syllabusProgress: { subject: null, total_topics: 0, covered_topics: [], covered_count: 0, completion_pct: 0 },
  
  // Tool Tracking
  toolLoadingState: null,
  scanningImage: false,

  // Actions
  setMobileOpen: (mobileOpen) => set({ mobileOpen }),
  setActiveView: (activeView) => set({ activeView }),
  setSemester: (semester) => set({ semester }),
  setSubject: (subject) => set({ subject }),
  setMode: (mode) => set({ mode }),
  setIsOffline: (isOffline) => set({ isOffline }),
  
  setQuizModalOpen: (quizModalOpen) => set({ quizModalOpen }),
  setShowExamSimulator: (showExamSimulator) => set({ showExamSimulator }),
  setShowQuizSection: (showQuizSection) => set({ showQuizSection }),
  setShowAdvancedTools: (showAdvancedTools) => set({ showAdvancedTools }),
  
  setDashboardStats: (dashboardStats) => set({ dashboardStats }),
  setSyllabusProgress: (syllabusProgress) => set({ syllabusProgress }),
  setToolLoadingState: (toolLoadingState) => set({ toolLoadingState }),
  setScanningImage: (scanningImage) => set({ scanningImage }),

  profilePic: (() => {
    const stored = localStorage.getItem('profilePic');
    return stored && String(stored).trim() ? stored : null;
  })(),
  updateProfilePic: (newUrl) => {
    const next = newUrl && String(newUrl).trim() ? String(newUrl).trim() : null;
    set({ profilePic: next });
    if (next) localStorage.setItem('profilePic', next);
    else localStorage.removeItem('profilePic');
  }
}));
