import { notFound } from 'next/navigation';
import { WorkflowStageIdSchema, WorkflowViewIdSchema } from '@nexus-tax/domain';
import { CaseWorkbench } from '@/components/case/CaseWorkbench';

export default function CaseWorkflowPage({
  params,
}: {
  params: { caseId: string; stage: string; view?: string[] };
}) {
  const stage = WorkflowStageIdSchema.safeParse(params.stage);
  const view = WorkflowViewIdSchema.safeParse(params.view?.[0]);
  if (!stage.success || !view.success || (params.view?.length ?? 0) > 1) notFound();
  return <CaseWorkbench caseId={params.caseId} initialStage={stage.data} initialView={view.data} />;
}
