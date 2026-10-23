import { create } from "zustand";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, token: string, refreshToken?: string) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  initialize: () => void;
}

const TOKEN_COOKIE_NAME = "auth_token";
const USER_STORAGE_KEY = "slos_user";
const TOKEN_STORAGE_KEY = "slos_token";

// Helper to set cookie
function setAuthCookie(token: string, days = 7) {
  if (typeof document === "undefined") return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${TOKEN_COOKIE_NAME}=${encodeURIComponent(
    token
  )}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

// Helper to remove cookie
function removeAuthCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${TOKEN_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: (user, token, refreshToken) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
        if (refreshToken) {
          localStorage.setItem("slos_refresh_token", refreshToken);
        }
        setAuthCookie(token);
      } catch (e) {
        console.error("Failed to persist auth state", e);
      }
    }
    set({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(USER_STORAGE_KEY);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem("slos_refresh_token");
        removeAuthCookie();
      } catch (e) {
        console.error("Failed to clear auth state", e);
      }
    }
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  updateUser: (userData) => {
    const currentUser = get().user;
    if (!currentUser) return;
    const updatedUser = { ...currentUser, ...userData };
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
      } catch (e) {
        console.error("Failed to update user in storage", e);
      }
    }
    set({ user: updatedUser });
  },

  initialize: () => {
    if (typeof window === "undefined") {
      set({ isLoading: false });
      return;
    }

    try {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);

      if (storedToken && storedUser) {
        const user = JSON.parse(storedUser) as User;
        setAuthCookie(storedToken);
        set({
          user,
          token: storedToken,
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      }
    } catch (e) {
      console.error("Failed to initialize auth store", e);
    }

    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },
}));
