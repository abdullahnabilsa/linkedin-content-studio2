import { useUIStore } from '@/stores/uiStore';
import { useTheme } from '@/hooks/useTheme';

const ThemeSwitch = () => {
  const { setTheme } = useUIStore();
  const { theme } = useTheme();

  return (
    <div>
      <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
        {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      </button>
    </div>
  );
};

export default ThemeSwitch;