# Validación funcional del Sprint 2

Guia reproducible con datos exclusivamente sinteticos. No uses archivos ni
identificaciones tributarias reales.

## Precondiciones

- Node.js 20.11 o superior y pnpm 9.
- Dependencias instaladas con `pnpm install`.
- Chromium de Playwright disponible (`pnpm exec playwright install chromium`).
- Navegador con IndexedDB habilitado.
- Generar la muestra con `node samples/generate-sample.mjs`.

## Validacion automatizada

```powershell
pnpm typecheck
pnpm test
pnpm lint
pnpm build
pnpm --filter @nexus-tax/web test:e2e
pnpm check:encoding
```

`pnpm check:encoding` recorre el repositorio (excluyendo `node_modules` y los
directorios de build) buscando mojibake: una vocal acentuada o eñe cuyos bytes
UTF-8 quedaron reinterpretados como dos caracteres Latin-1/Windows-1252
distintos, o el carácter de reemplazo Unicode por bytes inválidos. Falla con
código distinto de cero si
encuentra alguna coincidencia fuera de una fixture explícita de codificación
(ruta bajo `fixtures/encoding` o archivo con la marca `nexustax:allow-mojibake`
en sus primeras líneas). No requiere red ni dependencias nuevas
(`scripts/check-encoding.mjs`, Node puro).

El E2E crea un expediente en Fuente, procesa una exogena sintetica, comprueba el grupo
laboral y su persistencia, resuelve un hallazgo, registra un soporte local,
crea un hecho manual, vuelve a cargar el expediente y recorre las seis etapas.
Un segundo escenario verifica el stepper sin desbordamiento horizontal en cinco
anchos de pantalla.

### Resultado observado de referencia (2026-08-01)

| Paso                    | Resultado observado                | Estado |
| ----------------------- | ---------------------------------- | ------ |
| Typecheck               | 6 proyectos verificados            | OK     |
| Unitarias e integración | 133/133 pruebas                    | OK     |
| Lint                    | 0 errores y 0 advertencias         | OK     |
| Build                   | Next.js compiló y generó 5 páginas | OK     |
| Playwright              | 2/2 escenarios en Chromium         | OK     |

### Resultado observado de cierre Sprint 2.2 (2026-08-02)

| Paso                    | Resultado observado                              | Estado |
| ----------------------- | ------------------------------------------------ | ------ |
| Codificación            | 252 archivos, una fixture excluida, sin mojibake | OK     |
| Typecheck               | 7 de 8 proyectos del workspace                   | OK     |
| Unitarias e integración | 227/227 pruebas                                  | OK     |
| Lint                    | 0 errores y 0 advertencias                       | OK     |
| Build                   | 7 rutas; modelo OCR fijado y SHA-256 correcto    | OK     |
| Playwright              | 4/4 escenarios, OCR real, temas y responsive     | OK     |

## Matriz de validacion manual

Usa `pnpm dev` y registra el resultado observado sin reemplazar el esperado.

