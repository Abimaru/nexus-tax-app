import { describe, expect, it } from 'vitest';
import { classifyDocument } from '../src';
import { representation } from './fixtures';

/**
 * Sprint 2.4, Fase F.3 — Unified Reconciliation & Coverage Hardening
 * (§10/§21). Corrige la miscategorización real encontrada en el
 * benchmark (Fase F.1): un certificado "Certificados tributarios [banco]"
 * multiproducto caía en `debt_certificate` en vez de
 * `consolidated_tax_certificate`. Ningún fixture usa nombre de banco, NIT
 * ni texto de documento real — solo señales estructurales (§10).
 */
describe('classifyDocument — certificados tributarios consolidados (Fase F.3, §10)', () => {
  it('reconoce la forma plural real "Certificados tributarios" (antes solo reconocía el singular)', () => {
    const classification = classifyDocument(
      representation('Certificados tributarios Entidad Sintética 2025'),
    );
    expect(classification.proposedKind).toBe('consolidated_tax_certificate');
  });

  it('un documento multiproducto (saldo + rendimiento + retención + GMF) se clasifica como consolidado, no como deuda', () => {
    const classification = classifyDocument(
      representation(
        'Certificados tributarios Entidad Sintética 2025',
        'Saldo de capital cuenta de ahorros: $ 1.000.000',
        'Rendimientos financieros: $ 50.000',
        'Retención en la fuente: $ 5.000',
        'Gravamen a los movimientos financieros (GMF): $ 2.000',
      ),
    );
    expect(classification.proposedKind).toBe('consolidated_tax_certificate');
  });

  it('un certificado de deuda genuino (sin señales multiproducto) sigue clasificándose como debt_certificate (no regresión)', () => {
    const classification = classifyDocument(
      representation('Certificado de deuda Entidad Sintética', 'Saldo de capital: $ 5.000.000'),
    );
    expect(classification.proposedKind).toBe('debt_certificate');
  });
});
