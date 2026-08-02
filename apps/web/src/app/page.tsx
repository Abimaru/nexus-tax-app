import Link from 'next/link';
import {
  FileSearch,
  FileSpreadsheet,
  FolderKanban,
  Scale,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { APP_IDENTITY } from '@nexus-tax/config';
import { Button, GlassPanel, PrivacyNotice } from '@nexus-tax/ui';
import { RecentCases } from '@/components/home/RecentCases';

/** Pantalla de inicio (§10 · Inicio). */
export default function HomePage() {
  return (
    <div className="flex flex-col gap-10 pt-4">
      <section className="animate-fade-in-up">
        <div className="flex items-center gap-2 text-sm text-tone-cyan">
          <Sparkles className="h-4 w-4" aria-hidden />
          <span>{APP_IDENTITY.subtitle}</span>
        </div>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-content-strong sm:text-5xl">
          Organiza y analiza tu <span className="text-gradient">información tributaria</span> sin
          salir de tu navegador.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-content-muted">
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
          <h2 id="recientes-title" className="text-lg font-medium text-content">
            Expedientes recientes
          </h2>
        </div>
        <RecentCases />
      </section>

      <section
        aria-label="Capacidades actuales"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <FeatureCard
          icon={<ShieldCheck className="h-5 w-5" aria-hidden />}
          title="Privacidad local"
          description="Tus archivos y decisiones permanecen en este navegador. NexusTax no requiere subir la información tributaria a un servidor."
        />
        <FeatureCard
          icon={<FolderKanban className="h-5 w-5" aria-hidden />}
          title="Expediente tributario"
          description="Organiza exógena, entidades, documentos, requisitos, hechos, conciliaciones y hallazgos dentro de un mismo caso."
        />
        <FeatureCard
          icon={<Scale className="h-5 w-5" aria-hidden />}
          title="Aegis Engine"
          description="Reglas deterministas, fuentes trazables y revisión humana para explicar cómo se clasifica y consolida cada valor."
        />
        <FeatureCard
          icon={<FileSearch className="h-5 w-5" aria-hidden />}
          title="Extracción documental asistida"
          description="Convierte certificados en datos candidatos verificables, conservando la página y la evidencia original."
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
      <div className="text-tone-cyan">{icon}</div>
      <h3 className="mt-3 text-sm font-medium text-content-strong">{title}</h3>
      <p className="mt-1 text-sm text-content-muted">{description}</p>
      <span className="mt-3 inline-flex text-xs text-tone-emerald">Disponible localmente</span>
    </GlassPanel>
  );
}
