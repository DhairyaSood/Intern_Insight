import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/auth';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      error: null,

      // Login with JWT
      login: async (username, password) => {
        set({ error: null });
        try {
          const data = await authService.login(username, password);
          
          set({
            user: { 
              username: data.username,
              candidate_id: data.candidate_id
            },
            isAuthenticated: true,
          });
          
          return data;
        } catch (error) {
          const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Login failed';
          set({ error: errorMsg, isAuthenticated: false });
          throw new Error(errorMsg);
        }
      },

      // Signup
      signup: async (username, password) => {
        set({ error: null });
        try {
          const data = await authService.signup(username, password);
          return data;
        } catch (error) {
          const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Signup failed';
          set({ error: errorMsg });
          throw new Error(errorMsg);
        }
      },

      // Logout
      logout: async () => {
        try {
          await authService.logout();
        } finally {
          set({ 
            user: null, 
            isAuthenticated: false, 
            error: null 
          });
        }
      },

      // Check auth status with JWT
      checkAuth: async () => {
        const token = authService.getToken();
        
        // If no token in localStorage, user is not authenticated
        if (!token) {
          set({ user: null, isAuthenticated: false });
          return false;
        }
        
        try {
          const data = await authService.checkStatus();
          
          if (data.logged_in) {
            set({ 
              user: { 
                username: data.username,
                candidate_id: data.candidate_id
              }, 
              isAuthenticated: true 
            });
            return true;
          } else {
            set({ user: null, isAuthenticated: false });
            return false;
          }
        } catch (error) {
          // Token invalid or expired
          set({ user: null, isAuthenticated: false });
          return false;
        }
      },

      // Initialize auth from localStorage
      initAuth: () => {
        const token = authService.getToken();
        const userData = authService.getCurrentUser();
        
        if (token && userData.username && userData.candidate_id) {
          set({
            user: userData,
            isAuthenticated: true
          });
        } else {
          set({
            user: null,
            isAuthenticated: false
          });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
