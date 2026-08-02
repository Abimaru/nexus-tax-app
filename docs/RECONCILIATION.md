# Conciliacion preliminar

La matriz compara agregados homogéneos con los cinco topes extraídos del mismo
reporte. Es una ayuda de revisión local y una fuente del borrador 210; no confirma
la procedencia fiscal ni liquida el impuesto.

## Correspondencias

| Grupo                                 | Tope                    |
| ------------------------------------- | ----------------------- |
| Ingresos consolidados                 | 1 - ingresos            |
| Activos                               | 2 - patrimonio          |
| Consumos con tarjeta                  | 3 - consumo con tarjeta |
| Movimientos financieros e inversiones | 4 - movimientos         |
| Compras facturadas                    | 5 - compras             |

El numero se infiere primero por la semantica de la etiqueta y solo despues por
el numero extraido. Los subgrupos de ingresos son desglose y no se concilian por
separado contra el agregado.

## Estados

- `reconciled`: diferencia exacta cero.
- `rounding_difference`: diferencia absoluta dentro de la unidad de redondeo aplicable ($1 o $5).
- `minor_difference`: diferencia no material (hasta $100 y 0,01 %), siempre con confirmación humana.
- `relevant_difference`: diferencia mayor que requiere explicacion.
- `incomplete`: falta el tope o existen registros pendientes.
- `not_comparable`: las magnitudes representan agregados distintos.
- `pending_documents`: un saldo requiere certificado para confirmarse.

Cada grupo conserva valor, tope, diferencias absoluta y porcentual, confianza,
advertencias, accion recomendada, filas fuente y disposicion de cada registro.

## No doble conteo

La base susceptible de factura electronica solo entra en el calculo orientativo
del beneficio y no se suma a compras. Un promedio laboral es informativo; una
inversion efectuada es movimiento, no saldo final. Cuando un resumen coincide
con la suma de componentes se incluye el resumen y se excluyen los componentes.
Los posibles duplicados quedan pendientes hasta revision.

La política central `co.form210.reconciliation.2025.v1` conserva valores, diferencia y regla
aplicada. Una diferencia relevante nunca ofrece “confirmar” como acción principal: exige explicar,
declarar no comparable, corregir fuente o dejar pendiente. Ganancias ocasionales se excluyen del
grupo ordinario y se trasladan a su sección propia del borrador.
