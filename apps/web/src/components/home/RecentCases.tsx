'use client';

import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { FolderOpen, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, EmptyState, GlassPanel, Skeleton } from '@nexus-tax/ui';
import { deleteCase, listCases } from '@/lib/repository';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador',
  processing: 'Procesando',
  ready: 'Listo',
  archived: 'Archivado',
};

/** Lista de expedientes recientes desde IndexedDB, reactiva a cambios. */
export function RecentCases() {
  const cases = useLiveQuery(() => listCases(), []);

  if (cases === undefined) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <EmptyState
        icon={<FolderOpen className="h-8 w-8" aria-hidden />}
        title="Aún no tienes expedientes"
        description="Crea tu primer expediente para cargar un Excel de información exógena y analizarlo."
        action={
          <Link href="/expedientes/nuevo">
            <Button leadingIcon={<Plus className="h-4 w-4" aria-hidden />}>Crear expediente</Button>
          </Link>
        }
      />
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {cases.map((taxCase) => (
        <li key={taxCase.id}>
          <GlassPanel className="group flex items-center justify-between p-4 transition-colors hover:border-accent-cyan/30">
            <Link href={`/expedientes/${taxCase.id}`} className="flex-1 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-100">{taxCase.alias}</span>
                <Badge tone={taxCase.status === 'ready' ? 'emerald' : 'neutral'}>
                  {STATUS_LABEL[taxCase.status] ?? taxCase.status}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Año gravable {taxCase.taxYear} · Actualizado{' '}
                {new Date(taxCase.updatedAt).toLocaleDateString('es-CO')}
              </p>
            </Link>
            <button
              type="button"
              onClick={() => void deleteCase(taxCase.id)}
              className="ml-3 rounded-lg p-2 text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              aria-label={`Eliminar expediente ${taxCase.alias}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </GlassPanel>
        </li>
      ))}
    </ul>
  );
}
