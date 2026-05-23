/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#0d0f14',
        surface: '#161923',
        card: '#1e2433',
        border: '#2a3348',
        accent: '#4f8ef7',
      },
    },
  },
  plugins: [],
}
