import type { RawCell } from './workbook';
import { normalizeForCompare } from './text';
import { HEADER_SYNONYMS } from './mapping';

/**
 * Detección de la fila de encabezados.
 * Tolera que los encabezados NO estén en la primera fila (§6): escanea las
 * primeras filas y elige la de mayor "aspecto de encabezado".
 */

export interface HeaderDetection {
  headerRowIndex: number;
  /** Confianza heurística 0..1. */
  confidence: number;
}

const ALL_SYNONYMS: string[] = Object.values(HEADER_SYNONYMS).flat();

/** Puntúa cuán "encabezado" parece una fila. */
function scoreHeaderRow(row: RawCell[]): number {
  const nonEmpty = row.filter((c) => c !== null && String(c).trim() !== '');
  if (nonEmpty.length === 0) return 0;

  let textCells = 0;
  let synonymHits = 0;
  for (const cell of nonEmpty) {
    if (typeof cell === 'string') {
      textCells += 1;
      const norm = normalizeForCompare(cell);
      if (ALL_SYNONYMS.some((syn) => norm.includes(syn))) synonymHits += 1;
    }
  }

  const textRatio = textCells / nonEmpty.length;
  const fillRatio = nonEmpty.length / Math.max(row.length, 1);
  const synonymBonus = Math.min(synonymHits, 4) * 0.25;
  // Encabezados: muchas celdas de texto, buena cobertura y coincidencia de sinónimos.
  return textRatio * 0.5 + fillRatio * 0.2 + synonymBonus;
}

export function detectHeaderRow(matrix: RawCell[][], maxScanRows: number): HeaderDetection {
  if (matrix.length === 0) return { headerRowIndex: 0, confidence: 0 };

  const limit = Math.min(maxScanRows, matrix.length);
  let bestIndex = 0;
  let bestScore = -1;

  for (let r = 0; r < limit; r += 1) {
    const score = scoreHeaderRow(matrix[r] ?? []);
    // Empate: se conserva la fila más temprana (determinismo).
    if (score > bestScore) {
      bestScore = score;
      bestIndex = r;
    }
  }

  // Normaliza la confianza a 0..1 (el puntaje máximo teórico ronda 1.7).
  const confidence = Math.max(0, Math.min(1, bestScore / 1.7));
  return { headerRowIndex: bestIndex, confidence };
}
