import { create } from 'zustand';
import type { User } from '../types';
import { api } from '../services/api';
import { useCartStore } from './useCartStore';

interface AuthState {
  user: User | null;
  loading: boolean;
  fetchMe: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  fetchMe: async () => {
    set({ loading: true });
    try {
      const user = await api.auth.me();
      set({ user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },

  login: async (email, password) => {
    const user = await api.auth.login({ email, password });
    set({ user });
    await useCartStore.getState().syncWithServer();
  },

  register: async (data) => {
    const user = await api.auth.register(data);
    set({ user });
    await useCartStore.getState().syncWithServer();
  },

  logout: async () => {
    try {
      await api.auth.logout();
    } finally {
      set({ user: null });
      useCartStore.getState().clear();
    }
  },
}));
