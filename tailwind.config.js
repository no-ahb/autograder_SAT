/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      colors: {
        slate: {
          950: '#0a0f1a'
        },
        primary: {
          DEFAULT: '#2563eb',
          foreground: '#f8fafc'
        },
        accent: {
          DEFAULT: '#f97316',
          foreground: '#0f172a'
        }
      }
    }
  },
  plugins: []
};
