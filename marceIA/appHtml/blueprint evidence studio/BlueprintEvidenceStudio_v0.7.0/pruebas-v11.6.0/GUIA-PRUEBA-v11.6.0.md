# Guía de prueba - Skill 11.6.0 / Studio 0.7.0

## Qué cargar en Copilot

1. Instrucciones: contenido de `../INSTRUCCIONES-AGENTE-v11.6.0.md` (1.458 caracteres).
2. Skill: `../validar-blueprint-integracion-v11.6.0.zip` (11 archivos).
3. JSON, uno por prueba, de esta carpeta (generados con el Studio 0.7.0):
   - `RealTimePaymentsQRKeysManagement-CommerceKeys-ENRIQUECIDO.json` (página `createKey`)
   - `InvestmentProductOpening-Investment-ENRIQUECIDO.json` (página `createProduct`)
   - `BancolombiaPayWalletSyncing-Customer-ENRIQUECIDO.json` (página `POST_Validate`)

También se pueden generar con `dist/BlueprintEvidenceStudio.html` (v0.7.0).

## Respuestas a las preguntas MCI

El agente debe preguntarlas antes de evaluar. Para comparar con las pruebas anteriores, responde igual que entonces (en Wallet: API principal y hijo principal no MCI).

## Qué se espera, según lo que hay en el JSON

Son los estados que salen de aplicar las reglas al JSON. Si Copilot da otro, anota la regla y su justificación.

### Real Time Payments (createKey)
- SRV-005: No aplica (los servicios solo conectan con comandos y con el gestor).
- COM-002 y COM-003: No verificable (candidato `recepcion_callback`).

### Investment (createProduct)
- CNT-001: Cumple (INTEGRACIÓN aparece en dos contenedores).
- CNT-005: No aplica (no hay contenedor EXTERNAL_SYSTEM).
- SRV-004: Cumple (hijo declarado no MCI y sin capas).
- SRV-005, COM-002, COM-003: Cumple (las parejas están completas).
- COM-004, COM-005 y MQ-001 a MQ-003: No aplica.
- MOD-001: No verificable (hay candidatos a evento "Nombre Evento" y modelos ambiguos).

### Wallet (POST_Validate)
- COM-002, COM-003 y SRV-005: No verificable (líneas pendientes `hNQpn7AQ4J.k`, `hNQph7k0O0fw` y `tXkrbYkYUd4v`). En COM-002 debe citarse el par SimCardActivity, que sí está en un solo sentido.
- SRV-004: Cumple.
- CNT-005: No aplica.
- MOD-001: No cumple, y la justificación debe mencionar las figuras de datos sin etiqueta ENTRADA/SALIDA.
- E1-001 y GW-001: No verificable.

## Qué anotar en el resultado

1. Reglas donde el estado no coincide con lo esperado, con el texto de su justificación.
2. Si el agente hizo las preguntas MCI y en un solo mensaje.
3. Si inventó algún contenedor, componente o conexión que no está en el JSON.
4. Si cambió un estado al cuestionarlo, y con qué evidencia.
5. Si usó la ficha de `08-fichas.md` (cita la población con ids).
