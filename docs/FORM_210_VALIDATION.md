# Validación del borrador Formulario 210

El builder puro ejecuta validaciones antes de presentar o exportar el borrador:

- patrimonio líquido inconsistente con patrimonio bruto menos deudas;
- costos o deducciones superiores al ingreso de la sección;
- retenciones sin una fuente de soporte;
- ganancias ocasionales mezcladas con ingresos ordinarios;
- posible doble conteo entre fuente documental y exógena;
- fuente exógena provisional;
- año/período incompatible o fecha de corte incorrecta cuando la evidencia lo permite;
- casilla confirmada mientras conserva registros pendientes relacionados.

Cada hallazgo incluye severidad, casillas y fuentes. Un error cuenta como bloqueo; una advertencia
mantiene el borrador en preparación. `ready_for_review` nunca significa declaración lista para
presentar: solo que las reglas implementadas no detectan pendientes internos.

La validación automatizada cubre separación de ganancias ocasionales, fórmulas patrimoniales,
aportes laborales, ajuste/restauración, exportación sin binarios, persistencia Dexie y flujo E2E.
Todo fixture es sintético.
