import type { TaxCategory } from '@nexus-tax/domain';
import { comparableText } from './normalize';

/**
 * Defensa semántica general (Sprint 2.4, Fase F.2 — Safety & Critical
 * Evidence Hardening, docs/EVIDENCE_MATCHING.md §F.2).
 *
 * Principio rector:
 *
 *   `igualdad numérica ≠ equivalencia tributaria`
 *   `misma categoría propuesta ≠ mismo concepto`
 *
 * El benchmark real Documento ↔ Exógena (Fase F.1) encontró un caso real
 * donde un candidato cuyo texto describía una RETENCIÓN fue clasificado
 * como `financial_income` y obtuvo `exact_match` contra un registro de
 * INGRESOS — un "false confident match": el valor numérico coincidía,
 * pero el concepto tributario era otro.
 *
 * Esta función detecta esa clase de contradicción de forma GENERAL y
 * REUSABLE: compara las palabras clave inequívocas del propio texto de un
 * candidato (`originalConcept`/`normalizedConcept`) contra la categoría
 * que el adaptador le propuso, sin depender de ningún registro exógeno,
 * banco, NIT o nombre de archivo (§4 del prompt de Fase F.2 — prohibido
 * resolver el caso por emisor). Es deliberadamente conservadora: solo
 * actúa sobre marcadores léxicos inequívocos (retención/base/saldo), no
 * sobre el texto completo del documento.
 */

/** Marcador léxico de rol encontrado en el texto propio de un candidato. */
export type ConceptRoleMarker = 'withholding' | 'base' | 'balance';

const MARKER_PATTERNS: Record<ConceptRoleMarker, RegExp> = {
  // "retención"/"retenciones": el concepto es una retención practicada,
  // nunca un ingreso.
  withholding: /\bretencion(?:es)?\b/,
  // "base" (base gravable, base imponible, base de retención): el valor
  // es informativo/base de cálculo, nunca el monto final deducible o
  // retenido.
  base: /\bbase\b/,
  // "saldo": el valor es un saldo de cuenta/producto (activo), nunca una
  // deducción o gravamen.
  balance: /\bsaldo\b/,
};

/** Detecta qué marcadores de rol aparecen en un texto (§3 del prompt de Fase F.2). */
export function detectConceptRoleMarkers(text: string): ConceptRoleMarker[] {
  const normalized = comparableText(text);
  return (Object.keys(MARKER_PATTERNS) as ConceptRoleMarker[]).filter((marker) =>
    MARKER_PATTERNS[marker].test(normalized),
  );
}

/**
 * Tabla de compatibilidad (§5 del prompt de Fase F.2): para cada categoría
 * propuesta, qué marcadores de rol la CONTRADICEN si aparecen en el propio
 * texto del candidato. Reutiliza `TaxCategory` (ya existente en
 * `@nexus-tax/domain`) — no crea una segunda taxonomía paralela.
 *
 * - Una renta/ingreso nunca puede describir en su propio texto una
 *   retención: "Retención sobre rendimientos financieros" no es un
 *   ingreso, es una retención mal etiquetada.
 * - Una retención (`withholding`) nunca puede ser en realidad una BASE de
 *   cálculo: "Base de retención" no equivale a "retención practicada".
 * - Una deducción candidata (GMF y análogas) nunca puede ser en realidad
 *   una BASE gravable ("Base gravable GMF" ≠ "Valor GMF") ni un SALDO de
 *   cuenta ("Saldo cuenta ahorros" ≠ "GMF").
 * - Un beneficio de intereses de vivienda nunca puede ser en realidad un
 *   saldo de la obligación (§13 del prompt de Fase F.2) — SALVO que el
 *   propio texto también contenga la frase específica de intereses
 *   (`overrideIfPresent`, revisión puntual de regresión): una línea real
 *   como "Saldo obligación e intereses pagados durante el año" NO debe
 *   degradarse solo porque menciona "saldo" en el mismo renglón/contexto
 *   — la contradicción debe ser del CONTEXTO asociado al valor, no de
 *   cualquier palabra presente en toda la fila. La señal específica y
 *   más fuerte (la misma frase que activa la regla `housing-interest` en
 *   `adapters.ts`) domina sobre el marcador genérico "saldo".
 */
