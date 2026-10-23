import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean; // Mobile drawer open/close
  sidebarCollapsed: boolean; // Desktop sidebar collapsed state
  chatDrawerOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleChatDrawer: (open?: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  sidebarCollapsed: false,
  chatDrawerOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebarCollapsed: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleChatDrawer: (open) =>
    set((state) => ({
      chatDrawerOpen: open !== undefined ? open : !state.chatDrawerOpen,
    })),
}));
