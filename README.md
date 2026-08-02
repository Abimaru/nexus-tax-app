# NexusTax

**Estación personal de análisis tributario** para Colombia. Local, privada y
extensible. Motor de reglas y análisis: **Aegis Engine**.

> NexusTax ayuda a un analista humano a organizar expedientes, leer información
> exógena, normalizar y **clasificar** registros, conciliar contra topes, detectar
> inconsistencias y preparar la declaración de renta. Todo es **orientativo y
> revisado por un humano**: **no** presenta declaraciones ante la DIAN ni **liquida
> el impuesto** (no calcula el Formulario 210). Todo ocurre **en tu navegador**.

## Alcance actual

Crear expediente → recorrer las etapas **Fuente, Extracción, Organización,
Conciliación, Declaración y Exportación** → cargar Excel de exógena → inspeccionar hojas y **secciones**
(topes/detalle) → normalizar y clasificar registros → extraer la **identidad DIAN**
→ ver resumen y gráficas → revisar la **matriz de análisis** y los hallazgos →
**resolver** decisiones (con historial) → evaluar de forma orientativa la
**obligación de declarar** AG 2025 → biblioteca y cobertura documental → hechos
manuales o **asistidos desde PDF textual local** → revisión de candidatos →
conciliación documental confirmada por el analista → guardar en
IndexedDB → aceptar provisionalmente valores exógenos con trazabilidad →
gestionar soportes no emitidos → exportar un manifiesto sin binarios. Interfaz
con **tema claro y oscuro**.

Fuera de alcance (por ahora): backend, IA, autenticación, OCR y PDFs escaneados,
liquidación del impuesto e integración en línea con la DIAN. Un
soporte puede conservarse opcionalmente en IndexedDB, siempre local y por
decisión explícita.

## Arquitectura (monorepo pnpm)

```
apps/
  web/    Next.js (App Router) — UI y pantallas
  api/    RESERVADO (sin lógica en Sprint 1)
packages/
  domain/            Tipos + esquemas Zod (puro)
  exogenous-parser/  Motor de Excel: parseo, normalización, hallazgos, checklist
  aegis-rules/        Reglas tributarias locales, explicables y versionadas
  document-intelligence/ Lectura PDF, clasificación y candidatos (puro)
  ui/                Primitivas visuales reutilizables
  config/            Constantes y tsconfig compartidos
docs/                Documentación del proyecto
samples/             Fixtures sintéticos (nunca datos reales)
```

Los límites entre módulos son estrictos: **la lógica de dominio y de parsing no
vive en componentes React** (ver `docs/ARCHITECTURE.md`).

## Requisitos

- Node.js ≥ 20.16
- pnpm 9 (`corepack enable` activa la versión declarada en `package.json`)

## Comandos

```bash
corepack enable          # habilita pnpm
pnpm install             # instala el workspace
pnpm dev                 # levanta apps/web en http://localhost:3000
pnpm build               # typecheck de paquetes + build de Next
pnpm lint                # ESLint en todo el workspace
pnpm typecheck           # TypeScript estricto en todo el workspace
pnpm test                # pruebas unitarias (Vitest)
pnpm --filter @nexus-tax/web test:e2e   # smoke test (Playwright)
```

## Privacidad

Los archivos **no se suben a ningún servidor**. Se procesan localmente y puedes
eliminar un expediente o **limpiar toda la información local** desde la interfaz.
Detalles en `docs/SECURITY_PRIVACY.md`.

## Documentación

- [Visión de producto](docs/PRODUCT_VISION.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [UX / UI](docs/UX_UI.md)
- [Modelo de datos](docs/DATA_MODEL.md)
- [Parser de exógena](docs/EXOGENOUS_PARSER.md)
- [Clasificación y resolución](docs/CLASSIFICATION_RESOLUTION.md)
- [Reglas tributarias](docs/TAX_RULES.md)
- [Conciliación](docs/RECONCILIATION.md)
- [Expediente tributario](docs/TAX_CASE.md)
- [Flujo guiado del expediente](docs/EXPEDIENT_WORKFLOW.md)
- [Navegación por etapas](docs/NAVIGATION_STAGES.md)
- [Cobertura documental](docs/DOCUMENT_COVERAGE.md)
- [Hechos documentales](docs/DOCUMENT_FACTS.md)
- [Inteligencia documental](docs/DOCUMENT_INTELLIGENCE.md)
- [Procesamiento PDF](docs/PDF_PROCESSING.md)
- [Adaptadores documentales](docs/DOCUMENT_ADAPTERS.md)
- [Revisión de extracción](docs/DOCUMENT_EXTRACTION_REVIEW.md)
- [Seguridad de extracción](docs/DOCUMENT_EXTRACTION_SECURITY.md)
- [Contrato de enriquecimiento futuro](docs/AI_DOCUMENT_ENRICHMENT_CONTRACT.md)
- [Fuentes aceptadas](docs/ACCEPTED_SOURCES.md)
- [Aceptación de valores exógenos](docs/EXOGENOUS_VALUE_ACCEPTANCE.md)
- [Conciliación documental](docs/PRELIMINARY_RECONCILIATION.md)
- [Quality gate visual](docs/UX_QUALITY_GATE.md)
- [Guía de microcopy](docs/MICROCOPY_GUIDE.md)
- [Validación funcional del Sprint 2](docs/SPRINT_2_VALIDATION.md)
- [Convenciones de commits](docs/COMMIT_CONVENTIONS.md)
- [Reglas Aegis](docs/AEGIS_RULES.md)
- [Seguridad y privacidad](docs/SECURITY_PRIVACY.md)
- [Roadmap](docs/ROADMAP.md)
- [Handoff del proyecto](docs/PROJECT_HANDOFF.md)

Reglas permanentes para agentes: [`CLAUDE.md`](CLAUDE.md) · [`AGENTS.md`](AGENTS.md).
