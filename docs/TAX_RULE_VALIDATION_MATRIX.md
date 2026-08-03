# Matriz de validación normativa — Formulario 210 AG 2025

Documento vivo, generado a partir de
[`packages/form-210/src/validation-matrix-2025.ts`](../packages/form-210/src/validation-matrix-2025.ts).
Cada casilla del ruleset debe tener una fila; el tipo `Form210RuleValidation`
define la forma. El módulo lanza un error al cargar si el ruleset y la matriz
dejan de coincidir.

## Estados

- **`verified`** — la fórmula es aritmética directa del instructivo oficial DIAN
  (suma o resta entre casillas explícitas) y hay un ejemplo determinista.
- **`implemented_unverified`** — la casilla se calcula por agrupación heurística
  (`TaxCategory → box` en el builder) sin una regla legal explícita que respalde
  qué categoría alimenta qué casilla. El valor es **orientativo** y no debe
  presentarse como definitivo.
- **`requires_review`** — hay implementación pero depende de una interpretación
  no confirmada; la UI debe crear una tarea y mantener la casilla abierta.
- **`not_implemented`** — la casilla existe en el modelo pero aún no se calcula.

## Fuentes oficiales

Referenciadas por `sourceId` (ver
[`packages/aegis-rules/.../official-sources.ts`](../packages/aegis-rules/src/colombia/individual-income-tax/2025/official-sources.ts)):

- `dian-formulario-210-2025` — Formulario 210 e instructivo oficial.
- `dian-resolucion-000044-2024` — Prescripción de formularios.
- `dian-resolucion-000227-2025` — Compilación de formularios y procedimientos.
- `dian-resolucion-000193-2024` — UVT aplicable en 2025.
- `dian-renta-personas-naturales-ag-2025` — Guía general y criterios de
  obligación.
- `dian-calendario-tributario-2026` — Vencimientos de presentación.

Cualquier fuente adicional debe añadirse a `OFFICIAL_SOURCES_2025` antes de
referenciarse por id.

## Cobertura del ruleset (línea base 2026-08-02)

| Estado                       | Casillas                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| `verified` (10)              | 31, 34, 37, 40, 42, 61, 78, 101, 103, 115                                          |
| `implemented_unverified` (9) | 29, 30, 32, 33, 58, 74, 99, 112, 132                                               |
| `not_implemented` (24)       | 35, 36, 38, 39, 41, 59, 60, 62-67, 75-77, 79-84, 100, 102, 104, 113, 114, 130, 131 |
| `requires_review` (0)        | —                                                                                  |

## Uso desde código

```ts
import {
  FORM_210_VALIDATION_MATRIX_2025,
  getBoxValidation,
  summarizeValidationStatus,
} from '@nexus-tax/form-210';

const box42 = getBoxValidation(42); // renta líquida ordinaria de rentas de trabajo
const counts = summarizeValidationStatus();
```

## Reglas para actualizar

1. Cualquier casilla nueva en `FORM_210_BOXES_2025` **debe** añadirse a la
   matriz en el mismo commit; el módulo lanza al cargar si falta.
2. Cambiar el estado a `verified` exige:
   - Al menos un ejemplo determinista.
   - `legalBasisSourceIds` con al menos una fuente del catálogo oficial.
   - Fecha de verificación (`verifiedAt`) actualizada.
3. Cambiar el `formulaDescription` implica revisar todos los ejemplos que la
   ejercen. El test `validation-matrix.test.ts` valida las fórmulas aritméticas.