| Caso                | Pasos                                                              | Resultado esperado                                                | Resultado observado | Estado    | Evidencia opcional   |
| ------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------- | ------------------- | --------- | -------------------- |
| Expediente          | Crear uno, recargar y volver a abrirlo                             | Alias, año y estado persisten                                     | Por registrar       | Pendiente | Captura local        |
| Navegacion guiada   | Recorrer las seis etapas y recargar en una vista contextual        | Restaura la ultima ruta valida y explica cualquier bloqueo        | Por registrar       | Pendiente | URL y captura        |
| Modo manual         | Crear expediente sin Excel y confirmar el modo manual              | Habilita Documentos y Hechos, no matriz ni declaracion derivada   | Por registrar       | Pendiente | Captura local        |
| Fuente              | Procesar, revisar SHA-256 e intentar reemplazar y eliminar         | Ambas acciones explican invalidaciones y piden confirmacion       | Por registrar       | Pendiente | Vista Fuente         |
| Responsive          | Revisar 1440, 1280, 1024, 768 y 390 px                             | No existe scroll horizontal; controles siguen accesibles          | Por registrar       | Pendiente | Capturas             |
| Etiquetas humanas   | Recorrer hechos, documentos, matriz, hallazgos y conciliaciones    | No aparecen enums internos ni inglés técnico                      | Por registrar       | Pendiente | Capturas             |
| Fuente provisional  | Aceptar un valor exógeno con motivo y recargar                     | Estado, motivo, evidencia e historial persisten                   | Por registrar       | Pendiente | Manifiesto 2.0.3     |
| Soporte no emitido  | Registrar gestión, canal y resultado en un requisito               | No se marca No aplica; deja de ser pendiente ordinario            | Por registrar       | Pendiente | Vista Requisitos     |
| Premio propio       | Reconocer el premio sintético sin certificado                      | Candidato provisional; no calcula impuesto                        | Por registrar       | Pendiente | Hallazgos y matriz   |
| Premio de tercero   | Indicar cobro para tercero con alias y explicación                 | No se excluye; queda pendiente de revisión                        | Por registrar       | Pendiente | Hallazgo             |
| Documento posterior | Conciliar valor igual y luego uno diferente                        | Respalda o contradice; conserva historial y no duplica            | Por registrar       | Pendiente | Manifiesto           |
| Dropzone            | Probar clic, teclado, arrastre, formato inválido y quitar          | Mismo patrón y mensajes humanos en todas las cargas               | Por registrar       | Pendiente | Capturas             |
| Exogena y matriz    | Cargar la muestra, confirmar secciones y procesar                  | Registros, topes, entidades y matriz son coherentes               | Por registrar       | Pendiente | Manifiesto           |
| Grupo laboral       | Abrir Requisitos con una entidad laboral                           | Una instancia detectada, sin tarjeta 220 duplicada                | Por registrar       | Pendiente | Captura local        |
| Varios empleadores  | Agregar segunda instancia y recargar                               | Solo las instancias creadas persisten; maximo tres                | Por registrar       | Pendiente | Captura local        |
| Carga documental    | Registrar un PDF sintetico como metadatos                          | El documento aparece sin conservar bytes                          | Por registrar       | Pendiente | Vista Documentos     |
| Binario opcional    | Registrar otro PDF con `store_locally`, descargarlo y quitar bytes | Descarga local disponible; luego quedan solo metadatos            | Por registrar       | Pendiente | Uso local mostrado   |
| Eliminacion         | Marcar un documento obsoleto o eliminar su binario                 | No se pierden relaciones ni metadatos necesarios                  | Por registrar       | Pendiente | Vista Documentos     |
| Multiproposito      | Asociar un certificado a dos requisitos                            | Existe un documento y dos coberturas                              | Por registrar       | Pendiente | Vista Requisitos     |
| Cobertura parcial   | Marcar una relacion como parcial                                   | El requisito y el progreso reflejan parcial                       | Por registrar       | Pendiente | Panel general        |
| Formulario 220      | Asociar un 220 a un empleador                                      | Solo esa instancia queda cubierta                                 | Por registrar       | Pendiente | Grupo laboral        |
| Consolidado laboral | Intentar usarlo como 220 y confirmar la advertencia                | No cubre sin decision expresa del analista                        | Por registrar       | Pendiente | Advertencia visible  |
| Duplicado SHA-256   | Registrar dos archivos con bytes iguales                           | El segundo se rechaza con mensaje accionable                      | Por registrar       | Pendiente | Mensaje de error     |
| Versiones           | Reemplazar un documento                                            | La anterior queda reemplazada y la nueva aumenta version          | Por registrar       | Pendiente | Biblioteca           |
| Hecho manual        | Crear y editar un hecho                                            | Metodo manual, autoria e historial persisten                      | Por registrar       | Pendiente | Vista Hechos         |
| Conciliacion        | Elegir una sugerencia y confirmar                                  | Diferencia calculada; conciliado exige confirmacion humana        | Por registrar       | Pendiente | Vista Conciliaciones |
| Exportacion         | Exportar el manifiesto                                             | Esquema 2.2.0, métricas OCR y `includesBinaryData: false`         | Por registrar       | Pendiente | JSON local           |
| Seguridad           | Buscar claves `password`, bytes o llamadas de red en el manifiesto | No hay contraseñas ni binarios exportados ni procesamiento remoto | Por registrar       | Pendiente | Revision JSON        |
| Borrado integral    | Eliminar el expediente                                             | Se eliminan sus tablas y binarios locales                         | Por registrar       | Pendiente | IndexedDB vacio      |
| Selectores por tema | Abrir los cinco filtros de cobertura en oscuro y claro             | Opciones con fondo y texto legibles según el tema                 | E2E automatizado    | OK        | document-lab.spec.ts |
| OCR por página      | Ejecutar OCR y abrir la tarea derivada                             | Destino conserva documento y página; no ejecuta automático        | E2E + unitarias     | OK        | tareas 2.2           |
| Recuperación OCR    | Simular fallo y elegir reintento ligero o texto nativo             | Acciones visibles; no se pierde evidencia                         | Unitarias/UI        | OK        | laboratorio          |
| Zona de perfil      | Marcar página completa o arrastrar un rectángulo                   | Coordenadas 0-1; alternativa operable por teclado                 | E2E + unitarias     | OK        | overlay              |
| Privacidad 2.2      | Revisar el manifiesto y buscar texto OCR, tokens e imágenes        | Solo métricas; las tres banderas de exclusión son `false`         | Unitarias           | OK        | manifiesto 2.2.0     |

## Cierre automatizado Sprint 2.3 (2026-08-02)

| Caso                     | Resultado esperado                                                 | Evidencia          | Estado |
| ------------------------ | ------------------------------------------------------------------ | ------------------ | ------ |
| Prioridad bloqueante     | Una tarea media bloqueante precede una alta no bloqueante          | Vitest web         | OK     |
| Redondeo $1/$5           | La política central distingue exacta, redondeo y relevante         | Vitest parser      | OK     |
| Ganancia ocasional       | No entra al ingreso ordinario y llega a casilla 112                | Vitest form-210    | OK     |
| Aportes laborales        | Salud/pensión con contexto laboral llegan a casilla 33             | Vitest form-210    | OK     |
| Ajuste y reversión       | El valor confirmado se restaura sin borrar historial               | Vitest repositorio | OK     |
| Navegación centro        | Centro de resolución visible y evidencia navegable                 | Playwright         | OK     |
| Borrador 210 persistente | Ajuste sobrevive recarga y exporta esquema de hoja de trabajo      | Playwright         | OK     |
| Responsive               | Sin desbordamiento horizontal entre 390 y 1440 px                  | Playwright         | OK     |
| Privacidad 2.3           | Decisiones/borrador sin binarios; OCR y contraseñas no se exportan | Unitarias/build    | OK     |

Gates: typecheck, lint, 239 pruebas unitarias, build y 4 pruebas E2E en verde.

## Cierre

Una validacion manual se marca `OK` solo después de ejecutar los pasos. Si falla,
registra `Falla`, evidencia sintetica, navegador y pasos exactos de reproduccion.
