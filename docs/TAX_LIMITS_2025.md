# Límites tributarios — AG 2025

Documento vivo. La tabla y la aritmética se derivan de
[`packages/aegis-rules/src/colombia/individual-income-tax/2025/tax-limits.ts`](../packages/aegis-rules/src/colombia/individual-income-tax/2025/tax-limits.ts).
El motor puro es agnóstico del formulario: cada regla apunta a la casilla del
F-210 que corresponde. La UI mostrará el resultado paso a paso cuando se
conecte al `builder` en fases posteriores.

## Fuente oficial

- **Estatuto Tributario, art. 336** — Renta líquida gravable de la cédula
  general. Id en el catálogo: `et-art-336`.
- **UVT AG 2025:** 49.799 pesos (Resolución DIAN 000193 de 2024).
  - 1.340 UVT = **66.730.660 pesos** para el año gravable 2025.

## Reglas modeladas

Todas usan el patrón `percentage_and_uvt_cap`:

```
casilla_objetivo = min(porcentaje × casilla_base, tope_UVT × UVT, componente_detectado)
```

El componente detectado (la suma de las rentas exentas y deducciones candidatas)
funciona como techo natural: nunca se puede "restar" más de lo que realmente
se solicitó como beneficio.

| Id                              | Cédula     | Base | Componente | % base | Tope UVT | Casilla objetivo |
| ------------------------------- | ---------- | ---- | ---------- | ------ | -------- | ---------------- |
| `et-336-employment-cedular-cap` | Trabajo    | 34   | 37 + 40    | 40 %   | 1.340    | 41               |
| `et-336-capital-cedular-cap`    | Capital    | 61   | 63 + 64    | 40 %   | 1.340    | 65               |
| `et-336-non-labor-cedular-cap`  | No laboral | 78   | 80 + 81    | 40 %   | 1.340    | 82               |

## Casos verificados manualmente

El test `tests/tax-limits.test.ts` ejerce cada candidato limitante.

| Escenario                      | Base (casilla 34) | Componente (37+40) | Resultado  | Limitante    |
| ------------------------------ | ----------------- | ------------------ | ---------- | ------------ |
| Porcentaje es el limitante     | 60.000.000        | 30.000.000         | 24.000.000 | `percentage` |
| Componente es el limitante     | 100.000.000       | 8.000.000          | 8.000.000  | `component`  |
| Tope 1.340 UVT es el limitante | 500.000.000       | 300.000.000        | 66.730.660 | `uvt_cap`    |
| Base cero                      | 0                 | 20.000.000         | 0          | `percentage` |
| Base negativa (satura a 0)     | −5.000.000        | 10.000.000         | 0          | `percentage` |

## Uso desde código

```ts
import { applyLimitRule, getLimitRule } from '@nexus-tax/aegis-rules';

const rule = getLimitRule('et-336-employment-cedular-cap');
const result = applyLimitRule(rule, { 34: 60_000_000, 37: 20_000_000, 40: 10_000_000 });
// {
//   ruleId: 'et-336-employment-cedular-cap',
//   baseBoxNumber: 34,
//   targetBoxNumber: 41,
//   baseValueCop: 60_000_000,
//   componentValueCop: 30_000_000,
//   percentageCandidateCop: 24_000_000,
//   uvtCapValueCop: 66_730_660,
//   appliedValueCop: 24_000_000,
//   bindingCandidate: 'percentage',
//   formula: 'min(40% × casilla 34, 1340 UVT, casilla 37 + casilla 40)',
//   legalSourceIds: ['et-art-336'],
// }
```

## Reglas para actualizar

1. El porcentaje (40 %) y el tope (1.340 UVT) se toman literalmente del art.
   336 ET. Cualquier ajuste normativo debe reflejarse aquí y en la fuente
   oficial correspondiente, actualizando `verifiedAt` y publicando el ejemplo.
2. Al conectar la regla al `builder` del Formulario 210 (fase futura), las
   casillas 41, 65 y 82 pasan de `not_implemented` a `verified` en la matriz
   de validación normativa. Ese cambio de estado debe ir acompañado de un
   ejemplo determinista en la matriz.
3. Los valores negativos de la base o del componente se saturan a 0. Este
   comportamiento está cubierto por el test `tax-limits.test.ts`.
