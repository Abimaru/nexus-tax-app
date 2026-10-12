import { describe, expect, it } from 'vitest';
import {
  buildGuidedSteps,
  guidedStepForDestination,
  nextGuidedStep,
  type GuidedContext,
} from './guidedFlow';

function context(over: Partial<GuidedContext> = {}): GuidedContext {
  return {
    documents: [],
    facts: [],
    reconciliations: [],
    progress: {} as GuidedContext['progress'],
    manualMode: false,
    extractionPending: false,
    vatResponsibility: null,
    result: undefined,
    ...over,
  } as GuidedContext;
}

const withResult = { result: {} as GuidedContext['result'] };
const doc = { status: 'active' } as GuidedContext['documents'][number];
const candidate = { status: 'pending' } as NonNullable<GuidedContext['documentCandidates']>[number];
const blockingTask = { status: 'pending', blocking: true } as NonNullable<
  GuidedContext['tasks']
>[number];

describe('guidedStepForDestination', () => {
  it('sin fuente todo es el paso de cargar', () => {
    expect(guidedStepForDestination('organizacion', 'documentos', false)).toBe('cargar');
  });

  it('agrupa las vistas por intención', () => {
    expect(guidedStepForDestination('organizacion', 'tu-resultado', true)).toBe('resultado');
    expect(guidedStepForDestination('declaracion', 'obligacion', true)).toBe('resultado');
    expect(guidedStepForDestination('organizacion', 'mis-documentos', true)).toBe('documentos');
    expect(guidedStepForDestination('organizacion', 'revision-documental', true)).toBe('revisar');
    expect(guidedStepForDestination('conciliacion', 'matriz', true)).toBe('revisar');
    expect(guidedStepForDestination('declaracion', 'beneficios-dependientes', true)).toBe(
      'revisar',
    );
    expect(guidedStepForDestination('declaracion', 'formulario-210', true)).toBe('borrador');
    expect(guidedStepForDestination('exportacion', 'exportar', true)).toBe('borrador');
  });
});

describe('buildGuidedSteps', () => {
  const at = (
    stage: 'fuente' | 'organizacion',
    view: 'cargar' | 'tu-resultado' | 'mis-documentos',
  ) => ({
    stage,
    view,
  });

  it('antes de cargar la exógena solo el primer paso está disponible', () => {
    const steps = buildGuidedSteps(context(), at('fuente', 'cargar'));
    expect(steps.map((step) => step.status)).toEqual([
      'current',
      'locked',
      'locked',
      'locked',
      'locked',
    ]);
    expect(nextGuidedStep(steps).id).toBe('cargar');
  });

  it('tras cargar, el paso 1 queda hecho y el siguiente accionable es documentos', () => {
    const steps = buildGuidedSteps(context(withResult), at('organizacion', 'tu-resultado'));
    expect(steps[0]).toMatchObject({ status: 'done', complete: true });
    expect(steps[1]).toMatchObject({ status: 'current' });
    expect(nextGuidedStep(steps).id).toBe('documentos');
  });

  it('con documentos el paso de documentos se completa', () => {
    const steps = buildGuidedSteps(
      context({ ...withResult, documents: [doc] }),
      at('organizacion', 'mis-documentos'),
    );
    expect(steps[2]).toMatchObject({ status: 'current', complete: true });
    expect(steps[2]!.detail).toBe('1 documento');
    expect(nextGuidedStep(steps).id).toBe('borrador');
  });

  it('las facturas cuentan como soporte aunque no haya PDF', () => {
    const steps = buildGuidedSteps(
      context({ ...withResult, hasInvoiceReport: true }),
      at('organizacion', 'mis-documentos'),
    );
    expect(steps[2]!.complete).toBe(true);
    expect(steps[2]!.detail).toContain('facturas');
  });

  it('revisar y completar no termina mientras haya datos por revisar o tareas bloqueantes', () => {
    const pending = buildGuidedSteps(
      context({ ...withResult, documents: [doc], documentCandidates: [candidate] }),
      at('organizacion', 'mis-documentos'),
    );
    expect(pending[3]).toMatchObject({ complete: false });
    expect(pending[3]!.destination.view).toBe('revision-documental');
    const blocked = buildGuidedSteps(
      context({ ...withResult, documents: [doc], tasks: [blockingTask] }),
      at('organizacion', 'mis-documentos'),
    );
    expect(blocked[3]).toMatchObject({ complete: false });
    expect(blocked[3]!.destination.view).toBe('pendientes');
    const clear = buildGuidedSteps(
      context({ ...withResult, documents: [doc] }),
      at('organizacion', 'mis-documentos'),
    );
    expect(clear[3]).toMatchObject({ complete: true, detail: 'Todo al día' });
  });

  it('el borrador nunca se marca como terminado y es el último destino', () => {
    const steps = buildGuidedSteps(
      context({ ...withResult, documents: [doc] }),
      at('organizacion', 'mis-documentos'),
    );
    expect(steps[4]).toMatchObject({ complete: false, number: 5 });
    expect(nextGuidedStep(steps).id).toBe('borrador');
    const finished = steps.map((step) => ({ ...step, complete: true }));
    expect(nextGuidedStep(finished).id).toBe('documentos');
  });
});
