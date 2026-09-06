import { describe, expect, it } from 'vitest';
import { compareSpanishText, sortBySpanishLabel } from './alphabeticalSort';

describe('orden alfabético visible', () => {
  it('ignora mayúsculas y tildes y respeta números', () => {
    const values = ['Entidad 10', 'Ábaco', 'entidad 2', 'Banco'];
    expect(sortBySpanishLabel(values, (value) => value)).toEqual([
      'Ábaco',
      'Banco',
      'entidad 2',
      'Entidad 10',
    ]);
    expect(compareSpanishText('Áhorro', 'ahorro')).toBe(0);
  });

  it('no modifica el arreglo original', () => {
    const values = [{ label: 'Zeta' }, { label: 'Alfa' }];
    expect(sortBySpanishLabel(values, (value) => value.label).map((value) => value.label)).toEqual([
      'Alfa',
      'Zeta',
    ]);
    expect(values[0]?.label).toBe('Zeta');
  });
});
