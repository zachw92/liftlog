import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#0b0b0d',
        surface: '#17171b',
        line: '#2a2a31',
        ink: '#f5f5f7',
        muted: '#a1a1aa',
        ok: '#22c55e',
        warn: '#f59e0b',
        bad: '#ef4444',
        accent: '#60a5fa',
      },
      minHeight: {
        tap: '48px',
      },
      minWidth: {
        tap: '48px',
      },
    },
  },
  plugins: [],
} satisfies Config;
