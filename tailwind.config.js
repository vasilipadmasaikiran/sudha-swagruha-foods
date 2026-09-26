/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#2F6B3B',
          'green-light': '#3d8a4c',
          'green-dark': '#1e4a27',
          red: '#C62828',
          'red-light': '#e53935',
          'red-dark': '#8b1a1a',
          brown: '#795548',
          'brown-light': '#9c7b6d',
          'brown-dark': '#4e342e',
          cream: '#FFF8E7',
          'cream-dark': '#f5edcc',
          'light-green': '#E8F3E8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        telugu: ['Noto Sans Telugu', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'hero-pattern': "url('/images/hero-bg.jpg')",
        'leaf-pattern': "radial-gradient(circle at 20% 80%, #2F6B3B22 0%, transparent 50%), radial-gradient(circle at 80% 20%, #C6282812 0%, transparent 50%)",
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'bounce-subtle': 'bounceSubtle 2s ease-in-out infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.6s ease-out',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      boxShadow: {
        'card': '0 4px 20px rgba(0,0,0,0.08)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.15)',
        'green-glow': '0 0 20px rgba(47,107,59,0.3)',
        'red-glow': '0 0 20px rgba(198,40,40,0.3)',
      },
    },
  },
  plugins: [],
}
