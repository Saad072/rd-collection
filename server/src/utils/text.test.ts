import { describe, expect, it } from 'vitest';
import { slugify, generateOrderNumber } from './text';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Gulnaar Embroidered Kurta Set')).toBe('gulnaar-embroidered-kurta-set');
  });
  it('strips punctuation and collapses separators', () => {
    expect(slugify('  Saree & Blouse — Festive! ')).toBe('saree-blouse-festive');
  });
  it('removes diacritics', () => {
    expect(slugify('Crème Brûlée Kurta')).toBe('creme-brulee-kurta');
  });
  it('handles empty/degenerate input', () => {
    expect(slugify('---')).toBe('');
    expect(slugify('')).toBe('');
  });
});

describe('generateOrderNumber', () => {
  it('matches RD-YYYYMMDD-XXXXXX format', () => {
    const n = generateOrderNumber(new Date('2026-10-12T00:00:00Z'));
    expect(n).toMatch(/^RD-20261012-[A-Z2-9]{6}$/);
  });
  it('generates unique values', () => {
    const seen = new Set(Array.from({ length: 50 }, () => generateOrderNumber()));
    expect(seen.size).toBe(50);
  });
});
