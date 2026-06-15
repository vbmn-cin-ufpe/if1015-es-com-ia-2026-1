import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  user_id: string;
  email: string;
  role: string;      // "admin" | "free" | "paid" | "enterprise"
  plan: string;      // "free" | "paid" | "enterprise"
  email_verified: boolean;
  repos_indexed_count: number;
  questions_asked_count: number;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  updateUser: (partial: Partial<AuthUser>) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      updateUser: (partial) =>
        set((s) => ({ user: s.user ? { ...s.user, ...partial } : null })),
      clear: () => set({ token: null, user: null }),
    }),
    {
      name: "codecompass-auth",
      partialize: (s) => ({ token: s.token, user: s.user }),
    },
  ),
);
