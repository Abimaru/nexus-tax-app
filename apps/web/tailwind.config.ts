import type { Config } from 'tailwindcss';

/**
 * Configuración Tailwind de NexusTax.
 * La paleta (cian, azul eléctrico, violeta + superficies profundas) refleja
 * los tokens de marca de @nexus-tax/config (BRAND_TOKENS). Se declaran aquí de
 * forma literal para que el cargador de Tailwind no dependa de TS del workspace.
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{ts,tsx}',
    // Escanea las clases usadas por los componentes compartidos.
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          cyan: '#22d3ee',
          blue: '#3b82f6',
          violet: '#8b5cf6',
        },
        surface: {
          base: '#070b16',
          raised: '#0d1424',
          glass: 'rgba(19, 27, 46, 0.55)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.4s ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
