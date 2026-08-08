# Simulación controlada (Fase R)

_Última actualización: 2026-08-08 — Fase R del Sprint 2.3.1._

## 1. Alcance

Cablea el motor `computeResolutionImpact` (Fase Q) al flujo de ajuste
manual del `Form210DraftPanel` para que el analista **previsualice el
impacto** de una decisión antes de persistirla en IndexedDB. Solo si
confirma explícitamente, la decisión se guarda con
`saveTaxResolutionDecision`.

Esta simulación no cambia lo que ya persiste: es un cálculo derivado
que se descarta al cerrar el editor.

## 2. Contrato

Nueva función en `apps/web/src/lib/repository.ts`:

```ts
export async function previewForm210Adjustment(
  caseId: string,
  tentativeDecision: TaxResolutionDecision,
): Promise<Form210Draft | undefined>;
```

Lee los mismos insumos que `rebuildForm210Draft` (records, facts,
resoluciones, states, provisionales), **anexa** `tentativeDecision` a
la lista de resoluciones y construye el `Form210Draft` con
`buildForm210Draft`. No escribe nada en IndexedDB.

En el panel, `computeResolutionImpact(currentDraft, tentativeDraft)`
produce el `ResolutionImpact` que se muestra al analista.

## 3. Flujo en la UI

En cada casilla del `Form210DraftPanel`:

1. **Crear ajuste trazable** abre el editor con valor y motivo.
2. **Previsualizar impacto** valida los campos, arma una
   `TaxResolutionDecision` tentativa (con `id: 'preview-<n>'`,
   `localAuthor: 'Analista local (preview)'`) y llama la preview + el
   cómputo de impacto.
3. Si hay impacto, se muestra en un bloque expandible:
   - `summary` en español ("el saldo neto aumenta en …").
   - Saldo neto antes vs. después.
   - Detalle de casillas afectadas con `before → after (±delta)`.
   - Warnings nuevos y resueltos.
4. Aparecen dos botones nuevos:
   - **Confirmar ajuste** persiste con `saveTaxResolutionDecision`.
   - **Revisar de nuevo** limpia el impacto para volver a editar.
5. Cualquier edición del valor o del motivo invalida el impacto
   previamente calculado (evita mostrar un delta desalineado con lo
   que el analista está viendo).

## 4. Verificación

Real en dev server con el expediente sintético del usuario:

- **Casilla 29 (patrimonio bruto)** → cambio a $999.999.999:
  "el saldo neto no cambia; 2 casilla(s) afectada(s)" — porque
  patrimonio no toca la cédula general (afecta 29 y 31 pero no altera
  el impuesto).
- **Casilla 42 (renta líquida de trabajo)** → ajuste a 3.000 UVT
  ($149.397.000): "el saldo neto aumenta en $9.139.054 pesos; 1
  casilla(s) afectada(s)". Antes $11.499.393, después $20.638.447.

Sweep local: `pnpm -r typecheck` verde; `pnpm --filter @nexus-tax/web
lint` sin errores; consola del navegador sin errores.

## 5. Fuera de alcance

- **Simulación por lotes** (varias decisiones tentativas a la vez).
  Hoy se previsualiza una decisión a la vez.
- **Simulaciones no basadas en `adjust_form_box`** (por ejemplo,
  simular excluir un registro). El mismo motor sirve; solo hay que
  cablearlo desde otros puntos de la UI.
- **Persistencia del impacto** como parte del historial. Es un cálculo
  volátil; solo la decisión final se guarda.
- **Impacto por lote de decisiones sobre la conciliación / matriz**
  fuera del F-210.
