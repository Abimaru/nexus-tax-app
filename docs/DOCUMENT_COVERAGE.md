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

## Ingresos laborales y Formulario 220

El Formulario 220 no es un requisito genérico repetido: cubre principalmente
una instancia del grupo `Ingresos laborales y empleadores`. Un mismo 220 no
puede asignarse a dos empleadores y se valida su entidad cuando el documento ya
tiene una asociación.

Los documentos complementarios aportan cobertura parcial pero no sustituyen el
220 silenciosamente. Un certificado tributario consolidado solo puede usarse
como soporte principal mediante una decisión expresa del analista después de
mostrar una advertencia.

La cobertura del grupo es `covered` cuando todas las instancias activas están
cubiertas, `partial` cuando hay mezcla de cobertura y pendientes, `pending`
cuando todas siguen pendientes y `requires_review` si existe una inconsistencia.
Las instancias no creadas o marcadas `not_applicable` no reducen el avance.
