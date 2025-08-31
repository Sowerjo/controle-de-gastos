/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surf1: 'var(--surf-1)',
        surf2: 'var(--surf-2)',
        text: 'var(--text)',
        textDim: 'var(--text-dim)',
        accent: 'var(--accent)',
        accent2: 'var(--accent-2)',
        pos: 'var(--pos)',
        neg: 'var(--neg)',
        warn: 'var(--warn)'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['Sora', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        elev1: 'var(--shadow-1)',
        glow: 'var(--shadow-glow)'
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)'
      }
    },
  },
  plugins: [],
};
