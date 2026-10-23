import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ChatSession, ChatMessage, AgentId, LLMProviderId, ChatLevel } from '@/types';
import { ACADEMIC_AGENTS } from './llm-store';

interface ChatSessionsState {
  sessions: ChatSession[];
  activeSessionId: string | null;

  // Actions
  createSession: (options?: {
    agentId?: AgentId;
    subjectId?: string;
    chapterId?: string;
    title?: string;
    level?: ChatLevel;
    provider?: LLMProviderId;
    model?: string;
  }) => string;

  setActiveSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  renameSession: (sessionId: string, title: string) => void;
  clearSessionMessages: (sessionId: string) => void;
  setSessionAgent: (sessionId: string, agentId: AgentId) => void;
  setSessionLevel: (sessionId: string, level: ChatLevel) => void;
  setSessionSubject: (sessionId: string, subjectId?: string, chapterId?: string) => void;
  addMessage: (sessionId: string, message: ChatMessage) => void;
  updateMessageContent: (sessionId: string, messageId: string, content: string) => void;
  getActiveSession: () => ChatSession | null;
}

const DEFAULT_FIRST_SESSION: ChatSession = {
  id: 'session-default-tutor',
  title: 'Calculus Limits & Conceptual Proofs',
  agentId: 'tutor',
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  subjectId: 'sub-1',
  level: 'simple',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  messages: [
    {
      id: 'welcome-tutor-1',
      role: 'assistant',
      content: `Hello! I am your **Academic Tutor Agent**. 🎓\n\nI can help you understand tough conceptual topics, walk through mathematical derivations, and break down complex ideas step-by-step.\n\nWhat would you like to explore or solve together today?`,
      level: 'simple',
      created_at: new Date().toISOString(),
    },
  ],
};

export const useChatSessionsStore = create<ChatSessionsState>()(
  persist(
    (set, get) => ({
      sessions: [DEFAULT_FIRST_SESSION],
      activeSessionId: DEFAULT_FIRST_SESSION.id,

      createSession: (options = {}) => {
        const id = `session-${Date.now()}`;
        const agentId = options.agentId || 'tutor';
        const agent = ACADEMIC_AGENTS[agentId];
        const newTitle = options.title || `New ${agent.shortName} Chat`;

        const welcomeMsg: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: `Hi there! I am the **${agent.name}**. ✨\n\n${agent.description}\n\n*Choose a suggested prompt below or type your question to get started!*`,
          level: options.level || 'simple',
          created_at: new Date().toISOString(),
        };

        const newSession: ChatSession = {
          id,
          title: newTitle,
          agentId,
          provider: options.provider || 'gemini',
          model: options.model || 'gemini-2.5-flash',
          subjectId: options.subjectId,
          chapterId: options.chapterId,
          level: options.level || 'simple',
          messages: [welcomeMsg],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          sessions: [newSession, ...state.sessions],
          activeSessionId: id,
        }));

        return id;
      },

      setActiveSession: (sessionId) => {
        set({ activeSessionId: sessionId });
      },

      deleteSession: (sessionId) => {
        set((state) => {
          const filtered = state.sessions.filter((s) => s.id !== sessionId);
          const nextActive =
            state.activeSessionId === sessionId
              ? filtered.length > 0
                ? filtered[0].id
                : null
              : state.activeSessionId;

          return {
            sessions: filtered,
            activeSessionId: nextActive,
          };
        });
      },

      renameSession: (sessionId, title) => {
        const trimmed = title.trim();
        if (!trimmed) return;
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, title: trimmed, updatedAt: new Date().toISOString() } : s
          ),
        }));
      },

      clearSessionMessages: (sessionId) => {
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            const agent = ACADEMIC_AGENTS[s.agentId];
            return {
              ...s,
              messages: [
                {
                  id: `msg-${Date.now()}`,
                  role: 'assistant',
                  content: `Conversation cleared. I am your **${agent.name}**, ready when you are!`,
                  level: s.level,
                  created_at: new Date().toISOString(),
                },
              ],
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      setSessionAgent: (sessionId, agentId) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, agentId, updatedAt: new Date().toISOString() } : s
          ),
        }));
      },

      setSessionLevel: (sessionId, level) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, level, updatedAt: new Date().toISOString() } : s
          ),
        }));
      },

      setSessionSubject: (sessionId, subjectId, chapterId) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, subjectId, chapterId, updatedAt: new Date().toISOString() } : s
          ),
        }));
      },

      addMessage: (sessionId, message) => {
        set((state) => {
          return {
            sessions: state.sessions.map((s) => {
              if (s.id !== sessionId) return s;
              // If title is default "New ... Chat" and this is first user message, generate title
              let updatedTitle = s.title;
              if (message.role === 'user' && s.title.startsWith('New ') && s.messages.length <= 1) {
                updatedTitle =
                  message.content.length > 36
                    ? `${message.content.slice(0, 36).trim()}...`
                    : message.content;
              }
              return {
                ...s,
                title: updatedTitle,
                messages: [...s.messages, message],
                updatedAt: new Date().toISOString(),
              };
            }),
          };
        });
      },

      updateMessageContent: (sessionId, messageId, content) => {
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            return {
              ...s,
              messages: s.messages.map((m) =>
                m.id === messageId ? { ...m, content } : m
              ),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      getActiveSession: () => {
        const state = get();
        if (!state.activeSessionId) return state.sessions[0] || null;
        return state.sessions.find((s) => s.id === state.activeSessionId) || state.sessions[0] || null;
      },
    }),
    {
      name: 'slos_chat_sessions_v1',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      })),
    }
  )
);
