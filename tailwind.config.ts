import { type Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: '#0D4026',
        accent: '#34D399',
        pearl: '#F5F5F0',
        dark: '#0B1210',
        semantic: {
          error: '#FF0000',
          success: '#00FF00',
        },
      },
      fontFamily: {
        sans: ['Inter', 'IBM Plex Sans Arabic', 'JetBrains Mono'],
      },
      spacing: {
        '1/2': '50%',
        '3/4': '75%',
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        '2xl': '1rem',
      },
      boxShadow: {
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.5s ease-in-out',
      },
      zIndex: {
        '100': '100',
      },
      maxWidth: {
        'screen-lg': '1024px',
      },
      transitionDuration: {
        '200': '200ms',
      },
    },
  },
  plugins: [require('@tailwindcss/typography'), require('@tailwindcss/forms')],
};

export default config;