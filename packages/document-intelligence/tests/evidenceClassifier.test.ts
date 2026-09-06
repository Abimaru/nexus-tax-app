import { describe, expect, it } from 'vitest';
import { classifyDocumentNumericEvidence, classifyNumericEvidence } from '../src';
import { representation } from './fixtures';

describe('classifyNumericEvidence (Sprint 2.4, Fase E)', () => {
  it('clasifica un NIT como identificador tributario, no como dinero', () => {
    const line = 'NIT del tercero: 900123456-7';
    const raw = '900123456';
    const result = classifyNumericEvidence(raw, {
      line,
      index: line.indexOf(raw),
      page: 1,
    });
    expect(result.role).toBe('tax_identifier');
    expect(result.reasons[0]).toMatch(/NIT/i);
  });

  it('clasifica un número de resolución como referencia documental', () => {
    const line = 'Resolución No. 4567890 de la DIAN';
    const raw = '4567890';
    const result = classifyNumericEvidence(raw, {
      line,
      index: line.indexOf(raw),
      page: 2,
    });
    expect(result.role).toBe('document_reference');
  });

  it('clasifica un año aislado de 4 dígitos como año, no como dinero', () => {
    const line = 'Vigencia fiscal 2024';
    const raw = '2024';
    const result = classifyNumericEvidence(raw, {
      line,
      index: line.indexOf(raw),
      page: 1,
    });
    expect(result.role).toBe('year');
  });

  it('clasifica un número de cuenta como cuenta, no como dinero', () => {
    const line = 'Número de cuenta 1234567890';
    const raw = '1234567890';
    const result = classifyNumericEvidence(raw, {
      line,
      index: line.indexOf(raw),
      page: 3,
    });
    expect(result.role).toBe('account_number');
  });

  it('clasifica un monto sin símbolo de moneda pero con formato de miles como dinero', () => {
    const line = 'Saldo disponible 1.234.567 al cierre';
    const raw = '1.234.567';
    const result = classifyNumericEvidence(raw, {
      line,
      index: line.indexOf(raw),
      page: 1,
    });
    expect(result.role).toBe('money');
  });

  it('clasifica un monto sin símbolo ni formato pero de valor alto como dinero (dinero-sin-$)', () => {
    const line = 'Total pagado 15000 en el periodo';
    const raw = '15000';
    const result = classifyNumericEvidence(raw, {
      line,
      index: line.indexOf(raw),
      page: 1,
    });
    expect(result.role).toBe('money');
    expect(result.confidence).toBe('low');
  });

  it('clasifica un porcentaje como porcentaje, no como dinero', () => {
    const line = 'Retención aplicada: 4%';
    const raw = '4';
    const result = classifyNumericEvidence(raw, {
      line,
      index: line.indexOf(raw),
      page: 1,
    });
    expect(result.role).toBe('percentage');
  });

  it('nunca descarta un token: siempre devuelve un rol y razones legibles', () => {
    const line = 'Referencia 837';
    const raw = '837';
    const result = classifyNumericEvidence(raw, {
      line,
      index: line.indexOf(raw),
      page: 1,
    });
    expect(result.role).toBeDefined();
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.lineExcerpt.length).toBeGreaterThan(0);
  });
});

describe('classifyDocumentNumericEvidence (documento completo)', () => {
  it('separa dinero de ruido en un documento sintético con NIT, cuenta y saldo', () => {
    const doc = representation(
      'NIT: 900123456-7\nNúmero de cuenta: 1234567890\nSaldo al cierre: $ 1.000.000',
    );
    const evidence = classifyDocumentNumericEvidence(doc);
    const roles = evidence.map((item) => item.role);
    expect(roles).toContain('tax_identifier');
    expect(roles).toContain('account_number');
    expect(roles).toContain('money');
  });
});
