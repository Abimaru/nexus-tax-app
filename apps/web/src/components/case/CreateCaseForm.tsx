'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreateTaxCaseInputSchema } from '@nexus-tax/domain';
import { TAX_YEAR_RANGE } from '@nexus-tax/config';
import { Button, GlassPanel } from '@nexus-tax/ui';
import { createCase } from '@/lib/repository';

interface FieldErrors {
  alias?: string;
  taxYear?: string;
}

const YEARS = Array.from(
  { length: TAX_YEAR_RANGE.max - TAX_YEAR_RANGE.min + 1 },
  (_, i) => TAX_YEAR_RANGE.max - i,
);

/** Formulario de creación con validación inmediata vía Zod (§10, §17). */
export function CreateCaseForm() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const defaultYear = YEARS.includes(currentYear - 1)
    ? currentYear - 1
    : (YEARS[0] ?? TAX_YEAR_RANGE.max);

  const [alias, setAlias] = useState('');
  const [taxYear, setTaxYear] = useState<number>(defaultYear);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const aliasError = useMemo(() => {
    if (alias.length === 0) return undefined;
    const result = CreateTaxCaseInputSchema.shape.alias.safeParse(alias);
    return result.success ? undefined : result.error.issues[0]?.message;
  }, [alias]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = CreateTaxCaseInputSchema.safeParse({
      alias,
      taxYear,
      notes: notes || undefined,
    });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === 'alias') next.alias = issue.message;
        if (issue.path[0] === 'taxYear') next.taxYear = issue.message;
      }
      setErrors(next);
      return;
    }

    setSubmitting(true);
    try {
      const created = await createCase(parsed.data);
      router.push(`/expedientes/${created.id}`);
    } catch (error) {
      setErrors({
        alias: error instanceof Error ? error.message : 'No se pudo crear el expediente.',
      });
      setSubmitting(false);
    }
  }

  return (
    <GlassPanel as="section" className="p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <div>
          <label htmlFor="alias" className="block text-sm font-medium text-slate-200">
            Nombre o alias
          </label>
          <input
            id="alias"
            name="alias"
            type="text"
            autoComplete="off"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            aria-invalid={Boolean(aliasError || errors.alias)}
            aria-describedby="alias-help alias-error"
            className="mt-1.5 w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2.5 text-slate-100 placeholder:text-slate-500 focus-visible:border-accent-cyan/50"
            placeholder="Ej. Declaración 2024 — Personal"
          />
          <p id="alias-help" className="mt-1 text-xs text-slate-500">
            Usa un alias reconocible. No necesita ser tu nombre legal.
          </p>
          {(aliasError || errors.alias) && (
            <p id="alias-error" role="alert" className="mt-1 text-xs text-rose-300">
              {aliasError ?? errors.alias}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="taxYear" className="block text-sm font-medium text-slate-200">
            Año gravable
          </label>
          <select
            id="taxYear"
            name="taxYear"
            value={taxYear}
            onChange={(e) => setTaxYear(Number(e.target.value))}
            className="mt-1.5 w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2.5 text-slate-100 focus-visible:border-accent-cyan/50"
          >
            {YEARS.map((year) => (
              <option key={year} value={year} className="bg-surface-raised">
                {year}
              </option>
            ))}
          </select>
          {errors.taxYear && (
            <p role="alert" className="mt-1 text-xs text-rose-300">
              {errors.taxYear}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-slate-200">
            Notas <span className="text-slate-500">(opcional)</span>
          </label>
          <textarea
            id="notes"
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={2000}
            className="mt-1.5 w-full resize-y rounded-xl border border-white/12 bg-white/5 px-3 py-2.5 text-slate-100 placeholder:text-slate-500 focus-visible:border-accent-cyan/50"
            placeholder="Contexto del expediente, pendientes, recordatorios…"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={submitting || Boolean(aliasError) || alias.trim().length < 2}
          >
            {submitting ? 'Creando…' : 'Crear expediente'}
          </Button>
        </div>
      </form>
    </GlassPanel>
  );
}
