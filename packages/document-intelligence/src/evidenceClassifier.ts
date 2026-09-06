import type { NumericEvidenceClassification, NumericEvidenceRole } from '@nexus-tax/domain';
import { comparableText } from './normalize';

/**
 * Clasificador puro de evidencia numérica (Sprint 2.4, Fase E, §3-§6 de
 * `docs/EVIDENCE_MATCHING.md`).
 *
 * Recibe un token numérico crudo y su contexto (línea completa, página) y
 * devuelve el rol más probable según señales léxicas cercanas — nunca
 * decide con IA externa, nunca usa red, y nunca descarta el token: incluso
 * cuando el rol es ruido (`tax_identifier`, `year`, etc.) el resultado se
 * conserva como evidencia inspeccionable (§6).
 *
 * Este clasificador es INDEPENDIENTE del filtro ad-hoc de `monetaryMatches`
 * en `adapters.ts` (formato/símbolo de moneda/rango 1900-2100). Se usa
 * ANTES de decidir si un token se promueve a `DocumentFactCandidate`: si el
 * rol no es `money`, el token se agrega a `suppressedNumericEvidence` de la
 * sesión en vez de convertirse en un candidato monetario.
 */

interface ClassificationContext {
  /** Línea completa donde aparece el token (para contexto léxico). */
  line: string;
  /** Índice donde empieza el token dentro de `line`. */
  index: number;
  /** Página donde aparece, o null si no se conoce. */
  page: number | null;
}

interface RoleRule {
  role: NumericEvidenceRole;
  /** Palabras/patrones que, si aparecen cerca del token, activan este rol. */
  pattern: RegExp;
  reason: string;
}

const WINDOW_CHARS = 40;

function contextWindow(line: string, index: number, rawLength: number): string {
  const start = Math.max(0, index - WINDOW_CHARS);
  const end = Math.min(line.length, index + rawLength + WINDOW_CHARS);
  return comparableText(line.slice(start, end));
}

// Señales negativas ordenadas de mayor a menor especificidad. La primera
// que coincida con el contexto cercano determina el rol de ruido.
const NOISE_RULES: readonly RoleRule[] = [
  {
    role: 'tax_identifier',
    pattern: /\b(?:nit|rut)\b/,
    reason: 'Precedido o seguido de "NIT"/"RUT": identificador tributario, no un monto.',
  },
  {
    role: 'personal_identifier',
    pattern: /\b(?:cedula|cc|c c|documento de identidad|tarjeta de identidad|ti\b|pasaporte)\b/,
    reason: 'Precedido o seguido de un documento de identidad personal, no un monto.',
  },
  {
    role: 'account_number',
    pattern: /\b(?:cuenta|numero de cuenta|no de cuenta|producto no|obligacion no)\b/,
    reason: 'Precedido o seguido de "cuenta"/"producto": número de cuenta, no un monto.',
  },
  {
    role: 'document_reference',
    pattern:
      /\b(?:resolucion|radicado|factura no|factura numero|consecutivo|folio|formulario|expediente|acta)\b/,
    reason: 'Precedido o seguido de un número de referencia documental, no un monto.',
  },
  {
    role: 'legal_reference',
    pattern: /\b(?:articulo|decreto|ley|estatuto tributario|circular|concepto dian)\b/,
    reason: 'Precedido o seguido de una referencia normativa (artículo/decreto/ley), no un monto.',
  },
  {
    role: 'date',
    pattern: /\b(?:fecha|dia|mes|vencimiento|expedicion|corte)\b/,
    reason: 'Precedido o seguido de una referencia de fecha, no un monto.',
  },
  {
    role: 'page_number',
    pattern: /\b(?:pagina|pag|hoja)\b/,
    reason: 'Precedido o seguido de "página"/"hoja": numeración de página, no un monto.',
  },
];

/**
 * Clasifica un token numérico crudo según el contexto donde aparece.
 *
 * @param raw texto crudo del token (p. ej. `"900123456"`, `"1.000.000"`).
 * @param context línea completa, índice del token dentro de la línea, y
 *   página (para trazabilidad de la evidencia conservada).
 */
export function classifyNumericEvidence(
  raw: string,
  context: ClassificationContext,
): NumericEvidenceClassification {
  const window = contextWindow(context.line, context.index, raw.length);
  const lineExcerpt = context.line.trim().slice(0, 200);
  const digitsOnly = raw.replace(/\D/g, '');

  // El signo "%" se pierde al normalizar (comparableText descarta la
  // puntuación), así que se revisa directamente sobre la línea cruda,
  // justo después del token, ANTES de las reglas basadas en palabras
  // normalizadas.
  const followingChars = context.line.slice(
    context.index + raw.length,
    context.index + raw.length + 2,
  );
  if (/^\s*%/.test(followingChars)) {
    return {
      raw,
      role: 'percentage',
      confidence: 'high',
      reasons: ['Seguido de "%": es un porcentaje, no un monto.'],
      page: context.page,
      lineExcerpt,
    };
  }

  // Año de 4 dígitos aislado (sin separadores de miles ni símbolo de
  // moneda) en rango razonable: casi siempre una referencia temporal, no
  // un monto en pesos.
  const isBareYear =
    /^\d{4}$/.test(raw.trim()) && Number(raw) >= 1900 && Number(raw) <= 2100;
  if (isBareYear) {
    return {
      raw,
      role: 'year',
      confidence: 'medium',
      reasons: ['Número de 4 dígitos en rango de año (1900-2100) sin formato monetario.'],
      page: context.page,
      lineExcerpt,
    };
  }

  // NIT/cédula colombianos suelen tener 6-10 dígitos consecutivos sin
  // separadores de miles ni símbolo de moneda explícito.
  const looksLikeIdentifier =
    /^\d{6,10}(?:-\d)?$/.test(raw.trim()) && !/[.,]/.test(raw) && !/(?:\$|cop)/i.test(window);

  for (const rule of NOISE_RULES) {
    if (rule.pattern.test(window)) {
      return {
        raw,
        role: rule.role,
        confidence: 'medium',
        reasons: [rule.reason],
        page: context.page,
        lineExcerpt,
      };
    }
  }

  if (looksLikeIdentifier) {
    return {
      raw,
      role: 'tax_identifier',
      confidence: 'low',
      reasons: [
        'Secuencia de 6 a 10 dígitos sin separadores de miles ni símbolo de moneda: posible identificador.',
      ],
      page: context.page,
      lineExcerpt,
    };
  }

  const hasCurrencySymbol = /(?:\$|cop)/i.test(raw) || /(?:\$|cop)/i.test(window.slice(0, 10));
  const hasThousandsFormatting = /[.,]/.test(raw);
  const numericValue = Number(digitsOnly || '0');

  if (hasCurrencySymbol || hasThousandsFormatting || numericValue >= 10_000) {
    return {
      raw,
      role: 'money',
      confidence: hasCurrencySymbol ? 'high' : hasThousandsFormatting ? 'medium' : 'low',
      reasons: [
        hasCurrencySymbol
          ? 'Tiene símbolo de moneda explícito ($/COP).'
          : hasThousandsFormatting
            ? 'Tiene formato de separador de miles/decimales típico de un monto.'
            : 'Valor igual o mayor a 10.000 sin otra señal de ruido cercana.',
      ],
      page: context.page,
      lineExcerpt,
    };
  }

  return {
    raw,
    role: 'unknown',
    confidence: 'low',
    reasons: ['No hay señales suficientes para clasificar el token con confianza.'],
    page: context.page,
    lineExcerpt,
  };
}
