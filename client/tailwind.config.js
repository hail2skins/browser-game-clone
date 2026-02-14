/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          950: '#0d1a10',
          900: '#132218',
          800: '#1e3023',
          700: '#29402d'
        },
        earth: {
          900: '#3a2418',
          800: '#4b2f21',
          700: '#5d3c2b',
          600: '#7b543c'
        },
        stone: {
          950: '#121410',
          900: '#1f221d',
          800: '#2d2f2a',
          700: '#44473f',
          600: '#686b62'
        },
        parchment: {
          100: '#fff8e7',
          200: '#f5e7c3',
          300: '#decb9b'
        },
        ember: {
          500: '#b98a3d',
          400: '#d8a850',
          300: '#e6c67a'
        }
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        medieval: '0 0 0 1px rgba(82,61,34,.6) inset, 0 10px 30px rgba(0,0,0,.45)'
      },
      backgroundImage: {
        parchment: 'linear-gradient(180deg, rgba(245,231,195,.17), rgba(80,58,32,.04))',
        stone: 'linear-gradient(180deg, rgba(72,74,68,.2), rgba(26,29,24,.22))'
      }
    }
  },
  plugins: []
}
