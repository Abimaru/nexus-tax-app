# Perfiles documentales

## Modelo

Un `DocumentProfile` describe un formato reutilizable mediante tipo documental, dimensiones,
cantidad de páginas, secciones, encabezados, campos y zonas relativas. Vive en la instalación local,
no en un expediente, y nunca coincide solo por nombre de archivo.

## Matching explicable

`matchDocumentProfiles` pondera dimensiones, páginas, secciones y encabezados en partes iguales.
La interfaz muestra confianza y motivos. Los perfiles obsoletos no se sugieren.

## Ciclo de vida

```text
borrador → probado → activo → obsoleto
```

Cada transición es explícita. Activar u obsoletar solicita confirmación; no existe promoción
automática. Una tarea local recuerda probar los perfiles creados desde un documento.

## Privacidad

El perfil no guarda el PDF ni texto completo. Sus encabezados, marca, evidencia de zona y campos
pueden ser sensibles, por lo que permanecen en IndexedDB y no se exportan como catálogo global. El
manifiesto solo incluye conteos de perfiles vinculados mediante feedback del expediente.

## Limitación deliberada

Un perfil activo aún funciona como sugerencia explicable; no crea hechos ni aplica zonas sin revisión
humana. Esta frontera evita automatización tributaria silenciosa.
