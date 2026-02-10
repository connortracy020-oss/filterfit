/// <reference types="vitest" />

import { describe, expect, it } from 'vitest';
import { parseSize } from '../lib/parse';
import { sortFilters } from '../lib/search';
import type { Filter } from '../lib/types';

describe('parseSize', () => {
  it('parses sizes with x', () => {
    expect(parseSize('16x25x1')).toEqual({ width: 16, height: 25, thickness: 1 });
  });

  it('parses sizes with the multiplication sign', () => {
    expect(parseSize('16×25×1')).toEqual({ width: 16, height: 25, thickness: 1 });
  });

  it('parses sizes with spaces', () => {
    expect(parseSize('16 x 25 x 1')).toEqual({ width: 16, height: 25, thickness: 1 });
  });

  it('returns null for incomplete input', () => {
    expect(parseSize('16x25')).toBeNull();
  });
});

describe('sortFilters', () => {
  const base: Filter = {
    id: '1',
    brand: 'Aero',
    series: null,
    nominal_w: 16,
    nominal_h: 25,
    thickness: 1,
    merv: 11,
    sku: 'SKU-1',
    upc: null,
    product_name: 'Alpha',
    url: null,
    notes: null,
    created_at: '2024-01-01'
  };

  it('puts exact sku match first', () => {
    const filters: Filter[] = [
      { ...base, id: '1', brand: 'B-Brand', sku: 'SKU-2', product_name: 'Beta' },
      { ...base, id: '2', brand: 'A-Brand', sku: 'SKU-1', product_name: 'Alpha' }
    ];

    const sorted = sortFilters(filters, 'SKU-1');
    expect(sorted[0].sku).toBe('SKU-1');
  });

  it('sorts by brand, then merv, then name', () => {
    const filters: Filter[] = [
      { ...base, id: '1', brand: 'Bravo', merv: 13, product_name: 'Zeta', sku: 'SKU-9' },
      { ...base, id: '2', brand: 'Alpha', merv: 8, product_name: 'Echo', sku: 'SKU-8' },
      { ...base, id: '3', brand: 'Alpha', merv: 11, product_name: 'Delta', sku: 'SKU-7' }
    ];

    const sorted = sortFilters(filters);
    expect(sorted.map((item) => item.id)).toEqual(['2', '3', '1']);
  });
});
