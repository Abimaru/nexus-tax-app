# Modelo de identidad de entidades

## Capas

NexusTax distingue razón social, marca comercial, grupo empresarial, NIT y producto. Compartir una
marca o grupo no autoriza fusionar entidades reportantes.

La identidad se resuelve en `packages/exogenous-parser/src/entityIdentity.ts` mediante un catálogo
versionado. El NIT sigue siendo la clave primaria de agrupación cuando está disponible. Los alias
solo enriquecen presentación y coincidencias controladas.

## Caso Grupo Bancolombia

`Bancolombia`, `Fiduciaria Bancolombia` y `Nequi` pueden mostrarse bajo `Grupo Bancolombia`, pero
permanecen como entidades distintas si tienen NIT diferentes. Cada producto conserva su
`entityId`; el sugeridor no cruza productos entre entidades y devuelve ambigüedad cuando dos
opciones obtienen la misma evidencia.

## Evolución

Las nuevas abreviaturas deben agregarse al catálogo, acompañadas de fixtures sintéticos y un cambio
de `ENTITY_ALIAS_CATALOG_VERSION`. La lógica no debe dispersarse en React.
