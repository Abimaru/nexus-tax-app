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
        // Acentos de marca: iguales en ambos temas (el usuario los prefiere).
        accent: {
          cyan: '#22d3ee',
          blue: '#3b82f6',
          violet: '#8b5cf6',
        },
        // Superficies y texto: dependen del tema vía variables CSS (globals.css).
        surface: {
          base: 'rgb(var(--surface-base) / <alpha-value>)',
          raised: 'rgb(var(--surface-raised) / <alpha-value>)',
          glass: 'var(--surface-glass)',
        },
        // Superposición translúcida (blanca en oscuro, oscura en claro).
        overlay: 'rgb(var(--overlay) / <alpha-value>)',
        // Escala de texto semántica.
        content: {
          DEFAULT: 'rgb(var(--content) / <alpha-value>)',
          strong: 'rgb(var(--content-strong) / <alpha-value>)',
          muted: 'rgb(var(--content-muted) / <alpha-value>)',
          subtle: 'rgb(var(--content-subtle) / <alpha-value>)',
        },
        // Tonos de estado tema-conscientes (texto/íconos/badges).
        tone: {
          cyan: 'rgb(var(--tone-cyan) / <alpha-value>)',
          blue: 'rgb(var(--tone-blue) / <alpha-value>)',
          violet: 'rgb(var(--tone-violet) / <alpha-value>)',
          rose: 'rgb(var(--tone-rose) / <alpha-value>)',
          amber: 'rgb(var(--tone-amber) / <alpha-value>)',
          emerald: 'rgb(var(--tone-emerald) / <alpha-value>)',
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
