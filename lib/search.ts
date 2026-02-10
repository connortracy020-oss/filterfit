import { Filter } from '@/lib/types';
import { ParsedSize } from '@/lib/parse';

export function buildSizeOrClause(size: ParsedSize) {
  const { width, height, thickness } = size;
  const first = `and(nominal_w.eq.${width},nominal_h.eq.${height},thickness.eq.${thickness})`;
  const second = `and(nominal_w.eq.${height},nominal_h.eq.${width},thickness.eq.${thickness})`;
  return `${first},${second}`;
}

export function escapeLike(value: string) {
  return value.replace(/[\%_]/g, '\\$&');
}

export function sortFilters(filters: Filter[], skuOrUpc?: string) {
  const target = skuOrUpc?.trim();

  return [...filters].sort((a, b) => {
    const rankA = target && (a.sku === target || a.upc === target) ? 0 : 1;
    const rankB = target && (b.sku === target || b.upc === target) ? 0 : 1;
    if (rankA !== rankB) return rankA - rankB;

    const brandCompare = a.brand.localeCompare(b.brand, undefined, { sensitivity: 'base' });
    if (brandCompare !== 0) return brandCompare;

    const mervA = a.merv ?? 9999;
    const mervB = b.merv ?? 9999;
    if (mervA !== mervB) return mervA - mervB;

    const nameCompare = a.product_name.localeCompare(b.product_name, undefined, { sensitivity: 'base' });
    if (nameCompare !== 0) return nameCompare;

    return a.sku.localeCompare(b.sku, undefined, { sensitivity: 'base' });
  });
}
