import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';

const ROOT = process.cwd();

const SCAN_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.mdx',
  '.yml',
  '.yaml',
]);

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.turbo',
  '.vercel',
  'out',
  '.pnpm-store',
]);

const EXCLUDED_DIR_PREFIXES = ['.next'];

function isExcludedDir(name) {
  return EXCLUDED_DIRS.has(name) || EXCLUDED_DIR_PREFIXES.some((prefix) => name.startsWith(prefix));
}

const EXCLUDED_FILES = new Set(['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock']);

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const FIXTURE_MARKER = 'nexustax:allow-mojibake';
const FIXTURE_PATH_PATTERN = /(^|[\\/])(fixtures?|__fixtures__)[\\/].*(encoding|mojibake)/i;

// Los patrones se arman con codigos numericos (no con los caracteres literales)
// a proposito: son bytes de control o de reemplazo, y este mismo archivo no debe
// terminar conteniendo en su propio codigo fuente el patron que busca detectar.
function charRange(from, to) {
  return `[${String.fromCharCode(from)}-${String.fromCharCode(to)}]`;
}

const PATTERNS = [
  {
    id: 'utf8-as-latin1-accent',
    label: 'UTF-8 interpretado como Latin-1 (vocal acentuada o ene con tilde)',
    re: new RegExp(`Ã${charRange(0x80, 0xbf)}`, 'g'),
  },
  {
    id: 'utf8-as-latin1-symbol',
    label: 'UTF-8 interpretado como Latin-1 (simbolo, espacio duro, signos invertidos)',
    re: new RegExp(`Â${charRange(0x80, 0xbf)}`, 'g'),
  },
  {
    id: 'utf8-as-windows1252-punct',
    label: 'UTF-8 interpretado como Windows-1252 (comillas o guion tipografico)',
    re: new RegExp(`â${String.fromCharCode(0x80)}${charRange(0x80, 0x9f)}`, 'g'),
  },
  {
    id: 'replacement-character',
    label: 'Caracter de reemplazo Unicode (bytes invalidos para UTF-8)',
    re: new RegExp(String.fromCharCode(0xfffd), 'g'),
  },
];

function isFixturePath(relPath) {
  return FIXTURE_PATH_PATTERN.test(relPath);
}

function hasFixtureMarker(content) {
  return content.slice(0, 1000).includes(FIXTURE_MARKER);
}

function lineOf(content, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (content[i] === '\n') line += 1;
  }
  return line;
}

function walk(dir, files) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (isExcludedDir(entry.name)) continue;
      walk(join(dir, entry.name), files);
      continue;
    }
    if (!entry.isFile()) continue;
    if (EXCLUDED_FILES.has(entry.name)) continue;
    if (!SCAN_EXTENSIONS.has(extname(entry.name))) continue;
    files.push(join(dir, entry.name));
  }
  return files;
}

function scanFile(absPath) {
  const relPath = relative(ROOT, absPath).split(sep).join('/');
  if (statSync(absPath).size > MAX_FILE_BYTES) {
    return { relPath, skipped: 'too_large', violations: [] };
  }

  const content = readFileSync(absPath, 'utf8');

  if (isFixturePath(relPath) || hasFixtureMarker(content)) {
    return { relPath, skipped: 'fixture', violations: [] };
  }

  const violations = [];
  for (const pattern of PATTERNS) {
    for (const match of content.matchAll(pattern.re)) {
      violations.push({
        line: lineOf(content, match.index),
        patternId: pattern.id,
        label: pattern.label,
        snippet: content.slice(Math.max(0, match.index - 12), match.index + 12).replace(/\s+/g, ' '),
      });
    }
  }
  return { relPath, skipped: null, violations };
}

function main() {
  const files = walk(ROOT, []);
  let fixturesSkipped = 0;
  const reports = [];

  for (const absPath of files) {
    const result = scanFile(absPath);
    if (result.skipped === 'fixture') {
      fixturesSkipped += 1;
      continue;
    }
    if (result.violations.length > 0) {
      reports.push(result);
    }
  }

  if (reports.length === 0) {
    console.log(
      `check:encoding OK - ${files.length} archivos revisados, ${fixturesSkipped} fixtures excluidas, sin mojibake detectado.`,
    );
    return;
  }

  console.error('check:encoding FALLO - se detecto texto con codificacion danada:\n');
  let total = 0;
  for (const report of reports) {
    for (const violation of report.violations) {
      total += 1;
      console.error(
        `  ${report.relPath}:${violation.line} [${violation.patternId}] ${violation.label}\n    ...${violation.snippet}...`,
      );
    }
  }
  console.error(
    `\n${total} coincidencia(s) en ${reports.length} archivo(s). Corrige el texto o, si es una fixture` +
      ` intencional para probar codificacion, muevela bajo una carpeta "fixtures/encoding" o agrega la` +
      ` marca "${FIXTURE_MARKER}" en las primeras lineas del archivo.`,
  );
  process.exitCode = 1;
}

main();
