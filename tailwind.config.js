/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F1EFE6',
        paperDark: '#E6E2D3',
        ink: '#14213D',
        inkSoft: '#3A4560',
        stamp: '#B0362B',
        stampSoft: '#D9C7C3',
        ledger: '#1B6E52',
        ledgerSoft: '#CFE0D7',
        rule: '#C9C4B2'
      },
      fontFamily: {
        serif: ['"Source Serif 4"', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace']
      }
    }
  },
  plugins: []
}
