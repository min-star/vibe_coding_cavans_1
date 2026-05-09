import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (payload: { token: string; user: User }) => void;
  logout: () => void;
}

const storedToken = localStorage.getItem('tapnow-token');
const storedUser = localStorage.getItem('tapnow-user');

export const useAuthStore = create<AuthState>((set) => ({
  token: storedToken,
  user: storedUser ? (JSON.parse(storedUser) as User) : null,
  setAuth: ({ token, user }) => {
    localStorage.setItem('tapnow-token', token);
    localStorage.setItem('tapnow-user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('tapnow-token');
    localStorage.removeItem('tapnow-user');
    set({ token: null, user: null });
  }
}));

