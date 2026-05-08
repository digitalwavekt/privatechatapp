import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,

      setAuth: (user, token, refreshToken) => {
        set({ user, token, refreshToken });
      },

      updateUser: (updates) => {
        set((state) => ({
          user: { ...state.user, ...updates }
        }));
      },

      logout: () => {
        set({ user: null, token: null, refreshToken: null });
        localStorage.removeItem('pvchat-auth');
      },

      getToken: () => get().token,
    }),
    {
      name: 'pvchat-auth',
    }
  )
);