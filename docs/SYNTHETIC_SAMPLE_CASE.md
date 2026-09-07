# Caso tributario sintético "Golden Case" — Sprint 2.4, Fase G.1

Rama `feature/sprint-2.4-realistic-sample`.

## Objetivo

Reemplazar/mejorar el sample/demo mínimo existente (`samples/generate-sample.mjs`,
un único archivo exógeno de humo) por un expediente colombiano AG 2025
completamente **ficticio**, coherente entre todas sus fuentes y
suficientemente complejo para servir como:

- demo comprensible por una persona no contadora;
- regresión automatizada del pipeline real (parser de exógena, adaptadores
  documentales, matcher, motor de inmuebles, dependientes, facturación
  electrónica, declaración anterior);
- referencia de diseño para futuras fases.

Construido **únicamente** con los patrones aprendidos de los benchmarks
reales de Fase F/F.1/F.2/F.3 (nunca copiando datos, valores, nombres,
documentos o combinaciones reconstruibles de esos casos reales).

## Auditoría del sample anterior

`samples/generate-sample.mjs` (sin cambios en esta fase, sigue vigente para
smoke tests manuales de un solo archivo):

- genera un único libro exógeno con 5 registros (banco, empleador, pensión,
  vivienda, un duplicado y un identificador largo) para probar la robustez
  del lector de Excel;
- no está referenciado por ningún test automatizado (`grep` confirmó que
  ningún E2E ni test unitario lo usa: cada E2E construye su propio Excel
  sintético inline, siempre con el mismo formato "Persona que reporta");
- no representa declaración anterior, facturación electrónica, dependientes,
  inmuebles ni ninguna de las fases posteriores a Sprint 2.3;
- no tiene ninguna tabla de reconciliaciones esperada ni "golden expectations"
  — cualquier regresión en el matcher/parser pasaría desapercibida;
- no existe ningún mecanismo de UI "Cargar caso de ejemplo" en la aplicación
  (confirmado por búsqueda exhaustiva en `apps/web/src`) — el sample de hoy
  es exclusivamente una utilidad de desarrollo para generar un archivo
  manualmente.

**Decisión**: no se crea un segundo sistema de muestras. El nuevo caso
sintético vive en `apps/web/src/lib/goldenCase.ts` (TypeScript, dentro del
paquete que ya depende de `@nexus-tax/exogenous-parser`,
`@nexus-tax/document-intelligence` y `@nexus-tax/aegis-rules`), y su
coherencia se valida en `apps/web/src/lib/goldenCase.test.ts` ejecutando el
pipeline REAL, no un mock. `samples/generate-sample.mjs` se mantiene para su
propósito original (archivo mínimo de humo).

## Perfil ficticio

| Campo | Valor |
| --- | --- |
| Alias | Persona Sintetica Golden Case AG 2025 |
| Documento | `1000000001` (patrón obviamente ficticio: todo ceros salvo el último dígito) |
| Año gravable | 2025 |
| Año anterior | 2024 |
| Perfil | Persona natural residente, ingresos laborales + rendimientos financieros + retenciones + patrimonio + inmueble arrendado + dependiente + facturación electrónica + declaración anterior |

Ningún identificador coincide con los documentos usados durante los
benchmarks reales de Fase F/F.1 (`1130641532`/`1130671777`) — verificado por
un test de guardarraíl permanente (§Tests).

## Fuentes sintéticas incluidas

