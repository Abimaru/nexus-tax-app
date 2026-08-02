import { describe, expect, it } from 'vitest';
import {
  FactRequirementRelationSchema,
  AcceptedSourceStatusSchema,
  PreliminaryReconciliationStatusSchema,
} from '@nexus-tax/domain';
import {
  ACCEPTED_SOURCE_STATUS_PRESENTATION,
  PRELIMINARY_RECONCILIATION_PRESENTATION,
  REQUIREMENT_RELATION_PRESENTATION,
  missingPresentationFinding,
  presentationEntry,
} from './presentationCatalogs';

describe('catálogos de presentación', () => {
  it('traduce todas las relaciones y estados conocidos sin exponer enums', () => {
    for (const value of FactRequirementRelationSchema.options) {
      expect(REQUIREMENT_RELATION_PRESENTATION[value].label).not.toBe(value);
      expect(REQUIREMENT_RELATION_PRESENTATION[value].description.length).toBeGreaterThan(10);
    }
    for (const value of AcceptedSourceStatusSchema.options) {
      expect(ACCEPTED_SOURCE_STATUS_PRESENTATION[value].label).not.toBe(value);
    }
    for (const value of PreliminaryReconciliationStatusSchema.options) {
      expect(PRELIMINARY_RECONCILIATION_PRESENTATION[value].label).not.toBe(value);
    }
  });

  it('usa un fallback controlado y crea un hallazgo técnico', () => {
    expect(presentationEntry(REQUIREMENT_RELATION_PRESENTATION, 'future_value').label).toBe(
      'Estado no reconocido',
    );
    expect(missingPresentationFinding('future_value')).toMatchObject({
      code: 'missing_presentation_label',
      severity: 'info',
      technicalValue: 'future_value',
    });
  });
});
