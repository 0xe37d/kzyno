/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      keyframes: {
        'win-fade-up': {
          '0%': {
            opacity: '0',
            transform: 'translate(-50%, 0) scale(0.5)',
          },
          '20%': {
            opacity: '1',
            transform: 'translate(-50%, -40px) scale(1.2)',
          },
          '30%': {
            transform: 'translate(-50%, -40px) scale(1)',
          },
          '80%': {
            opacity: '1',
            transform: 'translate(-50%, -60px) scale(1)',
          },
          '100%': {
            opacity: '0',
            transform: 'translate(-50%, -100px) scale(0.8)',
          },
        },
        'win-pop': {
          '0%': {
            opacity: '0',
            transform: 'scale(0.5) rotateX(-20deg)',
          },
          '40%': {
            opacity: '1',
            transform: 'scale(1.2) rotateX(10deg)',
          },
          '60%': {
            transform: 'scale(0.9) rotateX(-5deg)',
          },
          '80%': {
            transform: 'scale(1) rotateX(0deg)',
          },
          '100%': {
            opacity: '0',
            transform: 'scale(0.8) translateY(-100px)',
          },
        },
        'win-bounce': {
          '0%, 100%': {
            transform: 'translateY(0) rotateX(10deg)',
          },
          '50%': {
            transform: 'translateY(-20px) rotateX(-5deg)',
          }
        }
      },
      animation: {
        'win-fade-up': 'win-fade-up 2s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'win-pop': 'win-pop 2s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'win-bounce': 'win-bounce 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} 