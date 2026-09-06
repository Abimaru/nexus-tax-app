# Ruleset Formulario 210 — año gravable 2025

Versión: `co.dian.form210.2025.v1`. Verificación: 2026-08-02. Presentación: 2026.

El catálogo versiona las secciones de datos informativos previos a patrimonio (28), patrimonio
(29–31), rentas de trabajo (32–42), capital (58–67), no laborales (74–84), pensiones (99–103),
dividendos (104), consolidación de la cédula general (89, 91–93), ganancias ocasionales
(112–115), base conjunta del art. 241 ET (111), liquidación del impuesto (126, 127, 129), datos
preliminares de liquidación privada (130–133, 137) e información complementaria (138–141).

Solo se ejecutan fórmulas marcadas como completas: 31 = 29 − 30; 34 = 32 − 33; 37 = 35 + 36;
40 = 38 + 39; 42 = 34 − 41; 61 = 58 − 59 − 60; 78 = 74 − 75 − 76 − 77; 101 = 99 − 100;
103 = 101 − 102; 115 = 112 − 113 − 114. Las reglas parciales se muestran como incompletas y no
se inventan límites, rentas exentas, deducciones ni impuesto.

## Casillas agregadas en Sprint 2.4 (Fase B0 + Fase C + Fase D + revisión normativa puntual)

Marcadas `implementedUnverified` (no `verified`): la numeración se deriva algebraicamente de una
fuente secundaria (Gerencie, guía de renta), no de una cita literal del instructivo DIAN.

| Casilla | Fórmula                              | Fuente                          |
| ------- | ------------------------------------- | -------------------------------- |
| 28      | min(1 % × compras con FE, 240 UVT) — casilla propia, **nunca componente de R39/R92** | `et-art-336-num-5` |
| 89      | Sin calcular (`requires_review`)      | `et-art-336` — hallazgo abierto: posible subcédula de honorarios no modelada |
| 91      | 34 + 61 + 78                          | `et-art-336`                     |
| 92      | 41 + 65 + 82 + **139**                | `et-art-336`, `et-art-336-num-3` |
| 93      | 91 − 92                               | `et-art-336`                     |
| 126     | Cableada desde `incomeTax` (art. 241) | `et-art-241`                     |
| 127     | Cableada desde `occasionalGainsTax`   | `et-art-314`, `et-art-317`       |
| 129     | 126 + 127                              | `et-art-241`, `et-art-314`       |
| 133     | Cableada desde `nextYearAdvance`      | `et-art-807`                     |
| 137     | Cableada desde `netBalanceCop` (cuando es negativo) | —                  |
| 138     | Dependientes confirmados para la adición de 72 UVT (art. 336 num. 3 ET) | `et-art-336-num-3` |
| 139     | 138 × 72 UVT — **componente de R92**, nunca de R39/R41 | `et-art-336-num-3` |
| 140     | Indicador (checkbox) de exceso del tope de costos y gastos estimados — **NO monetario**, `not_implemented` | `et-art-336-1` |
| 141     | Impuesto voluntario — sin relación con dependientes ni facturación electrónica, `not_implemented` | `et-art-244-1` |

**Importante (Fase C):** R139 (72 UVT por dependiente) se modela explícitamente como componente de
R92. Nunca se suma a R39 (deducciones imputables de trabajo) ni se resta directamente de la renta
líquida gravable: eso mezclaría el beneficio del art. 336 num. 3 con el límite conjunto de 40 %/
1.340 UVT del que está expresamente excluido.

**Corrección normativa (revisión puntual posterior a Fase D):** el beneficio del 1 % de compras con
factura electrónica pasó por dos correcciones sucesivas. Primero (Fase D) se movió de la casilla 39
a ser "componente de R92" vía casillas 140/141, asumiendo el fundamento legal "artículo 336-1 ET".
Una segunda revisión, verificada con múltiples fuentes independientes, encontró que **ambos**
supuestos eran incorrectos: el fundamento real es el **numeral 5 del art. 336 ET** (no el "artículo
336-1 ET", que es una norma distinta sobre estimación de costos y gastos deducibles, ligada al
indicador de la casilla 140) y la casilla oficial es la **28** (dato informativo previo a
patrimonio), no 140/141. La casilla 141 corresponde al impuesto voluntario del art. 244-1 ET, sin
relación alguna con este beneficio. R28 nunca participa de las fórmulas de R39, R92 ni de ninguna
consolidación cedular: el numeral 5 exime expresamente esta deducción del límite del 40 %/1.340 UVT.
Ver `docs/ELECTRONIC_INVOICE_REPORT_2025.md` y `docs/ELECTRONIC_INVOICING_2025.md`.

Fuentes oficiales versionadas:

- Formulario 210 e instructivo, año gravable 2023 y siguientes:
  https://www.dian.gov.co/atencionciudadano/formulariosinstructivos/Formularios/2025/Formulario_210_2025.pdf
- Resolución DIAN 000044 de 2024:
  https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0044_2024.htm
- Resolución Única DIAN 000227 de 2025:
  https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0227_2025.htm

Actualizar el ruleset exige una nueva versión, fecha de verificación, pruebas de dependencias y
revisión humana de la fuente oficial. No se consulta la web durante el uso normal.
