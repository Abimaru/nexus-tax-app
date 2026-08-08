# Interpretación monetaria documental

## Incidente y prevención

Antes del Sprint 2.3.2 un texto como `364.741,49` podía perder la semántica de
sus separadores y terminar con escala incorrecta. El parser
`moneyParserVersion = 2.0.0` decide primero el formato y conserva la evidencia.

`AmountCandidate` guarda texto original y normalizado, valor decimal, valor
fiscal redondeado, locale, separadores, estrategia, confianza, advertencias,
documento, página, geometría y método de extracción. `rawText` es inmutable.

```text
texto PDF/OCR -> parseMoneyAmount -> AmountCandidate
-> revisión humana -> DocumentFact -> casilla F-210
```

El parser reconoce `es-CO`, `en-US` y enteros. Una representación ambigua
conserva advertencia y no adquiere confianza alta.

## Redondeo y anomalías

`roundDocumentAmountToTaxPeso` redondea al peso más cercano; los empates se
alejan de cero. Es una política técnica explícita, pendiente de fundamento
tributario oficial específico. La UI conserva el valor decimal interpretado.

`detectMonetaryAnomalies` identifica ambigüedad, baja confianza, diferencias
documento/exógena y factores aproximados ×10, ×100 o ×1000. Una fuente afectada
queda en `requires_review`; sus casillas derivadas heredan la revisión.

Dexie v12 marca candidatos heredados con `moneyParserVersion = legacy`,
`requiresMoneyReanalysis = true` y `previousParsedValue`. Nunca sobrescribe una
resolución humana confirmada.

Los tests cubren formatos colombianos y anglosajones, enteros, ambigüedad,
redondeo, escala ×100 y preservación de evidencia.
