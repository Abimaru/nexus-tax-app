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
