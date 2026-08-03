# Tarifa progresiva de renta — AG 2025

Documento vivo. La tabla, la aritmética y los ejemplos de este documento se
derivan de [`packages/aegis-rules/src/colombia/individual-income-tax/2025/progressive-tax.ts`](../packages/aegis-rules/src/colombia/individual-income-tax/2025/progressive-tax.ts).
Cualquier cambio en la tabla exige actualizar aquí y publicar el ejemplo
manual correspondiente.

## Fuente oficial

- **Estatuto Tributario, art. 241** (numeral 1) — tarifa para personas naturales
  residentes. Id en el catálogo: `et-art-241`.
- **UVT AG 2025:** 49.799 pesos (Resolución DIAN 000193 de 2024).

## Tabla de rangos (en UVT)

| Rango en UVT    | Tarifa marginal | Impuesto acumulado hasta el piso |
| --------------- | --------------- | -------------------------------- |
| 0 – 1.090       | 0 %             | 0 UVT                            |
| 1.090 – 1.700   | 19 %            | 0 UVT                            |
| 1.700 – 4.100   | 28 %            | 116 UVT                          |
| 4.100 – 8.670   | 33 %            | 788 UVT                          |
| 8.670 – 18.970  | 35 %            | 2.296 UVT                        |
| 18.970 – 31.000 | 37 %            | 5.901 UVT                        |
| Más de 31.000   | 39 %            | 10.352 UVT                       |

## Fórmula

```
impuesto_uvt = (base_gravable_uvt − fromUvt) × tarifa_marginal + baseTaxUvt
impuesto_cop = round(impuesto_uvt × UVT_2025)
```

El cálculo conserva el valor exacto en UVT (útil para trazabilidad) y solo
redondea al peso más cercano al pasar a moneda de curso.

## Casos verificados manualmente

Cada caso se puede reproducir a mano en menos de un minuto. El test
`tests/progressive-tax.test.ts` los ejerce.

| #   | Base gravable | Rango aplicado | Impuesto UVT | Impuesto en pesos       |
| --- | ------------- | -------------- | ------------ | ----------------------- |
| 1   | 0 UVT         | 0 – 1.090      | 0            | 0                       |
| 2   | 500 UVT       | 0 – 1.090      | 0            | 0                       |
| 3   | 1.500 UVT     | 1.090 – 1.700  | 77,9         | round(77,9 × 49.799)    |
| 4   | 2.000 UVT     | 1.700 – 4.100  | 200          | 200 × 49.799            |
| 5   | 10.000 UVT    | 8.670 – 18.970 | 2.761,5      | round(2.761,5 × 49.799) |
| 6   | 40.000 UVT    | >31.000        | 13.862       | 13.862 × 49.799         |

## Uso desde código

```ts
import { computeProgressiveIncomeTax, UVT_2025 } from '@nexus-tax/aegis-rules';

const result = computeProgressiveIncomeTax(150_000_000);
// {
//   taxYear: 2025,
//   taxableIncomeCop: 150_000_000,
//   taxableIncomeUvt: 3_012.11...,
//   bracket: { fromUvt: 1_700, toUvt: 4_100, marginalRate: 0.28, baseTaxUvt: 116 },
//   excessUvt: 1_312.11...,
//   marginalTaxUvt: 367.39...,
//   totalTaxUvt: 483.39...,
//   totalTaxCopRounded: 24_072_670,
//   ruleSourceId: 'et-art-241',
//   formula: '(base − 1700 UVT) × 28% + 116 UVT',
// }
```

## Reglas para actualizar

1. Los rangos, tarifas y `baseTaxUvt` se toman literalmente del art. 241 ET.
   No se modifican sin actualizar `verifiedAt` y sin registrar la fuente nueva
   en `OFFICIAL_SOURCES_2025`.
2. Cualquier año gravable adicional exige crear su propio módulo (p. ej.
   `2026/progressive-tax.ts`) y no reutilizar la tabla 2025.
3. Los ejemplos deben ser reproducibles a mano; el test `progressive-tax.test.ts`
   protege la aritmética contra ediciones accidentales.
