import Link from 'next/link';
import { ArrowRight, FileSpreadsheet, ShieldCheck, Sparkles } from 'lucide-react';
import { APP_IDENTITY } from '@nexus-tax/config';
import { Button, GlassPanel, PrivacyNotice } from '@nexus-tax/ui';
import { RecentCases } from '@/components/home/RecentCases';

/** Pantalla de inicio (§10 · Inicio). */
export default function HomePage() {
  return (
    <div className="flex flex-col gap-10 pt-4">
      <section className="animate-fade-in-up">
        <div className="flex items-center gap-2 text-sm text-accent-cyan">
          <Sparkles className="h-4 w-4" aria-hidden />
          <span>{APP_IDENTITY.subtitle}</span>
        </div>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-slate-50 sm:text-5xl">
          Organiza y analiza tu <span className="text-gradient">información tributaria</span> sin
          salir de tu navegador.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-slate-400">
          {APP_IDENTITY.name} te ayuda a crear expedientes, leer información exógena de la DIAN,
          normalizar registros, detectar inconsistencias y preparar tu declaración de renta. Todo el
          procesamiento ocurre localmente.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href="/expedientes/nuevo">
            <Button leadingIcon={<FileSpreadsheet className="h-4 w-4" aria-hidden />}>
              Crear expediente
            </Button>
          </Link>
          <PrivacyNotice />
        </div>
      </section>

      <section aria-labelledby="recientes-title">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="recientes-title" className="text-lg font-medium text-slate-200">
            Expedientes recientes
          </h2>
        </div>
        <RecentCases />
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <FeatureCard
          icon={<ShieldCheck className="h-5 w-5" aria-hidden />}
          title="Privado por diseño"
          description="Tus archivos nunca se suben. Se procesan en este dispositivo y puedes borrar todo cuando quieras."
        />
        <FeatureCard
          icon={<FileSpreadsheet className="h-5 w-5" aria-hidden />}
          title="Lectura de exógena"
          description="Carga un Excel de información exógena y obtén registros normalizados, métricas y hallazgos."
        />
        <FeatureCard
          icon={<Sparkles className="h-5 w-5" aria-hidden />}
          title={`Preparado para ${APP_IDENTITY.futureEngine}`}
          description="Las reglas de conciliación evolucionarán hacia un motor extensible con revisión humana."
        />
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <GlassPanel className="p-5">
      <div className="text-accent-cyan">{icon}</div>
      <h3 className="mt-3 text-sm font-medium text-slate-100">{title}</h3>
      <p className="mt-1 text-sm text-slate-400">{description}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs text-slate-500">
        <ArrowRight className="h-3 w-3" aria-hidden /> Sprint 1
      </span>
    </GlassPanel>
  );
}
