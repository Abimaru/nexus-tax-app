# Contrato de enriquecimiento documental futuro

## Estado

Este contrato es una frontera abstracta; Sprint 2.1 no conecta modelos, no
muestra botones de IA y no realiza solicitudes. La extracción determinista y la
revisión humana siguen siendo la fuente operativa.

## Entrada permitida

Un enriquecedor futuro podría recibir únicamente:

- texto limitado y minimizado;
- tipo documental ya propuesto;
- esquema de salida permitido;
- candidatos deterministas existentes;
- una pregunta concreta;
- política de privacidad y presupuesto de contenido.

Nunca debe recibir por defecto el PDF, páginas completas, contraseña, buffer,
identificación completa o campos fuera de la pregunta.

## Salida permitida

```ts
interface DocumentEnrichmentProvider {
  readonly id: string;
  readonly version: string;
  enrich(input: LimitedDocumentEnrichmentInput): Promise<DocumentEnrichmentProposal>;
}

interface DocumentEnrichmentProposal {
  proposals: StructuredProposal[];
  evidence: LimitedEvidence[];
  confidence: "high" | "medium" | "low" | "insufficient";
  warnings: string[];
}
```

Una propuesta futura debe conservar proveedor, versión, evidencia y advertencias,
y entrar al mismo flujo de candidatos. Nunca crea un hecho ni modifica la matriz
sin confirmación humana.

## Condiciones para habilitarlo

Se requiere una decisión de producto separada sobre ejecución local o envío,
consentimiento explícito, minimización, proveedor, retención, costos, modo
offline, auditoría de red, amenaza de prompt injection documental y opción de
desactivar/eliminar. Hasta cerrar esas decisiones la interfaz no debe insinuar
que IA está disponible.
