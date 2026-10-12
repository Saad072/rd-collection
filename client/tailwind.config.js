/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1C1C1C',
        sale: '#E32C2B',
        gold: '#B98A2F',
        paper: '#FAF7F2',
        line: '#E7DFD3',
        muted: '#6B6B6B',
      },
      fontFamily: {
        head: ['Dosis', 'system-ui', 'sans-serif'],
        body: ['Poppins', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        wide2: '.18em',
      },
    },
  },
  plugins: [],
};
