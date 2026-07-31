# Visión de producto — NexusTax

## Qué es

NexusTax es una **estación personal y local** de análisis tributario para
Colombia. Asiste a un analista humano a lo largo del ciclo de preparación de la
declaración de renta: organizar expedientes, leer información tributaria,
conciliar fuentes, detectar inconsistencias y —en fases posteriores— proponer
valores para el Formulario 210.

## Qué NO es (todavía)

- No es una plataforma pública ni multiusuario.
- No presenta declaraciones ante la DIAN.
- No calcula impuestos ni afirma obligaciones legales.
- No usa IA ni backend en el Sprint 1.

## Principios

1. **Privacidad primero.** El procesamiento ocurre en el dispositivo del
   usuario. Nada se sube a un servidor.
2. **Ejecución local.** Sin llamadas de red para procesar documentos.
3. **Trazabilidad.** Cada dato normalizado conserva su origen (hoja + fila).
4. **Evidencia.** Cada hallazgo muestra hoja, fila, columna y valor original.
5. **Claridad.** UX premium, legible y accionable.
6. **Revisión humana.** El sistema sugiere; la persona decide.
7. **Arquitectura extensible.** Adaptadores y reglas configurables, listos para
   evolucionar hacia el **Aegis Engine**.

## Usuario objetivo

Una persona (analista o contribuyente informado) que quiere entender y conciliar
su información exógena antes de declarar, con control total sobre sus datos.

## Resultado del Sprint 1

Una primera versión ejecutable que permite crear un expediente, cargar un Excel
de exógena, inspeccionar sus hojas, normalizar registros, ver resumen y
gráficas, revisar hallazgos, obtener un checklist preliminar, guardar localmente
y exportar a JSON.

## Norte a mediano plazo — Aegis Engine

Un motor de reglas y conciliación **configurable y auditable**: cruza exógena
con certificados, propone valores para el Formulario 210 y explica cada
sugerencia con su evidencia y nivel de confianza, siempre bajo revisión humana.
