# NexusTax

**Estación personal de análisis tributario** para Colombia. Local, privada y
extensible. Motor futuro de reglas: **Aegis Engine**.

> NexusTax ayuda a un analista humano a organizar expedientes, leer información
> exógena, normalizar registros, detectar inconsistencias y preparar la
> declaración de renta. **No** presenta declaraciones ante la DIAN ni realiza
> cálculos tributarios todavía. Todo el procesamiento ocurre **en tu navegador**.

## Alcance del Sprint 1

Crear expediente → cargar Excel de exógena → inspeccionar hojas → normalizar
registros → ver resumen y gráficas → revisar hallazgos → evaluar de forma
orientativa la obligación de declarar para AG 2025 → obtener un checklist
documental preliminar → guardar en IndexedDB → exportar JSON.

Fuera de alcance (por ahora): backend, IA, autenticación, extracción avanzada
de PDFs, liquidación del impuesto e integración en línea con la DIAN. Solo se permite asociar
metadatos locales de un PDF a una recomendación documental.

## Arquitectura (monorepo pnpm)

```
apps/
  web/    Next.js (App Router) — UI y pantallas
  api/    RESERVADO (sin lógica en Sprint 1)
packages/
  domain/            Tipos + esquemas Zod (puro)
  exogenous-parser/  Motor de Excel: parseo, normalización, hallazgos, checklist
  aegis-rules/        Reglas tributarias locales, explicables y versionadas
  ui/                Primitivas visuales reutilizables
  config/            Constantes y tsconfig compartidos
docs/                Documentación del proyecto
samples/             Fixtures sintéticos (nunca datos reales)
```

Los límites entre módulos son estrictos: **la lógica de dominio y de parsing no
vive en componentes React** (ver `docs/ARCHITECTURE.md`).

## Requisitos

- Node.js ≥ 20.11
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
- [Reglas Aegis](docs/AEGIS_RULES.md)
- [Seguridad y privacidad](docs/SECURITY_PRIVACY.md)
- [Roadmap](docs/ROADMAP.md)
- [Handoff del proyecto](docs/PROJECT_HANDOFF.md)

Reglas permanentes para agentes: [`CLAUDE.md`](CLAUDE.md) · [`AGENTS.md`](AGENTS.md).
