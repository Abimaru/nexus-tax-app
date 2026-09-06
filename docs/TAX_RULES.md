# Reglas tributarias locales

> Una fuente monetaria heredada, ambigua o de baja confianza deja la casilla y
> sus fórmulas en revisión. El redondeo técnico queda separado del fundamento
> jurídico pendiente de verificación.

Las reglas de NexusTax son locales, explicables y versionadas. Se separan en dos
capas:

- `packages/exogenous-parser`: clasificacion y matriz preliminar, version de
  clasificacion `2.0.0` y analisis `2.0.0`.
- `packages/aegis-rules`: criterios oficiales anuales de obligacion y
  calendario. Ver [AEGIS_RULES.md](./AEGIS_RULES.md).
- `packages/form-210`: catálogo, fórmulas seguras y validación del borrador AG 2025.
  Ver [FORM_210_RULESET_2025.md](./FORM_210_RULESET_2025.md).

La facturacion neta electronica se usa como indicador de compras/soporte del
tope. Su base susceptible es una posible deduccion y subconjunto del total; el
uno por ciento mostrado es orientativo y no confirma procedencia ni limites
legales definitivos.

Desde el Sprint 2.4 (Fase D), el reporte DIAN detallado de facturación
electrónica (CUFE, notas crédito/débito, conciliación contra el Tope 5,
decisiones por factura) alimenta el motor real del 1 % (art. 336-1 ET). Este
motor es **independiente del límite conjunto del 40 %/1.340 UVT** (art. 336 ET
numeral 3): la deducción se cablea como componente de la casilla 92, nunca de
la casilla 39. Ver
[`ELECTRONIC_INVOICE_REPORT_2025.md`](./ELECTRONIC_INVOICE_REPORT_2025.md) y
[`ELECTRONIC_INVOICING_2025.md`](./ELECTRONIC_INVOICING_2025.md).

Las cuentas por pagar, deudas y saldos de tarjeta son pasivos aun si la magnitud
es positiva. Cuentas por cobrar, saldos bancarios e inversiones al cierre son
activos. CDT/inversion efectuada y consignaciones son movimientos. Promedios
laborales de seis meses son referencias informativas.

Las ganancias ocasionales no participan en el agregado de ingresos ordinarios. Los aportes
obligatorios de salud y pensión solo se clasifican como ingreso laboral no constitutivo cuando el
contexto identifica inequívocamente el aporte; de lo contrario permanecen pendientes. Ninguna
regla parcial del Formulario 210 se calcula por aproximación.
