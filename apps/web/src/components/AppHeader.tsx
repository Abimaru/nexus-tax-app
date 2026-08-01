'use client';

import Link from 'next/link';
import { BrandMark, PrivacyNotice } from '@nexus-tax/ui';
import { GlobalDataControls } from './GlobalDataControls';
import { ThemeToggle } from './theme/ThemeToggle';

/** Cabecera global: identidad + aviso de privacidad + tema + controles de datos. */
export function AppHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 py-5">
      <Link href="/" aria-label="Ir al inicio de NexusTax" className="rounded-lg">
        <BrandMark />
      </Link>
      <div className="flex items-center gap-3">
        <PrivacyNotice compact className="hidden sm:inline-flex" />
        <ThemeToggle />
        <GlobalDataControls />
      </div>
    </header>
  );
}
