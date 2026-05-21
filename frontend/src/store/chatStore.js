import { create } from 'zustand';

export const useChatStore = create((set, get) => ({
  // Core State
  messages: [],
  input: '',
  currentAnswer: '',
  
  // Status Flags
  isAiThinking: false,
  isGenerating: false,
  speakingId: null,
  
  // Session State
  sessionId: null,
  sessions: [],
  recentChats: [],
  
  // Tool & Context State
  activeTool: null,
  chatSuggestions: [],
  hideSuggestions: false,
  
  // Actions
  setMessages: (messagesOrUpdater) => 
    set((state) => ({
      messages: typeof messagesOrUpdater === 'function' 
        ? messagesOrUpdater(state.messages) 
        : messagesOrUpdater
    })),
    
  setInput: (input) => set({ input }),
  setCurrentAnswer: (currentAnswer) => set({ currentAnswer }),
  
  setIsAiThinking: (isAiThinking) => set({ isAiThinking }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setSpeakingId: (speakingId) => set({ speakingId }),
  
  setSessionId: (sessionId) => set({ sessionId }),
  setSessions: (sessions) => set({ sessions }),
  setRecentChats: (recentChats) => set({ recentChats }),
  
  setActiveTool: (activeTool) => set({ activeTool }),
  setChatSuggestions: (chatSuggestions) => set({ chatSuggestions }),
  setHideSuggestions: (hideSuggestions) => set({ hideSuggestions }),

  // Helper actions
  clearChat: () => set({ 
    messages: [], 
    input: '', 
    currentAnswer: '', 
    isAiThinking: false, 
    isGenerating: false, 
    sessionId: null,
    activeTool: null 
  }),
  
  addMessage: (msg) => set((state) => ({ 
    messages: [...state.messages, msg] 
  })),
  
  upsertMessage: (msg) => set((state) => {
    const idx = state.messages.findIndex(m => m.id === msg.id);
    if (idx >= 0) {
      const newMsgs = [...state.messages];
      newMsgs[idx] = { ...newMsgs[idx], ...msg };
      return { messages: newMsgs };
    }
    return { messages: [...state.messages, msg] };
  }),
  
  markTypingComplete: (msgId) => set((state) => ({
    messages: state.messages.map((m) => 
      m.id === msgId ? { ...m, isTypingComplete: true } : m
    )
  }))
}));
