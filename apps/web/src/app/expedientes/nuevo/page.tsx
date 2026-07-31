import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CreateCaseForm } from '@/components/case/CreateCaseForm';

/** Pantalla "Crear expediente" (§10 · Crear expediente). */
export default function NewCasePage() {
  return (
    <div className="mx-auto max-w-xl pt-4">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Volver
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-50">
        Nuevo expediente tributario
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        Registra un alias y el año gravable. No necesitas datos sensibles para empezar.
      </p>
      <div className="mt-6">
        <CreateCaseForm />
      </div>
    </div>
  );
}
