# Cobertura de extracción documental

## Propósito

La cobertura técnica describe cuánto del PDF fue leído y convertido en estructura revisable. No es
una estimación de precisión tributaria.

## Métricas por sesión

`DocumentExtractionMetrics` conserva páginas totales, procesadas, con texto, con candidatos, sin
candidatos y con advertencias; bloques y secciones detectadas; candidatos generados, persistidos y
pendientes de generar; y conteos por estado y página.

El umbral `maxCandidates` es preventivo y configurable. Alcanzarlo produce una advertencia, pero no
trunca candidatos. La persistencia recibe el conjunto completo y la UI pagina solamente la
presentación en lotes de 10, 20, 50 o 100.

## Invariantes

- Generado y persistido se miden por separado.
- Ningún candidato desaparece: cambia a confirmado, corregido, rechazado, duplicado, informativo u
  obsoleto.
- Las ejecuciones previas permanecen consultables.
- El texto completo y las contraseñas no se persisten.

## Diagnóstico

Si `candidatesGenerated` difiere de `candidatesPersisted`, la sesión debe mostrar el hallazgo y
`candidatesPendingGeneration`. Los filtros nunca modifican los datos; solo la proyección visible.
