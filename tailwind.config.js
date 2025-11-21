/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        os: {
          bg: '#0f172a', // Slate 900
          panel: '#1e293b', // Slate 800
          border: '#334155', // Slate 700
          text: '#f8fafc', // Slate 50
          accent: '#3b82f6', // Blue 500
        }
      }
    },
  },
  plugins: [],
}

