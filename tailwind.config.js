/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--canvas-bg)',
        surface: 'var(--surface)',
        panel: 'var(--panel)',
        line: 'var(--border)',
        ink: 'var(--text)',
        muted: 'var(--text-muted)',
        accent: 'var(--accent)',
      },
      boxShadow: {
        node: '0 1px 2px rgba(15,23,42,.06), 0 4px 14px rgba(15,23,42,.06)',
        panel: '0 1px 3px rgba(15,23,42,.06)',
      },
      fontSize: {
        '2xs': ['10px', '14px'],
      },
    },
  },
  plugins: [],
};
