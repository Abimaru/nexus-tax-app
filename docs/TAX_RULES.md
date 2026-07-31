# Reglas tributarias locales

Las reglas de NexusTax son locales, explicables y versionadas. Se separan en dos
capas:

- `packages/exogenous-parser`: clasificacion y matriz preliminar, version de
  clasificacion `2.0.0` y analisis `2.0.0`.
- `packages/aegis-rules`: criterios oficiales anuales de obligacion y
  calendario. Ver [AEGIS_RULES.md](./AEGIS_RULES.md).

La facturacion neta electronica se usa como indicador de compras/soporte del
tope. Su base susceptible es una posible deduccion y subconjunto del total; el
uno por ciento mostrado es orientativo y no confirma procedencia ni limites
legales definitivos.

Las cuentas por pagar, deudas y saldos de tarjeta son pasivos aun si la magnitud
es positiva. Cuentas por cobrar, saldos bancarios e inversiones al cierre son
activos. CDT/inversion efectuada y consignaciones son movimientos. Promedios
laborales de seis meses son referencias informativas.
