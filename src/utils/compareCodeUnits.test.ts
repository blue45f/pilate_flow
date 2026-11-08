import { describe, expect, it } from 'vitest';
import { compareCodeUnits } from './compareCodeUnits';

describe('compareCodeUnits', () => {
  it('preserves native coercion when malformed data bypasses string schemas', () => {
    const values: unknown[] = [2, '10', 10, '2', null, false, undefined, { toString: () => 'A' }];
    expect([...values].sort(compareCodeUnits)).toEqual([...values].sort());
    expect([2, 10].sort(compareCodeUnits).join('|')).toBe(
      ['2', '10'].sort(compareCodeUnits).join('|'),
    );
  });

  it('keeps native rejection of Symbols rather than silently stringifying them', () => {
    const values = [Symbol('unsupported'), 'value'];
    expect(() => [...values].sort()).toThrow(TypeError);
    expect(() => [...values].sort(compareCodeUnits)).toThrow(TypeError);
  });

  it('preserves native string ordering across case, accents, Korean and surrogate pairs', () => {
    const values = [
      '',
      'a',
      'A',
      '10',
      '2',
      'é',
      'e\u0301',
      '가',
      '힣',
      '\ud800',
      '\udfff',
      '😀',
      'a',
      'a\u0000',
    ];
    // The default-sort oracle deliberately checks compatibility with existing persisted identities.
    expect([...values].sort(compareCodeUnits)).toEqual([...values].sort());
    expect([...values].sort(compareCodeUnits)).toEqual([
      '',
      '10',
      '2',
      'A',
      'a',
      'a',
      'a\u0000',
      'e\u0301',
      'é',
      '가',
      '힣',
      '\ud800',
      '😀',
      '\udfff',
    ]);
  });

  it('matches every UTF-16 code unit without locale or normalization rules', () => {
    const reverseUnits = Array.from({ length: 0x10000 }, (_, index) =>
      String.fromCharCode(0xffff - index),
    );
    const expected = Array.from({ length: 0x10000 }, (_, index) => String.fromCharCode(index));
    expect(reverseUnits.sort(compareCodeUnits)).toEqual(expected);
  });

  it('preserves equality and the direction of every pair', () => {
    const values = ['', 'A', 'Z', 'a', 'é', '가', '😀'];
    for (const left of values) {
      expect(compareCodeUnits(left, left)).toBe(0);
      for (const right of values) {
        expect(compareCodeUnits(left, right) + compareCodeUnits(right, left)).toBe(0);
      }
    }
  });
});
