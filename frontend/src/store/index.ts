import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import type { User } from '@/types';
import { getCookie, setCookie, removeCookie } from '@/lib/api/client';

// ==========================================
// Cookie Storage for Zustand Persist
// ==========================================

const cookieStorage: StateStorage = {
  getItem: (name: string): string | null => {
    if (typeof document === 'undefined') return null;
    return getCookie(name) ?? null;
  },
  setItem: (name: string, value: string): void => {
    if (typeof document === 'undefined') return;
    setCookie(name, value, { days: 7, path: '/' });
  },
  removeItem: (name: string): void => {
    if (typeof document === 'undefined') return;
    removeCookie(name, { path: '/' });
  },
};

// ==========================================
// Auth Store
// ==========================================

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user: User) => set({ user, isAuthenticated: true }),
      clearUser: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'slos_auth_state',
      storage: createJSONStorage(() => cookieStorage),
    }
  )
);

// ==========================================
// UI Store
// ==========================================

export interface UIState {
  sidebarOpen: boolean;
  chatDrawerOpen: boolean;
  activeModal: string | null;
  toggleSidebar: (open?: boolean) => void;
  toggleChatDrawer: (open?: boolean) => void;
  setActiveModal: (modal: string | null) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen: true,
  chatDrawerOpen: false,
  activeModal: null,

  toggleSidebar: (open?: boolean) =>
    set((state) => ({
      sidebarOpen: open !== undefined ? open : !state.sidebarOpen,
    })),

  toggleChatDrawer: (open?: boolean) =>
    set((state) => ({
      chatDrawerOpen: open !== undefined ? open : !state.chatDrawerOpen,
    })),

  setActiveModal: (modal: string | null) =>
    set({ activeModal: modal }),
}));

// ==========================================
// Study Timer Store
// ==========================================

export interface StudyTimerState {
  isRunning: boolean;
  elapsedSeconds: number;
  chapterId: string | null;
  subjectId: string | null;
  start: (subjectId: string, chapterId: string) => void;
  pause: () => void;
  stop: () => void;
  reset: () => void;
  tick: () => void;
}

export const useStudyTimerStore = create<StudyTimerState>()((set) => ({
  isRunning: false,
  elapsedSeconds: 0,
  chapterId: null,
  subjectId: null,

  start: (subjectId: string, chapterId: string) =>
    set((state) => {
      // If switching to a new chapter or subject, reset elapsed timer
      const isNewTarget = state.chapterId !== chapterId || state.subjectId !== subjectId;
      return {
        isRunning: true,
        subjectId,
        chapterId,
        elapsedSeconds: isNewTarget ? 0 : state.elapsedSeconds,
      };
    }),

  pause: () =>
    set({ isRunning: false }),

  stop: () =>
    set({ isRunning: false }),

  reset: () =>
    set({
      isRunning: false,
      elapsedSeconds: 0,
      chapterId: null,
      subjectId: null,
    }),

  tick: () =>
    set((state) => (state.isRunning ? { elapsedSeconds: state.elapsedSeconds + 1 } : state)),
}));
