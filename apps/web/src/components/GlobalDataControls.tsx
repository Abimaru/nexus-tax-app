'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@nexus-tax/ui';
import { clearAllData } from '@/lib/repository';

/** Botón para limpiar TODA la información local (§12). Pide confirmación. */
export function GlobalDataControls() {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleClear() {
    setBusy(true);
    try {
      await clearAllData();
      // Recarga para reflejar el estado vacío en toda la app.
      window.location.href = '/';
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <Button
        variant="ghost"
        onClick={() => setConfirming(true)}
        leadingIcon={<Trash2 className="h-4 w-4" aria-hidden />}
        aria-label="Limpiar toda la información local"
      >
        <span className="hidden sm:inline">Limpiar todo</span>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-2 py-1">
      <span className="text-xs text-rose-200">¿Borrar todo lo local?</span>
      <Button variant="danger" onClick={handleClear} disabled={busy}>
        {busy ? 'Borrando…' : 'Sí, borrar'}
      </Button>
      <Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
        Cancelar
      </Button>
    </div>
  );
}
