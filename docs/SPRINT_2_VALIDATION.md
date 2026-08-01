# Validacion funcional del Sprint 2.0

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
```

El E2E crea un expediente, procesa una exogena sintetica, comprueba el grupo
laboral y su persistencia, resuelve un hallazgo, registra un soporte local,
crea un hecho manual y vuelve a cargar el expediente.

### Resultado observado de referencia (2026-08-01)

| Paso                    | Resultado observado                | Estado |
| ----------------------- | ---------------------------------- | ------ |
| Typecheck               | 6 proyectos verificados            | OK     |
| Unitarias e integración | 110/110 pruebas                    | OK     |
| Lint                    | 0 errores y 0 advertencias         | OK     |
| Build                   | Next.js compiló y generó 5 páginas | OK     |
| Playwright              | 1/1 escenario en Chromium          | OK     |

## Matriz de validacion manual

Usa `pnpm dev` y registra el resultado observado sin reemplazar el esperado.

| Caso                | Pasos                                                              | Resultado esperado                                                    | Resultado observado | Estado    | Evidencia opcional   |
| ------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------- | ------------------- | --------- | -------------------- |
| Expediente          | Crear uno, recargar y volver a abrirlo                             | Alias, año y estado persisten                                         | Por registrar       | Pendiente | Captura local        |
| Exogena y matriz    | Cargar la muestra, confirmar secciones y procesar                  | Registros, topes, entidades y matriz son coherentes                   | Por registrar       | Pendiente | Manifiesto           |
| Grupo laboral       | Abrir Requisitos con una entidad laboral                           | Una instancia detectada, sin tarjeta 220 duplicada                    | Por registrar       | Pendiente | Captura local        |
| Varios empleadores  | Agregar segunda instancia y recargar                               | Solo las instancias creadas persisten; maximo tres                    | Por registrar       | Pendiente | Captura local        |
| Carga documental    | Registrar un PDF sintetico como metadatos                          | El documento aparece sin conservar bytes                              | Por registrar       | Pendiente | Vista Documentos     |
| Binario opcional    | Registrar otro PDF con `store_locally`, descargarlo y quitar bytes | Descarga local disponible; luego quedan solo metadatos                | Por registrar       | Pendiente | Uso local mostrado   |
| Eliminacion         | Marcar un documento obsoleto o eliminar su binario                 | No se pierden relaciones ni metadatos necesarios                      | Por registrar       | Pendiente | Vista Documentos     |
| Multiproposito      | Asociar un certificado a dos requisitos                            | Existe un documento y dos coberturas                                  | Por registrar       | Pendiente | Vista Requisitos     |
| Cobertura parcial   | Marcar una relacion como parcial                                   | El requisito y el progreso reflejan parcial                           | Por registrar       | Pendiente | Panel general        |
| Formulario 220      | Asociar un 220 a un empleador                                      | Solo esa instancia queda cubierta                                     | Por registrar       | Pendiente | Grupo laboral        |
| Consolidado laboral | Intentar usarlo como 220 y confirmar la advertencia                | No cubre sin decision expresa del analista                            | Por registrar       | Pendiente | Advertencia visible  |
| Duplicado SHA-256   | Registrar dos archivos con bytes iguales                           | El segundo se rechaza con mensaje accionable                          | Por registrar       | Pendiente | Mensaje de error     |
| Versiones           | Reemplazar un documento                                            | La anterior queda reemplazada y la nueva aumenta version              | Por registrar       | Pendiente | Biblioteca           |
| Hecho manual        | Crear y editar un hecho                                            | Metodo manual, autoria e historial persisten                          | Por registrar       | Pendiente | Vista Hechos         |
| Conciliacion        | Elegir una sugerencia y confirmar                                  | Diferencia calculada; conciliado exige confirmacion humana            | Por registrar       | Pendiente | Vista Conciliaciones |
| Exportacion         | Exportar el manifiesto                                             | Esquema 2.0.1, grupo laboral y `includesBinaryData: false`; sin bytes | Por registrar       | Pendiente | JSON local           |
| Seguridad           | Buscar claves `password`, bytes o llamadas de red en el manifiesto | No hay contraseñas ni binarios exportados ni procesamiento remoto     | Por registrar       | Pendiente | Revision JSON        |
| Borrado integral    | Eliminar el expediente                                             | Se eliminan sus tablas y binarios locales                             | Por registrar       | Pendiente | IndexedDB vacio      |

## Cierre

Una validacion manual se marca `OK` solo después de ejecutar los pasos. Si falla,
registra `Falla`, evidencia sintetica, navegador y pasos exactos de reproduccion.
