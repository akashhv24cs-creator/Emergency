'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../lib/theme-provider';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="p-5 transition-colors duration-300" />; // Placeholder with same dimensions
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-300 shadow-sm border border-slate-200 dark:border-slate-700 group transition-colors duration-300"
      aria-label="Toggle Theme"
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 group-hover:rotate-45 transition-transform duration-500 transition-colors duration-300" />
      ) : (
        <Moon className="w-5 h-5 group-hover:-rotate-12 transition-transform duration-500 transition-colors duration-300" />
      )}
    </button>
  );
}
