# apps/api — RESERVADO

> Estado: **reservado y documentado. Sin lógica backend en el Sprint 1.**

Este espacio queda deliberadamente vacío de implementación. NexusTax es, por
ahora, una estación **local** que ejecuta todo el procesamiento en el navegador
(ver `docs/SECURITY_PRIVACY.md`). No existe backend, autenticación ni
integración con la DIAN en esta fase.

## ¿Por qué existe esta carpeta?

Para marcar el límite de módulo y facilitar una evolución futura ordenada, sin
introducir dependencias ni superficie de ataque prematuras.

## Posibles usos futuros (NO implementar sin cerrar antes el alcance actual)

- Sincronización opcional y cifrada entre dispositivos del mismo usuario.
- Servicios del futuro **Aegis Engine** (reglas de conciliación tributaria).
- Exportaciones firmadas / trazabilidad avanzada.

Cualquier trabajo aquí debe respetar los principios de privacidad, ejecución
local por defecto, trazabilidad y revisión humana descritos en `docs/`.
