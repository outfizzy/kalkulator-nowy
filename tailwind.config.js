/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0f172a', // Slate 900
        secondary: '#334155', // Slate 700
        accent: '#0ea5e9', // Sky 500
        'accent-dark': '#0284c7', // Sky 600 - darker accent for hover states
        'accent-soft': '#e0f2fe', // Sky 100 - soft accent background
        background: '#f8fafc', // Slate 50
        surface: '#ffffff',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
