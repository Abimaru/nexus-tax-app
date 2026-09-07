# Adaptadores documentales

## Contrato

Cada `DocumentAdapterDefinition` declara `id`, `version`, tipos compatibles,
señales, campos, reglas, limitaciones y confianza base. Un adaptador recibe la
representación normalizada y un contexto de caso; devuelve candidatos y
advertencias. No conoce React, Dexie ni la matriz.

IDs y reglas quedan grabados en candidato y hecho confirmado. Cambiar reglas
requiere subir la versión del adaptador y agregar fixtures sintéticos que
protejan la compatibilidad.

## Catálogo inicial

| Adaptador                          | Tipos y grupos principales                                              |
| ---------------------------------- | ----------------------------------------------------------------------- |
| `co.form-220.generic`              | ingresos, cesantías, salud, pensión, retenciones y otros pagos          |
| `co.financial-certificate.generic` | saldos, deudas, rendimientos, intereses, retenciones, GMF e inversiones |
| `co.debt-certificate.generic`      | capital, intereses y saldo total                                        |
| `co.balance-certificate.generic`   | saldo al cierre y producto                                              |
| `co.housing-interest.generic`      | intereses de vivienda, corrección y saldo                               |
| `co.severance-certificate.generic` | saldo, abonos, retiros, rendimientos y retenciones                      |
| `co.property-tax.generic`          | avalúo, impuesto y participación                                        |
| `co.annual-cost-report.generic`    | intereses/rendimientos, retención, GMF, total informativo (Fase F.3)    |
| `co.property-administration.generic` | cuota extraordinaria, total anual, cuota mensual, saldo, pagos (Fase G) |
| `co.generic-label-value`           | pares concepto–valor no cubiertos; confianza baja                       |

El certificado financiero es multipropósito: una sola lectura genera grupos
independientes que pueden asociarse a distintos productos y requisitos. Desde
la versión 1.1.0 también reconstruye tablas a partir de las posiciones del PDF,
incluidos encabezados divididos en varias líneas. Conserva la etiqueta de la
fila o sección como producto detectado y relaciona cada importe con su columna
(saldo, rendimiento, retención, GMF, deuda o gasto financiero).

Para reducir falsos positivos, los importes requieren una señal monetaria
verificable: símbolo o moneda, separadores de miles/decimales, una magnitud
compatible o un cero en una columna monetaria. Se excluyen numeraciones de
sección, años, porcentajes y líneas explicativas de normas, artículos, leyes o
decretos. Cuando hay filas detalladas, los totales no se duplican como hechos.

## Defensa semántica (Sprint 2.4, Fase F.2)

Ningún adaptador decide por sí solo si un candidato es "confiable": la
categoría/naturaleza que propone una regla es una **etiqueta**, no una
garantía. `packages/document-intelligence/src/semanticGate.ts` detecta cuándo
el propio texto de un candidato contradice esa etiqueta (p. ej. "Retención
sobre rendimientos financieros" nunca es `financial_income`; "Base gravable
GMF" nunca es el valor deducible de GMF; "Saldo cuenta ahorros" nunca es una
deducción) y degrada el resultado del emparejador antes de permitir una
confirmación en bloque — ver `docs/EVIDENCE_MATCHING.md` §Fase F.2 para el
detalle completo. Además, en `co.financial.consolidated.generic`, una línea
con marcador léxico de retención ("retención"/"retenciones") **domina** sobre
cualquier regla de categoría "ingreso" en la misma línea: nunca se genera
también un candidato de ingreso para esa línea.

El adaptador `co.housing-interest.generic` amplió su vocabulario de intereses
(pagados/causados/del período) y de saldo de la obligación sin exigir la frase
literal "crédito hipotecario" (una entidad no bancaria también certifica
vivienda), y nunca infiere el valor de intereses a partir del saldo ni lo
calcula por diferencia — solo extrae evidencia documental explícita.

## Cobertura y routing (Sprint 2.4, Fase F.3)

- **Cesantías** (`co.severance.generic`): el saldo de cesantías se clasifica como categoría
  `severance` (antes `asset`), compatible con la categoría que la exógena asigna a un saldo de
  cesantías "en bruto" (`packages/exogenous-parser/src/classification.ts`). Se agregó
  reconocimiento de aporte/consignación patronal en ambos lados (documento y exógena) — antes un
  aporte de cesantías caía en `bank_movement` genérico del lado de la exógena, una incompatibilidad
  estructural real encontrada en el benchmark (Fase F.1).
- **`co.annual-cost-report.generic`** (nuevo): cubre intereses/rendimientos, retención, GMF y un
  total informativo de entidad — reutiliza el mismo mapeo que `co.financial.consolidated.generic`,
  sin duplicar el gate semántico.
- **Certificados tributarios consolidados**: la señal de clasificación `certificado tributario`
  (`classifier.ts`) no reconocía la redacción real plural "Certificados tributarios" — causa raíz
  real de una miscategorización a `debt_certificate` en el benchmark. Se corrigió y se agregaron
  señales estructurales acumulativas (saldo + rendimiento + retención + GMF) para que un documento
  multiproducto genuino supere a una clasificación más estrecha.
- **Routing documental explícito** (`packages/document-intelligence/src/documentRouting.ts`): antes
  de `extractCandidates`, una decisión pura determina si el documento debe usar el pipeline
  genérico, la ruta especializada de declaración anterior (`extractPriorYearForm210`), o quedar
  marcado como extracto bancario transaccional (detectado estructuralmente por conteo de fechas y
  vocabulario de movimiento, nunca por nombre de banco/NIT/filename) — en ese caso no se generan
  candidatos, pero el documento sigue disponible en biblioteca/evidencia/historial. Ver
  `docs/EVIDENCE_MATCHING.md` §Fase F.3 para el detalle completo.

### `co.property-administration.generic` (Sprint 2.4, Fase G)

Reconoce certificados/cuentas de cobro de administración de propiedad horizontal
(`property_administration_certificate`). Cinco reglas independientes, **nunca** derivadas unas de
otras (`monthly × 12` está explícitamente prohibido): `extraordinary-fee`, `annual-total`,
`monthly-fee`, `balance` (informativo, nunca un candidato de gasto) y `payments`. Ninguna regla ni
ningún texto de límite/advertencia menciona "factura" — el fundamento normativo (Decreto 1625 de
2016 art. 1.3.1.13.5 + Oficio DIAN 912878 de 2021: la cuota de administración es un aporte a
capital, no un hecho generador de IVA ni una venta/servicio facturable) hace que el soporte idóneo
sea la cuenta de cobro, el certificado de la copropiedad, un recibo o un comprobante/extracto de
pago — nunca una factura electrónica. Ver `docs/PROPERTY_INCOME_EXPENSES_2025.md` para el detalle
normativo completo y cómo este candidato documental se conecta con `PropertyExpense` y el motor de
elegibilidad puro.

## Reglas de extensión

1. Reutilizar normalización y evidencia; no codificar nombres de clientes.
2. No asumir que todas las filas o etiquetas existen.
3. No inventar valores, fechas, NIT o titulares ausentes.
4. Limitar cada fragmento a la etiqueta y contexto necesarios.
5. Expresar confianza con motivos verificables, no certeza legal.
6. Añadir casos de etiqueta, formato monetario, ausencia y ambigüedad.
7. Usar extractor genérico si las señales específicas no son suficientes.
8. Probar encabezados de una y varias líneas, columnas vacías y filas de total.

La selección/corrección del tipo en la vista de revisión determina el adaptador
del reprocesamiento. Las ejecuciones anteriores permanecen trazables.
