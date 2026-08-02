import { copyFile, mkdir, readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const workerRoot = dirname(fileURLToPath(import.meta.resolve('tesseract.js/package.json')));
const coreRoot = dirname(fileURLToPath(import.meta.resolve('tesseract.js-core/package.json')));
const target = join(webRoot, 'public', 'vendor', 'tesseract');
const coreTarget = join(target, 'core');
const langTarget = join(target, 'lang');

// Motor LSTM (moderno) en sus tres variantes de aceleración; tesseract.js
// detecta el soporte del navegador (relaxed-simd > simd > sin simd) y elige el
// archivo correspondiente en tiempo de ejecución, siempre desde este origen.
const CORE_VARIANTS = [
  'tesseract-core-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm.js',
  'tesseract-core-relaxedsimd-lstm.wasm.js',
];

const SPANISH_TRAINEDDATA_URL =
  'https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/87416418657359cb625c412a48b6e1d6d41c29bd/spa.traineddata';
const SPANISH_TRAINEDDATA_SHA256 =
  '6f2e04d02774a18f01bed44b1111f2cd7f3ba7ac9dc4373cd3f898a40ea6b464';

async function exists(path) {
  return stat(path)
    .then(() => true)
    .catch(() => false);
}

async function fetchSpanishTraineddata(destination) {
  if (await exists(destination)) {
    await verifySpanishTraineddata(destination);
    return;
  }
  let response;
  try {
    response = await fetch(SPANISH_TRAINEDDATA_URL);
  } catch (cause) {
    throw new Error(
      `No se pudo descargar el modelo de idioma español para OCR (${SPANISH_TRAINEDDATA_URL}). ` +
        'Se requiere red solo una vez, en tiempo de desarrollo/build, para vendorizarlo localmente; ' +
        'el procesamiento en el navegador nunca hace esta llamada. Verifica la conexión y reintenta.',
      { cause },
    );
  }
  if (!response.ok) {
    throw new Error(
      `La descarga del modelo de idioma español respondió ${response.status} ${response.statusText}.`,
    );
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const { writeFile } = await import('node:fs/promises');
  await writeFile(destination, bytes);
  await verifySpanishTraineddata(destination);
}

async function verifySpanishTraineddata(path) {
  const digest = createHash('sha256')
    .update(await readFile(path))
    .digest('hex');
  if (digest !== SPANISH_TRAINEDDATA_SHA256) {
    throw new Error(
      `El modelo OCR local no coincide con el SHA-256 esperado (${SPANISH_TRAINEDDATA_SHA256}). ` +
        'Elimina solo apps/web/public/vendor/tesseract/lang/spa.traineddata y ejecuta de nuevo la preparación.',
    );
  }
}

await mkdir(coreTarget, { recursive: true });
await mkdir(langTarget, { recursive: true });

await copyFile(join(workerRoot, 'dist', 'worker.min.js'), join(target, 'worker.min.js'));
await Promise.all(
  CORE_VARIANTS.map((file) => copyFile(join(coreRoot, file), join(coreTarget, file))),
);
await fetchSpanishTraineddata(join(langTarget, 'spa.traineddata'));
