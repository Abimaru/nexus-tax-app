# Ruleset Formulario 210 — año gravable 2025

Versión: `co.dian.form210.2025.v1`. Verificación: 2026-08-02. Presentación: 2026.

El catálogo versiona las secciones de patrimonio (29–31), rentas de trabajo (32–42), capital
(58–67), no laborales (74–84), pensiones (99–103), dividendos (104), consolidación de la cédula
general (89, 91–93), ganancias ocasionales (112–115), base conjunta del art. 241 ET (111),
liquidación del impuesto (126, 127, 129), datos preliminares de liquidación privada (130–133, 137)
e información complementaria (138–141).

Solo se ejecutan fórmulas marcadas como completas: 31 = 29 − 30; 34 = 32 − 33; 37 = 35 + 36;
40 = 38 + 39; 42 = 34 − 41; 61 = 58 − 59 − 60; 78 = 74 − 75 − 76 − 77; 101 = 99 − 100;
103 = 101 − 102; 115 = 112 − 113 − 114. Las reglas parciales se muestran como incompletas y no
se inventan límites, rentas exentas, deducciones ni impuesto.

## Casillas agregadas en Sprint 2.4 (Fase B0 + Fase C + Fase D)

Marcadas `implementedUnverified` (no `verified`): la numeración se deriva algebraicamente de una
fuente secundaria (Gerencie, guía de renta), no de una cita literal del instructivo DIAN.

| Casilla | Fórmula                              | Fuente                          |
| ------- | ------------------------------------- | -------------------------------- |
| 89      | Sin calcular (`requires_review`)      | `et-art-336` — hallazgo abierto: posible subcédula de honorarios no modelada |
| 91      | 34 + 61 + 78                          | `et-art-336`                     |
| 92      | 41 + 65 + 82 + **139** + **141**      | `et-art-336`, `et-art-336-num-3`, `et-art-336-1` |
| 93      | 91 − 92                               | `et-art-336`                     |
| 126     | Cableada desde `incomeTax` (art. 241) | `et-art-241`                     |
| 127     | Cableada desde `occasionalGainsTax`   | `et-art-314`, `et-art-317`       |
| 129     | 126 + 127                              | `et-art-241`, `et-art-314`       |
| 133     | Cableada desde `nextYearAdvance`      | `et-art-807`                     |
| 137     | Cableada desde `netBalanceCop` (cuando es negativo) | —                  |
| 138     | Dependientes confirmados para la adición de 72 UVT (art. 336 num. 3 ET) | `et-art-336-num-3` |
| 139     | 138 × 72 UVT — **componente de R92**, nunca de R39/R41 | `et-art-336-num-3` |
| 140     | Base de compras con derecho a la deducción de facturación electrónica (informativa) | `et-art-336-1` |
| 141     | min(1 % × 140, 240 UVT) — **componente de R92**, nunca de R39 | `et-art-336-1` |

**Importante (Fase C):** R139 (72 UVT por dependiente) se modela explícitamente como componente de
R92. Nunca se suma a R39 (deducciones imputables de trabajo) ni se resta directamente de la renta
líquida gravable: eso mezclaría el beneficio del art. 336 num. 3 con el límite conjunto de 40 %/
1.340 UVT del que está expresamente excluido.

**Corrección normativa (Fase D):** R141 (1 % de facturación electrónica, art. 336-1 ET) estaba
cableada a la casilla 39 desde la Fase B0. El Decreto 2231 de 2023 (numeral 5 del art. 336 ET)
exime expresamente esta deducción del límite del 40 %/1.340 UVT que sí gobierna la casilla 39 (vía
R40→R41) — el mismo tipo de error ya corregido para R139. Se corrige moviéndola a ser componente de
R92, análogo a R139. Ver `docs/ELECTRONIC_INVOICE_REPORT_2025.md` y `docs/ELECTRONIC_INVOICING_2025.md`.

Fuentes oficiales versionadas:

- Formulario 210 e instructivo, año gravable 2023 y siguientes:
  https://www.dian.gov.co/atencionciudadano/formulariosinstructivos/Formularios/2025/Formulario_210_2025.pdf
- Resolución DIAN 000044 de 2024:
  https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0044_2024.htm
- Resolución Única DIAN 000227 de 2025:
  https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0227_2025.htm

Actualizar el ruleset exige una nueva versión, fecha de verificación, pruebas de dependencias y
revisión humana de la fuente oficial. No se consulta la web durante el uso normal.
