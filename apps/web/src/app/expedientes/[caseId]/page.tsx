import { CaseWorkbench } from '@/components/case/CaseWorkbench';

/** Pantalla del expediente: orquesta carga, inspección y análisis. */
export default function CasePage({ params }: { params: { caseId: string } }) {
  return <CaseWorkbench caseId={params.caseId} />;
}
