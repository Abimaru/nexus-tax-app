'use client';

import Link from 'next/link';
import Image from 'next/image';
import { PrivacyNotice } from '@nexus-tax/ui';
import { GlobalDataControls } from './GlobalDataControls';
import { ThemeToggle } from './theme/ThemeToggle';

/** Cabecera global: identidad + aviso de privacidad + tema + controles de datos. */
export function AppHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 py-5">
      <Link href="/" aria-label="Ir al inicio de NexusTax" className="rounded-lg">
        <span className="relative block h-14 w-64 overflow-hidden sm:h-16 sm:w-[17rem]">
          <Image
            src="/branding/nexustax-home.png"
            alt=""
            aria-hidden
            width={1536}
            height={1024}
            priority
            sizes="(min-width: 640px) 368px, 328px"
            className="absolute left-[-2.75rem] top-[-4.8rem] h-auto w-[20.5rem] max-w-none sm:left-[-3.1rem] sm:top-[-5.35rem] sm:w-[23rem]"
          />
          <span className="absolute left-[5.35rem] top-[2.15rem] whitespace-nowrap bg-surface-base/90 px-0.5 text-[8px] leading-none text-content-muted sm:left-[6rem] sm:top-[2.45rem] sm:text-[10px]">
            Estación personal de análisis tributario
          </span>
        </span>
      </Link>
      <div className="flex items-center gap-3">
        <PrivacyNotice compact className="hidden sm:inline-flex" />
        <ThemeToggle />
        <GlobalDataControls />
      </div>
    </header>
  );
}
