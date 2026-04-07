import { useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';

export const useTheme = () => {
  const { theme, setTheme } = useUIStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return { theme, setTheme };
};