| Fuente | Dónde vive | Qué demuestra |
| --- | --- | --- |
| Exógena AG 2025 | `buildGoldenExogenousWorkbook()` | Salarios, rendimientos financieros, retención, saldo bancario, aporte a cesantías, aportes obligatorios a pensión, ambigüedad deliberada, 5 topes |
| Formulario 220 | `GOLDEN_DOCUMENTS['form-220']` | Ingresos laborales coherentes con la exógena |
| Certificado tributario consolidado | `GOLDEN_DOCUMENTS['consolidated-financial']` | Rendimientos, retención, saldo, ambigüedad — un solo documento, 4 conceptos |
| Certificado de cesantías | `GOLDEN_DOCUMENTS['severance']` | Aporte patronal coherente con la exógena |
| Certificado de intereses de vivienda | `GOLDEN_DOCUMENTS['housing-interest']` | Document-only: la vivienda nunca se reporta en exógena (protecciones de Fase F.2) |
| Certificado predial | `GOLDEN_DOCUMENTS['property-tax']` | Avalúo catastral e impuesto predial del inmueble arrendado |
| Cuenta de cobro de administración | `GOLDEN_DOCUMENTS['property-administration']` | Cuota mensual y total anual, cada una su propio candidato (nunca `mensual × 12`) |
| Declaración anterior AG 2024 | `GOLDEN_PRIOR_YEAR_TEXT_LINES` | Identidad coincidente, anticipo (box 133), saldo a favor (box 137), evolución patrimonial |
| Reporte DIAN de facturación electrónica | `buildGoldenElectronicInvoiceWorkbook()` | 3 CUFE únicos, una compra no elegible (pago en efectivo), notas crédito, base del 1 % derivada por el motor real |
| Dependiente | `GOLDEN_DEPENDENT_INPUT` | Hijo menor elegible con soporte de registro civil; ambos beneficios (art. 387/336) coexisten automáticamente (naturaleza laboral) |
| Inmueble | `GOLDEN_PROPERTY_INPUT` + `GOLDEN_RENTAL_ACTIVITY_INPUT` + `GOLDEN_PROPERTY_EXPENSE_INPUT` | Apartamento arrendado todo el año, ingreso vinculado manualmente, cuota de administración con soporte suficiente |

