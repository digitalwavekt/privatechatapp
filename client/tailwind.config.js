/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pvchat: {
          black: '#0a0a0a',
          dark: '#121212',
          card: '#1a1a1a',
          blue: '#3b82f6',
          'blue-light': '#60a5fa',
          'blue-dark': '#1d4ed8',
          white: '#ffffff',
          gray: '#9ca3af',
          'gray-dark': '#4b5563',
          success: '#10b981',
          danger: '#ef4444',
          warning: '#f59e0b',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}