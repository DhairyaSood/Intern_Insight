import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useThemeStore = create(
  persist(
    (set) => ({
      isDark: false,
      
      toggleTheme: () => set((state) => {
        const newIsDark = !state.isDark;
        document.documentElement.classList.toggle('dark', newIsDark);
        return { isDark: newIsDark };
      }),
      
      setTheme: (isDark) => set(() => {
        document.documentElement.classList.toggle('dark', isDark);
        return { isDark };
      }),

      initTheme: () => {
        const stored = localStorage.getItem('theme-storage');
        if (stored) {
          try {
            const { state } = JSON.parse(stored);
            document.documentElement.classList.toggle('dark', state.isDark);
          } catch (e) {
            // Ignore parsing errors
          }
        }
      },
    }),
    {
      name: 'theme-storage',
    }
  )
);
