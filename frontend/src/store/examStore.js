import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useExamStore = create(
  persist(
    (set) => ({
      quizData: [],
      currentQuestionIndex: 0,
      responses: {},
      markedQuestions: [],
      timeRemaining: 45 * 60,
      isExamActive: false,
      userAnswers: {},
      questionCount: 15,
      durationMinutes: 45,
      subject: '',
      semester: '',
      examRunId: null,

      setExamState: (newState) => set((state) => ({ ...state, ...newState })),
      clearExamState: () => set({
        quizData: [],
        currentQuestionIndex: 0,
        responses: {},
        markedQuestions: [],
        timeRemaining: 45 * 60,
        isExamActive: false,
        userAnswers: {},
        subject: '',
        semester: '',
        examRunId: null,
      })
    }),
    {
      name: 'bcabuddy-exam-storage',
    }
  )
);
