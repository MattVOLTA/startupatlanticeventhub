/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'futura-pt',  // Futura PT from Adobe Fonts
          'Jost',       // Google Fonts fallback
          'system-ui',
          'sans-serif'
        ],
        display: [
          'futura-pt-bold',  // Futura PT Heavy from Adobe Fonts
          'Jost',            // Google Fonts fallback
          'system-ui',
          'sans-serif'
        ],
      },
      colors: {
        // Primary colors
        ocean: {
          DEFAULT: '#004851', // PMS 316C
        },
        sky: {
          DEFAULT: '#245B63', // Updated from B8DDE1
        },
        // Secondary/accent colors
        kitchen: {
          DEFAULT: '#F1B434', // PMS 143C
        },
        netting: {
          DEFAULT: '#5CB8B2', // PMS 7472C
        },
        rock: {
          DEFAULT: '#CF4520', // PMS 173C
        }
      }
    },
  },
  plugins: [],
};