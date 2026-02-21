/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        rag: {
          green: '#22c55e',
          orange: '#f59e0b',
          red: '#ef4444',
        },
      },
    },
  },
  plugins: [],
};
