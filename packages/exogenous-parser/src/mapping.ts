import { CANONICAL_FIELDS, type CanonicalField, type ColumnMapping } from '@nexus-tax/domain';
import type { ColumnDescriptor } from './columns';

/**
 * Sinónimos de encabezados por campo canónico.
 * Son claves de comparación ya normalizadas (minúsculas, sin tildes). Sirven
 * como ADAPTADOR configurable, no como regla rígida acoplada a un solo archivo.
 */
export const HEADER_SYNONYMS: Record<CanonicalField, string[]> = {
  entityName: [
    'nombre del tercero',
    'nombre tercero',
    'razon social',
    'nombre o razon social',
    'tercero',
    'nombre',
    'entidad',
    'agente retenedor',
  ],
  reportingEntityDocument: [
    'nit del tercero',
    'nit tercero',
    'nit',
    'numero de identificacion',
    'identificacion',
    'documento',
    'cedula',
    'id tercero',
  ],
  reportedPersonDocument: [
    'nit persona reportada',
    'identificacion reportada',
    'documento reportado',
    'nit',
    'identificacion',
    'documento',
  ],
  conceptCode: ['codigo del concepto', 'codigo concepto', 'cod concepto', 'codigo', 'concepto cod'],
  conceptLabel: [
    'descripcion del concepto',
    'descripcion concepto',
    'nombre del concepto',
    'concepto',
    'descripcion',
    'detalle',
  ],
  reportedValue: [
    'valor reportado',
    'valor del pago',
    'valor bruto',
    'valor pago o abono',
    'valor',
    'monto',
    'pago o abono en cuenta',
    'ingreso',
  ],
  withholding: [
    'retencion en la fuente',
    'valor retencion',
    'retefuente',
    'rete fuente',
    'retencion',
    'retenciones',
  ],
  suggestedUse: ['uso declaracion sugerida', 'uso sugerido', 'declaracion sugerida'],
  additionalInformation: ['informacion adicional', 'datos adicionales', 'observaciones'],
};

const PARENT_HINTS: Partial<Record<CanonicalField, string[]>> = {
  entityName: ['persona que reporta'],
  reportingEntityDocument: ['persona que reporta'],
  reportedPersonDocument: ['informacion reportada'],
  conceptCode: ['informacion reportada'],
  conceptLabel: ['informacion reportada'],
  reportedValue: ['informacion reportada'],
  withholding: ['informacion reportada'],
  suggestedUse: ['informacion reportada'],
  additionalInformation: ['informacion reportada'],
};

/**
 * Adivina el mapeo de columnas comparando el encabezado normalizado con los
 * sinónimos. Es determinista: recorre los campos en orden canónico y, dentro de
 * cada campo, elige la mejor coincidencia por especificidad (sinónimo más largo).
 * El resultado es una SUGERENCIA; la UI permite mapeo manual.
 */
export function guessColumnMapping(columns: ColumnDescriptor[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const usedColumnKeys = new Set<string>();

  for (const field of CANONICAL_FIELDS) {
    const synonyms = HEADER_SYNONYMS[field];
    let best: { column: ColumnDescriptor; specificity: number } | null = null;

    for (const column of columns) {
      if (column.isUnnamed || usedColumnKeys.has(column.key)) continue;
      for (const syn of synonyms) {
        // Coincidencia exacta o por inclusión de la palabra clave.
        const exact = column.normalized === syn;
        const included = column.normalized.includes(syn);
        if (!exact && !included) continue;
        const parent = column.parent ? column.parent.toLowerCase() : '';
        const parentBonus = (PARENT_HINTS[field] ?? []).some((hint) => parent.includes(hint))
          ? 10_000
          : 0;
        const specificity = parentBonus + (exact ? 1000 : 0) + syn.length;
        if (!best || specificity > best.specificity) {
          best = { column, specificity };
        }
      }
    }

    if (best) {
      mapping[field] = best.column.key;
      usedColumnKeys.add(best.column.key);
    }
  }

  return mapping;
}

/** Resuelve el descriptor de columna asociado a un campo canónico, si existe. */
export function resolveColumn(
  columns: ColumnDescriptor[],
  mapping: ColumnMapping,
  field: CanonicalField,
): ColumnDescriptor | undefined {
  const key = mapping[field];
  if (!key) return undefined;
  return (
    columns.find((column) => column.key === key) ??
    columns.find((column) => column.original === key)
  );
}
