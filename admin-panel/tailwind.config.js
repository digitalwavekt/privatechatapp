/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
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
      }
    },
  },
  plugins: [],
}