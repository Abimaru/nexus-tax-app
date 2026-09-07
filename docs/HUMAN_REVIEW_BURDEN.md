# Human Review Burden (Sprint 2.4, Fase F.3)

Métrica local de benchmark introducida en la Fase F.3 (Unified Reconciliation & Coverage
Hardening) para aproximar "cuántas decisiones humanas hacen falta para cerrar un expediente" con
más granularidad que solo contar candidatos. **Nunca se persiste ni se envía como telemetría** —
es una función pura, calculable en tests y en un benchmark local sobre datos ya cargados.

## Contrato

`computeHumanReviewBurden` (`apps/web/src/lib/evidenceReview.ts`) recibe la lista de
`EvidenceReviewSuggestion` ya producida por `buildEvidenceReviewSuggestions` y devuelve:

```ts
interface HumanReviewBurden {
  bulkConfirmable: number;
  meaningfulHumanReview: number;
  manualGuidedCapture: number;
  irrelevantCandidateReview: number;
  unresolvedAfterAllDocuments: number;
  total: number;
}
```

- **`bulkConfirmable`**: sugerencias marcadas `safeForBulkConfirm` — cero esfuerzo real, un solo
  clic masivo. Nunca incluye una sugerencia con contradicción semántica (Fase F.2) ni con
  anomalías monetarias.
- **`meaningfulHumanReview`**: sugerencias con relación candidato↔registro que SÍ requieren
  criterio humano (coincidencia probable, ambigüedad, contradicción, o un exact/rounding que quedó
  fuera del bloque por alguna anomalía) — la revisión "con sentido" del expediente.
- **`manualGuidedCapture`**: expectativas sin ningún candidato — exigen captura manual guiada.
- **`irrelevantCandidateReview`**: candidatos sin relación con la exógena (`new_relevant_value`) —
  un humano debe mirarlos al menos una vez para decidir si son relevantes o descartables; en la
  práctica suelen incluir tanto evidencia legítima (p. ej. vivienda, §15 de Fase F.2) como ruido
  documental.
- **`unresolvedAfterAllDocuments`**: lo que sigue sin resolver incluso después de haber cargado
  todos los documentos disponibles — hoy coincide exactamente con `manualGuidedCapture` (ninguna
  expectativa sin candidato se resuelve por sí sola con más documentos ya cargados); se reporta
  con su propio nombre para alinear con el vocabulario del benchmark real de Fase F.1.

## Baseline real conocida (benchmark, Fase F.1 → F.3)

Medido sobre el mismo corpus real de 2 expedientes, 29 PDF y 2 exógenas (nunca copiado al
repositorio; solo conteos agregados/redactados salieron del análisis):

| Métrica | Antes (Fase F.1) | Después (Fase F.3) |
| --- | --- | --- |
| Human Review Burden total | ~192 (estimado) | 88 |
| bulkConfirmable | 2 | 6 |
| manualGuidedCapture / unresolvedAfterAllDocuments | 59 | 37 |
| irrelevantCandidateReview | 115 | 26 |

Ver `docs/EVIDENCE_MATCHING.md` §Fase F.3 para el detalle completo del rebenchmark y las causas de
la mejora (routing documental, cobertura de cesantías, exclusión de categorías estructuralmente
sin certificado esperado).

## Límites de esta métrica

- No distingue todavía "sin candidato ahora mismo" de "sin candidato tras cargar TODOS los
  documentos disponibles" — ambos casos caen en `manualGuidedCapture`/`unresolvedAfterAllDocuments`
  con el mismo valor. Distinguirlos requeriría una señal adicional sobre qué documentos ya se
  cargaron para ese tipo de expectativa.
- `irrelevantCandidateReview` no distingue automáticamente evidencia legítima (p. ej. vivienda) de
  ruido genuino — ambos requieren la misma revisión humana mínima, aunque su desenlace probable
  difiera.
- Es una aproximación local, no una medición de tiempo real de uso; sirve para comparar
  "antes/después" de un cambio, no como SLA.
