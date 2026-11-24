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
          darkest: '#0f172a',      /* Primary high-contrast slate text and dark accents */
          obsidian: '#ffffff',     /* Main Application Canvas Background (Pure Executive White) */
          surface: '#f8fafc',      /* Crisp light slate surface for inputs, secondary bars & sub-panels */
          card: '#ffffff',         /* Pure White Card Background */
          cardHover: '#f8fafc',    /* Light slate hover state */
          border: '#e2e8f0',       /* Crisp Slate-200 border */
          borderSubtle: '#f1f5f9', /* Subtle Slate-100 border */
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
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#64748B', /* Slate-500 for WCAG AA readability on white */
          400: '#64748B', /* Slate-500 for WCAG AA readability on white */
          500: '#475569', /* Slate-600 */
          600: '#334155', /* Slate-700 */
          700: '#1E293B', /* Slate-800 */
          800: '#0F172A', /* Slate-900 */
          900: '#020617', /* Slate-950 */
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'glow-gold': '0 0 20px -3px rgba(212, 175, 55, 0.28)',
        'glow-subtle': '0 0 12px -2px rgba(212, 175, 55, 0.16)',
        'solian-elevation': '0 4px 20px -2px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(226, 232, 240, 0.9)',
        'card-elevation': '0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04), 0 0 0 1px rgba(226, 232, 240, 0.85)',
      },
    },
  },
  plugins: [],
}

