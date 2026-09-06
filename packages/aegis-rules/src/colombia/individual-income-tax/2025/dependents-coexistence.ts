/**
 * Evaluador de coexistencia entre los beneficios de dependientes del
 * art. 387 ET y el art. 336 num. 3 ET (Sprint 2.4, Fase C).
 *
 * Fuente: Decreto 1625 de 2016, art. 1.2.1.20.3 (modificado por el Decreto
 * 2231 de 2023): «La deducción por dependientes a que se refieren el inciso
 * 2 del numeral 3 del artículo 336 y la del artículo 387 del Estatuto
 * Tributario aplican únicamente a los ingresos provenientes de rentas de
 * trabajo y un mismo dependiente solo dará lugar a una de estas dos
 * deducciones, excepto cuando se tenga rentas provenientes de una relación
 * laboral y legal o reglamentaria, caso en el cual se podrá aplicar ambas
 * deducciones por un mismo dependiente.»
 *
 * Este motor NUNCA pregunta "¿quieres usar el artículo 336 o el 387?": recibe
 * un hecho humano (la naturaleza de la renta de trabajo del contribuyente) y
 * decide qué beneficios son candidatos para cada dependiente.
 */

export const DEPENDENTS_COEXISTENCE_SOURCE_ID = 'decreto-1625-2016-art-1.2.1.20.3';

/**
 * Naturaleza de la renta de trabajo del contribuyente, tal como la aporta el
 * analista (nunca inferida). `unknown` deja el caso en revisión: no se
 * asume ninguna de las dos opciones.
 */
export type EmploymentIncomeNature = 'labor_relation' | 'independent' | 'unknown';

export type DependentBenefitCandidate = 'article_387' | 'article_336';

export interface DependentCoexistenceInput {
  id: string;
  /** `true` cuando el dependiente ya pasó la evaluación base de elegibilidad (Sección 8). */
  baseEligible: boolean;
  /**
   * Preferencia explícita del analista cuando el contribuyente es
   * independiente y debe elegir un solo beneficio por dependiente. `null`
   * si aún no ha elegido.
   */
  preferredBenefit: DependentBenefitCandidate | null;
}

export interface DependentCoexistenceResult {
  id: string;
  /** Beneficios para los que este dependiente es candidato tras resolver la coexistencia. */
  candidateBenefits: readonly DependentBenefitCandidate[];
  /** `true` cuando el contribuyente es independiente y no ha elegido un beneficio todavía. */
  requiresChoice: boolean;
  reason: string;
}

/**
 * Resuelve, dependiente por dependiente, para cuáles de los dos beneficios
 * es candidato. No decide "cuál es mejor": si el contribuyente tiene
 * relación laboral/legal/reglamentaria, ambos beneficios coexisten siempre
 * que el dependiente sea elegible. Si es independiente (honorarios/
 * servicios), exige una elección explícita por dependiente; sin ella, el
 * dependiente permanece `requiresChoice: true` y NO se cuenta para ningún
 * motor (para no asumir automáticamente una decisión del analista).
 */
export function resolveDependentBenefitCoexistence(
  employmentIncomeNature: EmploymentIncomeNature,
  dependents: readonly DependentCoexistenceInput[],
): DependentCoexistenceResult[] {
  return dependents.map((dependent): DependentCoexistenceResult => {
    if (!dependent.baseEligible) {
      return {
        id: dependent.id,
        candidateBenefits: [],
        requiresChoice: false,
        reason: 'El dependiente todavía no cumple la evaluación base de elegibilidad.',
      };
    }
    if (employmentIncomeNature === 'labor_relation') {
      return {
        id: dependent.id,
        candidateBenefits: ['article_387', 'article_336'],
        requiresChoice: false,
        reason:
          'Rentas de una relación laboral, legal o reglamentaria: ambos beneficios pueden coexistir para el mismo dependiente.',
      };
    }
    if (employmentIncomeNature === 'independent') {
      if (dependent.preferredBenefit) {
        return {
          id: dependent.id,
          candidateBenefits: [dependent.preferredBenefit],
          requiresChoice: false,
          reason:
            'Rentas de honorarios o servicios personales: el analista eligió un único beneficio para este dependiente.',
        };
      }
      return {
        id: dependent.id,
        candidateBenefits: [],
        requiresChoice: true,
        reason:
          'Rentas de honorarios o servicios personales: un mismo dependiente solo da lugar a una de las dos deducciones. Falta elegir cuál.',
      };
    }
    return {
      id: dependent.id,
      candidateBenefits: [],
      requiresChoice: true,
      reason:
        'Falta indicar la naturaleza de la renta de trabajo (relación laboral o independiente) para evaluar la coexistencia.',
    };
  });
}
