# Seguridad de la extracción documental

## Datos que permanecen locales

El lector acepta bytes seleccionados por el usuario o recuperados de IndexedDB.
No acepta URL de documento y no usa `fetch`. PDF.js y su worker se sirven desde
el mismo origen local. No hay telemetría, backend ni integración con IA.

## Retención mínima

Se persisten sesión, clasificación, candidatos, decisiones, adaptador, versión,
hallazgos y evidencia breve. No se persisten contraseña, buffer, objeto PDF,
worker ni texto completo. El manifiesto declara explícitamente
`includesFullText: false` e `includesPasswords: false` y nunca incluye binarios.

La evidencia tiene límites de longitud y debe evitar contexto innecesario. No se
registran en consola texto, nombres, identificaciones, cuentas, valores o
contraseñas. Los fixtures del repositorio son completamente sintéticos.

## Ciclo de vida

- `metadata_only`: no permite reprocesar sin volver a seleccionar el archivo.
- `store_locally`: conserva el binario en IndexedDB por decisión explícita.
- `do_not_keep`: elimina bytes tras registrar la decisión aplicable.
- marcar un documento obsoleto elimina binario, sesiones y candidatos; conserva
  metadatos históricos y hechos ya confirmados según la política del expediente.
- las URLs `blob:` para abrir una página se revocan tras un periodo breve.

## Amenazas y controles

Los PDFs pueden ser corruptos, enormes, cifrados o diseñados para agotar memoria.
Se mitiga con límites de bytes/páginas/candidatos, timeout, cancelación,
`isEvalSupported: false`, destrucción de recursos y errores recuperables. La
aplicación no ejecuta adjuntos ni JavaScript embebido. OCR futuro requiere una
evaluación nueva de memoria, dependencias y superficie de ataque.

La auditoría E2E debe fallar si durante el procesamiento aparece una solicitud
que no sea del mismo origen de la aplicación.
