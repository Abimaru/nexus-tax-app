# Conciliacion preliminar

La matriz compara agregados homogeneos con los cinco topes extraidos del mismo
reporte. Es una ayuda de revision local: no calcula el Formulario 210 ni confirma
la procedencia fiscal de un valor.

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
- `rounding_difference`: diferencia absoluta de hasta un peso.
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
