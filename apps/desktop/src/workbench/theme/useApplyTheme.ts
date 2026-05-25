import { useEffect } from 'react';

import { useWorkbenchStore } from '../store/workbenchStore';

export function useApplyTheme() {
  const theme = useWorkbenchStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;

    function applyDark(isDark: boolean) {
      root.classList.toggle('dark', isDark);
    }

    if (theme === 'light') {
      applyDark(false);
      return;
    }

    if (theme === 'dark') {
      applyDark(true);
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    applyDark(media.matches);

    function handleChange(event: MediaQueryListEvent) {
      applyDark(event.matches);
    }

    media.addEventListener('change', handleChange);

    return () => {
      media.removeEventListener('change', handleChange);
    };
  }, [theme]);
}
