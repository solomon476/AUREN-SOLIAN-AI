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
        solian: {
          darkest: '#07090E',
          obsidian: '#0B0D13',
          surface: '#11151F',
          card: '#161C2A',
          cardHover: '#1D2537',
          border: '#242F46',
          borderSubtle: '#1A2234',
        },
        gold: {
          50: '#FDFBF7',
          100: '#FAF4E8',
          200: '#F3E5AB',
          300: '#E5D187',
          400: '#DDBE59',
          500: '#D4AF37', /* Primary Solian Gold */
          600: '#B89225',
          700: '#947219',
          800: '#755815',
          900: '#5A4211',
          metallic: '#C59B27',
          light: '#F7E7B4',
        },
        graphite: {
          50: '#F5F7FA',
          100: '#E4E7EB',
          200: '#CBD2D9',
          300: '#9AA5B1',
          400: '#7B8794',
          500: '#616E7C',
          600: '#52606D',
          700: '#3E4C59',
          800: '#323F4B',
          900: '#1F2933',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'glow-gold': '0 0 24px -4px rgba(212, 175, 55, 0.22)',
        'glow-subtle': '0 0 16px -2px rgba(212, 175, 55, 0.12)',
        'solian-elevation': '0 8px 32px -4px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(212, 175, 55, 0.15)',
        'card-elevation': '0 6px 20px -2px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.05)',
      },
    },
  },
  plugins: [],
}

