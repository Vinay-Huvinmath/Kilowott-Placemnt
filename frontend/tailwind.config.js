/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: '#F6F1E7',
        surface: '#FFFDF8',
        ink: '#1F1A17',
        'muted-ink': '#6B6259',
        hairline: '#E3DACA',
        terracotta: '#C4552D',
        deepgreen: '#2F5D50',
        mustard: '#C99A2E',
      },
      fontFamily: {
        serif: ['Fraunces', 'serif'],
        sans: ['DM Sans', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '6px',
        sm: '4px',
        md: '6px',
        lg: '6px',
      },
      borderWidth: {
        hairline: '1px',
      }
    },
  },
  plugins: [],
}
