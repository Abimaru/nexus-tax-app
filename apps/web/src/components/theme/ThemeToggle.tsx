'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

/** Interruptor de tema claro/oscuro. Accesible y sin parpadeo al hidratar. */
export function ThemeToggle() {
  const { theme, mounted, toggle } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-overlay/12 bg-overlay/5 text-content transition-colors hover:bg-overlay/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan"
    >
      {/* Antes de montar no se conoce el tema real: se evita renderizar un icono
          que pueda no coincidir con el servidor. */}
      {mounted ? (
        isDark ? (
          <Sun className="h-4 w-4" aria-hidden />
        ) : (
          <Moon className="h-4 w-4" aria-hidden />
        )
      ) : (
        <span className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}
