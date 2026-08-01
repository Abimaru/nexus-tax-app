import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CreateCaseForm } from '@/components/case/CreateCaseForm';

/** Pantalla "Crear expediente" (§10 · Crear expediente). */
export default function NewCasePage() {
  return (
    <div className="mx-auto max-w-xl pt-4">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Volver
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-content-strong">
        Nuevo expediente tributario
      </h1>
      <p className="mt-1 text-sm text-content-muted">
        Registra un alias y el año gravable. No necesitas datos sensibles para empezar.
      </p>
      <div className="mt-6">
        <CreateCaseForm />
      </div>
    </div>
  );
}
