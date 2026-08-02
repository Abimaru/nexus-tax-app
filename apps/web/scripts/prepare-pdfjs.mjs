import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const pdfjsRoot = dirname(fileURLToPath(import.meta.resolve('pdfjs-dist/package.json')));
const target = join(webRoot, 'public', 'vendor', 'pdfjs');

await mkdir(target, { recursive: true });
await Promise.all([
  copyFile(join(pdfjsRoot, 'build', 'pdf.mjs'), join(target, 'pdf.mjs')),
  copyFile(join(pdfjsRoot, 'build', 'pdf.worker.mjs'), join(target, 'pdf.worker.mjs')),
]);