interface ForbiddenMarkerRule {
  marker: ConceptRoleMarker;
  /** Si coincide, esta regla NO contradice — una señal más específica domina. */
  overrideIfPresent?: RegExp;
}

const HOUSING_INTEREST_STRONG_SIGNAL = /\bintereses?\s+(?:pagados|causados|del\s+periodo)\b/;

const FORBIDDEN_MARKERS_BY_CATEGORY: Partial<Record<TaxCategory, readonly ForbiddenMarkerRule[]>> = {
  financial_income: [{ marker: 'withholding' }],
  employment_income: [{ marker: 'withholding' }],
  other_income: [{ marker: 'withholding' }],
  dividend_income: [{ marker: 'withholding' }],
  pension_income: [{ marker: 'withholding' }],
  withholding: [{ marker: 'base' }],
  deduction_candidate: [{ marker: 'base' }, { marker: 'balance' }],
  housing_interest: [{ marker: 'balance', overrideIfPresent: HOUSING_INTEREST_STRONG_SIGNAL }],
};

export interface SemanticContradiction {
  contradictory: boolean;
  marker: ConceptRoleMarker | null;
  /**
   * Explicación humana, redactada sin jerga técnica ni scores internos
   * (§8 del prompt de Fase F.2): "el valor coincide, pero el concepto
   * no", nunca "semantic contradiction detected".
   */
  reason: string | null;
}

function reasonForMarker(marker: ConceptRoleMarker): string {
  switch (marker) {
    case 'withholding':
      return 'El monto coincide, pero el certificado parece describir una retención y se comparó como un ingreso. Revísalo antes de confirmar.';
    case 'base':
      return 'El monto coincide, pero el certificado parece describir una base de cálculo, no el valor final. Revísalo antes de confirmar.';
    case 'balance':
      return 'El monto coincide, pero el certificado parece describir un saldo, no una deducción. Revísalo antes de confirmar.';
    default:
      return 'El valor coincide, pero el concepto no. Revísalo antes de confirmar.';
  }
}

/**
 * Detecta contradicción semántica de un candidato: compara las palabras
 * clave de su propio texto contra UNA O MÁS categorías "de referencia".
 *
 * En el caso más simple (sin `referenceCategories`), la referencia es la
 * propia categoría propuesta por el adaptador — autoconsistencia: "¿el
 * texto de este candidato contradice la categoría que él mismo recibió?".
 * No depende de ningún registro exógeno, por lo que es aplicable incluso
 * sin intentar ningún emparejamiento.
 *
 * Cuando se provee `referenceCategories` (p. ej. la categoría del
 * registro exógeno contra el que se está comparando), la MISMA tabla de
 * compatibilidad se reutiliza para detectar la contradicción cruzada:
 * "el texto de este candidato dice 'retención', pero se está comparando
 * contra un registro de ingresos" — exactamente el caso real del
 * benchmark (Fase F.1), incluso si el adaptador ya categorizó
 * correctamente al candidato como `withholding` (defensa en profundidad,
 * §6 del prompt de Fase F.2).
 */
export function detectSemanticContradiction(candidate: {
  originalConcept: string;
  normalizedConcept?: string;
  proposedCategory: TaxCategory;
  referenceCategories?: readonly TaxCategory[];
}): SemanticContradiction {
  const categories = new Set<TaxCategory>([
    candidate.proposedCategory,
    ...(candidate.referenceCategories ?? []),
  ]);
  const combinedText = `${candidate.originalConcept} ${candidate.normalizedConcept ?? ''}`;
  const markers = detectConceptRoleMarkers(combinedText);
  if (!markers.length) return { contradictory: false, marker: null, reason: null };
  const normalizedCombinedText = comparableText(combinedText);
  for (const category of categories) {
    const rules = FORBIDDEN_MARKERS_BY_CATEGORY[category];
    if (!rules || !rules.length) continue;
    for (const rule of rules) {
      if (!markers.includes(rule.marker)) continue;
      if (rule.overrideIfPresent && rule.overrideIfPresent.test(normalizedCombinedText)) continue;
      return { contradictory: true, marker: rule.marker, reason: reasonForMarker(rule.marker) };
    }
  }
  return { contradictory: false, marker: null, reason: null };
}
