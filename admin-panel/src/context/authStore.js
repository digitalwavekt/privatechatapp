import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,

      setAuth: (user, token) => {
        set({ user, token });
      },

      logout: () => {
        set({ user: null, token: null });
        localStorage.clear();
      },

      getToken: () => get().token,
    }),
    {
      name: 'pvchat-admin-auth',
    }
  )
);