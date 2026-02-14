/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          900: '#1A2A1F',
          800: '#233528',
          700: '#2E4633'
        },
        earth: {
          700: '#5B3A29',
          600: '#6D4A33',
          500: '#8A6346'
        },
        stone: {
          800: '#3A3A3A',
          700: '#555555',
          500: '#8A8A8A'
        },
        parchment: '#E7D9B5'
      }
    }
  },
  plugins: []
}
