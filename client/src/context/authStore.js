import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,

      setAuth: (user, token, refreshToken) => {
        set({
          user,
          token,
          refreshToken: refreshToken || null,
        });
      },

      updateUser: (updates) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : updates,
        }));
      },

      logout: () => {
        set({ user: null, token: null, refreshToken: null });
      },

      getToken: () => get().token,
    }),
    {
      name: 'pvchat-auth',
      storage: createJSONStorage(() => localStorage),
    }
  )
);