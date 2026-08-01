# Convenciones de commits

NexusTax usa una primera linea breve, legible y con una sola intencion:

```text
ICONO CATEGORIA: descripcion
```

## Categorias oficiales

| Icono | Categoria | Uso                                                      |
| ----- | --------- | -------------------------------------------------------- |
| ✨    | FEATURE   | capacidad nueva para el usuario o el dominio             |
| 🐛    | BUGFIX    | correccion de comportamiento defectuoso                  |
| 🎨    | STYLE     | presentacion, formato o renombrado sin cambio de dominio |
| ♻️    | REFACTOR  | reorganizacion no funcional                              |
| ⚡    | PERF      | mejora medible de rendimiento                            |
| 📝    | DOCS      | documentacion                                            |
| ✅    | TEST      | pruebas nuevas o corregidas                              |
| 🔒    | SECURITY  | privacidad o seguridad                                   |
| 🗃️    | DATA      | modelos, esquemas o migraciones de datos                 |
| 🏗️    | BUILD     | compilacion o dependencias de build                      |
| 👷    | CI        | automatizacion de integracion continua                   |
| 🔧    | CHORE     | mantenimiento operativo                                  |
| ⏪    | REVERT    | reversion explicita                                      |

## Reglas

- Escribe la descripcion en presente imperativo: `agrega`, `corrige`, `documenta`.
- Mantiene la primera linea en un maximo recomendado de 72 caracteres.
- No termina la primera linea con punto.
- Conserva una intencion principal por commit.
- Evita mensajes genericos como `cambios`, `ajustes` o `fix`.
- Usa un cuerpo separado por una linea vacia cuando debas explicar motivacion,
  riesgos, migraciones o decisiones.
- Declara `BREAKING CHANGE: ...` en el cuerpo cuando exista incompatibilidad.

## Ejemplos correctos

```text
✨ FEATURE: agrega grupo laboral por empleador
🐛 BUGFIX: evita duplicar el Formulario 220
✅ TEST: cubre persistencia de empleadores tras recarga
📝 DOCS: documenta la validacion reproducible del Sprint 2
🗃️ DATA: migra IndexedDB para conservar grupos laborales
```

## Ejemplos incorrectos

```text
arreglos
✨ Feature: Added things.
🐛 BUGFIX: cambios varios
🎨: UI: mejoras
```

Fallan porque omiten categoria, mezclan el formato, usan pasado o idioma
inconsistente, terminan en punto o no describen una intencion verificable.
