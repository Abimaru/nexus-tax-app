import type { NumericEvidenceClassification, NumericEvidenceRole } from '@nexus-tax/domain';
import { comparableText } from './normalize';

/**
 * Clasificador puro de evidencia numérica (Sprint 2.4, Fase E / E.1, §3-§8
 * de `docs/EVIDENCE_MATCHING.md`).
 *
 * Recibe un token numérico crudo y su contexto (línea completa, página) y
 * devuelve el rol más probable según señales léxicas cercanas — nunca
 * decide con IA externa, nunca usa red, y nunca descarta el token: incluso
 * cuando el rol es ruido (`tax_identifier`, `year`, etc.) el resultado se
 * conserva como evidencia inspeccionable (§6).
 *
 * Este clasificador alimenta DOS consumidores con responsabilidades
 * distintas (Fase E.1, §2-§5):
 *
 * 1. `classifyDocumentNumericEvidence` (`adapters.ts`): clasifica TODA la
 *    evidencia de un documento para inspección (nunca descarta un token).
 * 2. `monetaryMatches` (`adapters.ts`): usa el MISMO clasificador como
 *    "promotion gate" — solo el rol `money` (y, de forma conservadora,
 *    `unknown`, marcado `requires_review`) puede convertirse en
 *    `DocumentFactCandidate`. Los roles de ruido (`tax_identifier`,
 *    `personal_identifier`, `account_number`, `document_reference`,
 *    `legal_reference`, `date`, `year`, `percentage`, `page_number`)
 *    nunca se promueven como candidato monetario principal.
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

// Identificadores ABSOLUTOS (§7): un NIT o un documento de identidad
// personal nunca deja de serlo por estar en la misma línea que una
// palabra de monto ("saldo", "valor", etc.) — a diferencia de las
// referencias de cuenta/documento/legal más abajo, que SÍ pueden ceder
// ante una palabra de monto cuando el token también tiene formato de
// miles/decimales (§8).
const ABSOLUTE_IDENTIFIER_RULES: readonly RoleRule[] = [
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
];

// Referencias contextuales (§8): ceden ante una palabra de monto cercana
// cuando el token tiene formato de miles/decimales (ver
// `moneyTriggerOverridesFormatting` más abajo).
const CONTEXTUAL_NOISE_RULES: readonly RoleRule[] = [
  {
    role: 'account_number',
    pattern: /\b(?:cuenta|numero de cuenta|no de cuenta|producto no|obligacion(?: no)?)\b/,
    reason:
      'Precedido o seguido de "cuenta"/"producto"/"obligación": número de cuenta u obligación, no un monto.',
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

// Palabras que indican explícitamente un monto (§8): "Saldo obligación
// 45.123.456" debe clasificarse como dinero pese a mencionar
// "obligación", precisamente porque también aparece "saldo" Y el token
// tiene formato de miles. Sin esta palabra de monto, "Obligación
// 4512345678" (sin formato) sigue siendo un identificador.
const MONEY_TRIGGER_WORDS =
  /\b(?:saldo|saldos|valor|valores|monto|montos|pago|pagos|pagado|pagados|interes|intereses|rendimiento|rendimientos|retencion|retenciones|ingreso|ingresos|deuda|deudas|patrimonio|aporte|aportes|capital|abono|abonos|total|totales|consignacion|consignaciones)\b/;

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
  // justo después del token, ANTES de cualquier otra regla.
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
  const isBareYear = /^\d{4}$/.test(raw.trim()) && Number(raw) >= 1900 && Number(raw) <= 2100;
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

  // Símbolo de moneda pegado al propio token (p. ej. "$4.500.000"): señal
  // inequívoca, se resuelve ANTES que cualquier palabra de contexto —
  // incluidos NIT/CC— porque el símbolo está atado a ESTE token, no a
  // otro número que pueda compartir la misma línea/ventana (§6, §8). P.
  // ej. en "NIT 900.123.456-7: $ 5.000.000" el símbolo demuestra que
  // "$ 5.000.000" es el monto, aun cuando "NIT" caiga dentro de su
  // ventana de contexto por la corta distancia entre ambos números.
  const hasRawCurrency = /(?:\$|cop)/i.test(raw);
  if (hasRawCurrency) {
    return {
      raw,
      role: 'money',
      confidence: 'high',
      reasons: ['Tiene símbolo de moneda explícito ($/COP) junto al propio valor.'],
      page: context.page,
      lineExcerpt,
    };
  }

  // Identificadores ABSOLUTOS (§7): NIT/RUT y documento de identidad
  // personal ganan siempre, incluso si el token tiene formato de miles
  // (los NIT colombianos se escriben con puntos, p. ej. 900.123.456-7) o
  // si hay una palabra de monto en la misma línea.
  for (const rule of ABSOLUTE_IDENTIFIER_RULES) {
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

  // Palabra de monto + formato de miles/decimales (§8): una etiqueta de
  // referencia (cuenta/obligación/resolución) puede convivir en la misma
  // línea con la palabra de monto ("Saldo obligación 45.123.456"); en ese
  // caso el formato del NÚMERO decide, no la etiqueta de referencia.
  const hasFormatting = /[.,]/.test(raw);
  const lineHasMoneyTrigger = MONEY_TRIGGER_WORDS.test(comparableText(context.line));
  if (lineHasMoneyTrigger && hasFormatting) {
    return {
      raw,
      role: 'money',
      confidence: 'medium',
      reasons: [
        'La línea menciona una palabra de monto ("saldo"/"valor"/...) y el valor tiene formato de miles/decimales.',
      ],
      page: context.page,
      lineExcerpt,
    };
  }

  // Referencias contextuales (§5, §8): cuenta/obligación, resolución,
  // referencia legal, fecha, página. Sin el atajo anterior, "Cuenta
  // 1234567890" u "Obligación 4512345678" (sin formato ni palabra de
  // monto) siguen clasificándose como identificador/referencia.
  for (const rule of CONTEXTUAL_NOISE_RULES) {
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

  // NIT/cédula colombianos sin etiqueta explícita: 6-10 dígitos
  // consecutivos sin separadores de miles ni símbolo de moneda.
  const looksLikeIdentifier =
    /^\d{6,10}(?:-\d)?$/.test(raw.trim()) && !hasFormatting && !/(?:\$|cop)/i.test(window);
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

  const hasCurrencySymbol = /(?:\$|cop)/i.test(window.slice(0, 10));
  const numericValue = Number(digitsOnly || '0');

  if (hasCurrencySymbol || hasFormatting || numericValue >= 10_000) {
    return {
      raw,
      role: 'money',
      confidence: hasCurrencySymbol ? 'high' : hasFormatting ? 'medium' : 'low',
      reasons: [
        hasCurrencySymbol
          ? 'Tiene símbolo de moneda explícito ($/COP).'
          : hasFormatting
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
