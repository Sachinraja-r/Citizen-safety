/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        raksha: {
          primary: '#E91E63',
          hover: '#D81B60',
          soft: '#F8BBD0',
          blush: '#FFF5F8',
          dark: '#2D1B24',
          muted: '#7A6570',
          border: '#F3D9E2',
          accent: '#FF6F91',
        },
        brand: {
          dark: '#080c14',
          card: '#111827',
          surface: '#1a2333',
          border: '#263449',
          sos: '#dc2626',
          sosHover: '#ef4444',
          sosGlow: 'rgba(239, 68, 68, 0.45)',
          safe: '#10b981',
          warning: '#f59e0b',
          info: '#3b82f6',
        },
      },
      animation: {
        'sos-pulse': 'sosPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-in-out',
      },
      keyframes: {
        sosPulse: {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(220, 38, 38, 0.7)' },
          '50%': { transform: 'scale(1.03)', boxShadow: '0 0 0 25px rgba(220, 38, 38, 0)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'sos': '0 0 40px -5px rgba(239, 68, 68, 0.5)',
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
        'glow-green': '0 0 25px -5px rgba(16, 185, 129, 0.4)',
      },
    },
  },
  plugins: [],
}
