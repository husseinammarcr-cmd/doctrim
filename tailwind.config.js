/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0055FF',
          hover: '#0046D6',
          light: '#E5EEFF',
          lighter: '#F2F6FF',
        },
        ink: {
          DEFAULT: '#1A1A1A',
          soft: '#3A3A3A',
          muted: '#6B6B6B',
        },
        line: '#E8E8EC',
        surface: '#F4F5F7',
        accent: {
          red: '#FF5400',
          orange: '#FF8E00',
          yellow: '#FFD200',
          cyan: '#00C0FF',
          green: '#00D267',
          lime: '#81E650',
          purple: '#8B48FE',
          magenta: '#CA41FC',
          pink: '#FF46FB',
        },
      },
      fontFamily: {
        sans: ['"Source Sans 3"', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        container: '1200px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06)',
        lift: '0 8px 24px rgba(0,0,0,0.12)',
        mockup: '0 4px 12px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
}
