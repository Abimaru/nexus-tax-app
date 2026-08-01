# Catálogo y cobertura documental

`DOCUMENT_CATALOG` define 16 tipos iniciales con nombre, categoría, descripción,
entidades compatibles, capacidades, datos posibles, revisión, productos
múltiples y extensiones aceptadas.

## Documento multipropósito

Un documento se registra una sola vez y puede enlazarse con varios requisitos.
La cobertura vive en `RequirementCoverage`, no en copias del archivo. Sus
estados son: no evaluado, parcial, cubierto, no aplica y requiere revisión.

La relación describe si el documento o hecho cubre, cubre parcialmente, aporta
evidencia, contradice o requiere otro soporte. El certificado tributario
consolidado puede cubrir saldos, deudas, rendimientos, retenciones e inversiones.

## Duplicados y versiones

El navegador calcula SHA-256 sobre los bytes sin enviarlos. Un hash activo
repetido en el expediente se rechaza. Un reemplazo crea una versión nueva,
marca la anterior como reemplazada y conserva identificadores y relaciones; no
hay eliminación silenciosa.
