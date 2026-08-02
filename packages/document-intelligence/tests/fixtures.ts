import type { DocumentRepresentation } from '../src';

export function representation(...pages: string[]): DocumentRepresentation {
  return {
    pageCount: pages.length,
    pages: pages.map((text, index) => ({
      pageNumber: index + 1,
      normalizedText: text,
      blocks: [{ text }],
      width: 612,
      height: 792,
      errors: [],
      readConfidence: text ? 'high' : 'insufficient',
    })),
    metadata: {},
    encrypted: false,
    warnings: [],
  };
}

export function syntheticTextPdf(lines: readonly string[]): Uint8Array {
  const escape = (value: string) => value.replace(/([\\()])/g, '\\$1');
  const commands = ['BT', '/F1 11 Tf', '72 740 Td'];
  lines.forEach((line, index) => {
    if (index) commands.push('0 -18 Td');
    commands.push(`(${escape(line)}) Tj`);
  });
  commands.push('ET');
  const stream = `${commands.join('\n')}\n`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${new TextEncoder().encode(stream).byteLength} >>\nstream\n${stream}endstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(new TextEncoder().encode(pdf).byteLength);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = new TextEncoder().encode(pdf).byteLength;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
    .join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