**No incluido deliberadamente** (extensión futura, ver `docs/ROADMAP.md`):
`annual_cost_report` (documento opcional, "cuando sea útil" por el prompt de
esta fase — el caso ya tiene suficiente cobertura documental sin él) y una
segunda propiedad de residencia personal (el prompt permite omitirla "si no
sobrecarga la demo").

## Tabla de reconciliaciones esperada (§7 del prompt)

| Escenario | Concepto | Documento | Exógena | Resultado esperado |
| --- | --- | --- | --- | --- |
| A. `exact_match` | Rendimientos financieros | $ 1.800.000 | $ 1.800.000 | Coincide exactamente |
| B. `rounding_match` | Retención en la fuente | $ 68.000,40 | $ 68.000 | Redondea al mismo peso |
| C. `minor_difference` | Saldo cuenta bancaria | $ 32.500.080 | $ 32.500.000 | Diferencia de $80, dentro de tolerancia |
| D. contradicción semántica | Retención mal clasificada como ingreso | *(candidato construido directamente para ejercitar el gate, ver nota)* | — | Nunca `exact_match`/`rounding_match`; siempre requiere revisión |
| E. `document_only` | Intereses de vivienda | $ 3.200.000 | *(sin registro — nunca se reporta)* | Confirmación directa del documento |
| F. exógena-only | Aportes obligatorios a pensión | *(sin documento)* | $ 2.400.000 | `unresolved`, acción "capturar manualmente" |
| G. ambigüedad | Rendimientos financieros (2 bancos) | $ 950.000 | $ 950.000 (Cooperativa) y $ 950.000 (Fondo) | `ambiguous`, requiere elegir |

**Nota sobre D**: los adaptadores reales del golden case NUNCA producen esta
clasificación errónea desde la raíz (corrección de Fase F.2). Para
demostrar que la red de seguridad (`detectSemanticContradiction`,
`@nexus-tax/document-intelligence`) sigue activa, el test construye
directamente un candidato adversarial ("lo que un extractor menos protegido
podría producir") y confirma que la contradicción se detecta. Esto es
transparente en `goldenCase.test.ts` — no es un valor que emerja
orgánicamente de los documentos del caso.

`falseConfidentMatches = 0` en todo el caso (verificado indirectamente: cada
escenario etiquetado A-C tiene el estado exacto esperado, nunca uno más
optimista).

## Golden expectations

En vez de un snapshot gigante y frágil, las expectativas concretas viven como
constantes nombradas en `goldenCase.ts` (`GOLDEN_EXOGENOUS_VALUES`,
`GOLDEN_ELECTRONIC_INVOICE_EXPECTATIONS`) y se verifican en
`goldenCase.test.ts`:

- `GOLDEN_EXOGENOUS_RECORDS.length` = 8 registros (incluye los 2 de la
  ambigüedad deliberada);
- 5 topes reconocidos por contenido, nunca por posición de fila;
- facturación electrónica: 3 facturas, 3 CUFE únicos, bruto
  $ 6.300.000, notas crédito $ 500.000, neto $ 5.800.000 (coincide
  exactamente con el Tope 5 de la exógena — sin doble conteo), base
  susceptible del 1 % $ 5.000.000 (derivada por el motor real, nunca
  hardcodeada);
- declaración anterior: identidad coincidente, al menos un candidato de
  arrastre derivado de la casilla 133 (anticipo del año siguiente);
- dependiente: elegible tras un soporte, ambos beneficios candidatos;
- inmueble: `requires_context` antes de registrar período/ingreso,
  `potentially_deductible` después — nunca automático;
- Human Review Burden: techo modesto (`< 20` decisiones totales incluso sin
  ningún documento vinculado todavía), consciente y deliberadamente lejos
  de las ~88 decisiones del benchmark real (Fase F.1/F.3).

## Cómo extenderlo

1. Añadir nuevas constantes/documentos en `goldenCase.ts`, siguiendo el
   mismo patrón: representación textual (`representation()` en el test, o
   un libro XLSX vía `XLSX.utils`), nunca un PDF binario salvo que la suite
   lo requiera explícitamente.
2. Mantener la coherencia entre exógena y documentos: un mismo NIT/entidad
   ficticia debe usarse en ambos lados cuando el escenario lo requiera.
3. Nunca reutilizar valores, documentos, nombres o combinaciones de un
   expediente real, ni siquiera parcialmente.
4. Agregar una prueba de coherencia dedicada en `goldenCase.test.ts` (no
   basta con agregar el dato: debe demostrarse que el pipeline real lo
   procesa como se espera).
5. Actualizar la tabla de este documento si se agrega o cambia un
   escenario de reconciliación.

## Prohibición explícita

Ningún valor de `goldenCase.ts`/`goldenCase.test.ts` proviene de un
expediente real. Está prohibido:

- copiar nombres, NIT, documentos, cuentas, CUFE, direcciones o valores de
  cualquier expediente real, incluidos los usados durante los benchmarks de
  Fase F/F.1;
- usar nombres de archivo, comentarios o nombres de test que referencien un
  caso real;
- commitear cualquier PDF/Excel real, captura de pantalla o dato que
  permita reconstruir un caso real.

Un test de guardarraíl permanente (`§19` en `goldenCase.test.ts`) verifica
que ninguno de los dos documentos usados durante el benchmark real
(`1130641532`/`1130671777`) aparece en ninguna constante del caso sintético.

## Límite de alcance — Formulario 210

El caso sintético usa únicamente casillas ya soportadas por el Formulario
210 (declaración anterior: boxes 29/89/130/132/133/137; facturación
electrónica: casilla 28). El inmueble deliberadamente **no** aparece
cableado a ninguna casilla — Fase G decidió explícitamente no integrar
`PropertyExpense`/`RentalIncome` al Formulario 210 todavía (ver
`docs/PROPERTY_INCOME_EXPENSES_2025.md`); el caso sintético respeta esa
misma limitación y no aparenta una funcionalidad inexistente.

## E2E

No existe un mecanismo de UI "Cargar caso de ejemplo" en NexusTax hoy (§18
del prompt es condicional a que exista). Por eso esta fase no agrega un
E2E de "cargar sample": en su lugar, `goldenCase.test.ts` (24 tests)
ejercita el pipeline real de extremo a extremo — parser de exógena,
clasificación y extracción documental, matcher candidato↔exógena,
facturación electrónica, motor de dependientes, motor de inmuebles y
declaración anterior — con un rigor equivalente o mayor al de un recorrido
de UI, porque valida directamente el código de producción sin intermediar
por la interfaz.

## Quality gate

`check:encoding`, `pnpm -r typecheck`, `pnpm -r lint`, `pnpm -r test`
(incluye los 24 tests nuevos de `goldenCase.test.ts`), `pnpm build`,
`pnpm test:e2e` (sin cambios: no se agregó ningún E2E nuevo en esta fase,
ver sección anterior) — todo en verde.
