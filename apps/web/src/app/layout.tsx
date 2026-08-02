import type { Metadata, Viewport } from 'next';
import { APP_IDENTITY } from '@nexus-tax/config';
import { AppHeader } from '@/components/AppHeader';
import { ThemeProvider, themeNoFlashScript } from '@/components/theme/ThemeProvider';
import './globals.css';

export const metadata: Metadata = {
  title: `${APP_IDENTITY.name} — ${APP_IDENTITY.subtitle}`,
  description:
    'Estación personal y local de análisis tributario para Colombia. Procesamiento 100% en tu navegador.',
  applicationName: APP_IDENTITY.name,
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#070b16' },
    { media: '(prefers-color-scheme: light)', color: '#f4f7fb' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Fija el tema antes de pintar para evitar parpadeo. */}
        <script dangerouslySetInnerHTML={{ __html: themeNoFlashScript }} />
      </head>
      <body>
        <ThemeProvider>
          <a
            href="#contenido"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface-raised focus:px-4 focus:py-2 focus:text-content-strong"
          >
            Saltar al contenido
          </a>
          <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 sm:px-6">
            <AppHeader />
            <main id="contenido" className="flex-1 pb-16">
              {children}
            </main>
            <footer className="border-t border-overlay/5 py-6 text-center text-xs text-content-subtle">
              {APP_IDENTITY.name} · {APP_IDENTITY.subtitle} · Motor futuro:{' '}
              {APP_IDENTITY.futureEngine}
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
