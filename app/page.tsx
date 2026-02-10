import Link from 'next/link';
import type { CSSProperties } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { parseSize } from '@/lib/parse';
import { buildSizeOrClause, escapeLike, sortFilters } from '@/lib/search';
import { formatSize } from '@/lib/format';
import type { Filter } from '@/lib/types';

const MERV_OPTIONS = [
  4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16
];

type SearchParams = Record<string, string | string[] | undefined>;

function getParam(searchParams: SearchParams, key: string) {
  const value = searchParams[key];
  return typeof value === 'string' ? value : '';
}

export default async function Home({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const sizeInput = getParam(searchParams, 'size').trim();
  const skuInput = getParam(searchParams, 'sku').trim();
  const mervInput = getParam(searchParams, 'merv').trim();

  const parsedSize = parseSize(sizeInput);
  const mervValue = mervInput ? Number.parseInt(mervInput, 10) : null;

  let results: Filter[] = [];
  let error: string | null = null;
  let hasQuery = Boolean(sizeInput || skuInput || mervInput);

  if (hasQuery) {
    if (sizeInput && !parsedSize) {
      error = 'Enter a filter size like 16x25x1.';
    } else if (mervInput && (Number.isNaN(mervValue) || mervValue === null)) {
      error = 'MERV must be a number.';
    } else if (!sizeInput && !skuInput) {
      error = 'Enter a size or SKU/UPC to search.';
    } else {
      try {
        const supabase = createSupabaseServerClient();

        const applySizeAndMerv = (query: any) => {
          let updated = query;
          if (parsedSize) {
            updated = updated.or(buildSizeOrClause(parsedSize));
          }
          if (mervValue !== null) {
            updated = updated.eq('merv', mervValue);
          }
          return updated;
        };

        const fetchFiltersByIds = async (ids: string[]) => {
          if (!ids.length) return [] as Filter[];
          const { data } = await applySizeAndMerv(
            supabase.from('filters').select('*').in('id', ids)
          );
          return data ?? [];
        };

        if (skuInput) {
          const exactQuery = applySizeAndMerv(supabase.from('filters').select('*')).or(
            `sku.eq.${skuInput},upc.eq.${skuInput}`
          );
          const { data: exactMatches, error: exactError } = await exactQuery;
          if (exactError) {
            error = 'Unable to run search. Please try again.';
          } else if (exactMatches && exactMatches.length) {
            results = exactMatches;
          } else {
            const escaped = escapeLike(skuInput);
            const fallbackQuery = applySizeAndMerv(
              supabase.from('filters').select('*')
            ).or(`sku.ilike.%${escaped}%,upc.ilike.%${escaped}%`);
            const { data: fallbackMatches, error: fallbackError } = await fallbackQuery;
            if (fallbackError) {
              error = 'Unable to run search. Please try again.';
            } else if (fallbackMatches && fallbackMatches.length) {
              results = fallbackMatches;
            } else {
              const { data: aliasExact } = await supabase
                .from('aliases')
                .select('filter_id')
                .eq('alias', skuInput);

              if (aliasExact && aliasExact.length) {
                results = await fetchFiltersByIds(
                  aliasExact.map((row) => row.filter_id)
                );
              } else {
                const { data: aliasFallback } = await supabase
                  .from('aliases')
                  .select('filter_id')
                  .ilike('alias', `%${escaped}%`);
                if (aliasFallback && aliasFallback.length) {
                  results = await fetchFiltersByIds(
                    aliasFallback.map((row) => row.filter_id)
                  );
                }
              }
            }
          }
        } else if (sizeInput) {
          const sizeQuery = applySizeAndMerv(supabase.from('filters').select('*'));
          const { data: sizeMatches, error: sizeError } = await sizeQuery;
          if (sizeError) {
            error = 'Unable to run search. Please try again.';
          } else {
            results = sizeMatches ?? [];
          }
        }
      } catch (err) {
        error = 'Supabase is not configured yet. Set the env vars and try again.';
      }
    }
  }

  const sortedResults = sortFilters(results, skuInput);

  return (
    <div className="grid" style={{ gap: '24px' }}>
      <section className="card">
        <h1>Find your filter fast.</h1>
        <p style={{ color: 'var(--muted)', marginTop: '6px' }}>
          Enter a nominal size, an optional MERV rating, and/or a SKU/UPC. FilterFit checks
          both size orientations so 16x25x1 matches 25x16x1.
        </p>
        <form method="get" style={{ marginTop: '18px' }} className="grid">
          <div className="form-row">
            <div>
              <label htmlFor="size">Filter size</label>
              <input
                id="size"
                name="size"
                placeholder="16x25x1"
                defaultValue={sizeInput}
              />
            </div>
            <div>
              <label htmlFor="sku">SKU / UPC</label>
              <input
                id="sku"
                name="sku"
                placeholder="Paste a SKU or UPC"
                defaultValue={skuInput}
              />
            </div>
            <div>
              <label htmlFor="merv">MERV (optional)</label>
              <select id="merv" name="merv" defaultValue={mervInput || ''}>
                <option value="">Any</option>
                {MERV_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button type="submit">Search filters</button>
            <Link href="/" className="button secondary">
              Reset
            </Link>
          </div>
        </form>
      </section>

      <section className="grid" style={{ gap: '12px' }}>
        {error ? <div className="notice error">{error}</div> : null}
        {!error && hasQuery ? (
          <div className="notice success">
            {sortedResults.length} result{sortedResults.length === 1 ? '' : 's'} found
          </div>
        ) : null}
        {!hasQuery ? (
          <div className="card">
            <h2>How it works</h2>
            <p style={{ color: 'var(--muted)' }}>
              FilterFit matches by nominal size. You can also search by SKU or UPC. Exact
              matches are prioritized and you can optionally filter by MERV.
            </p>
          </div>
        ) : null}

        {sortedResults.map((filter, index) => (
          <Link
            href={`/f/${filter.id}`}
            key={filter.id}
            className="card"
            style={{ '--card-delay': `${Math.min(index, 6) * 0.05}s` } as CSSProperties}
          >
            <div className="grid" style={{ gap: '6px' }}>
              <div className="badge">{formatSize(filter.nominal_w, filter.nominal_h, filter.thickness)}</div>
              <strong>{filter.product_name}</strong>
              <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
                {filter.brand}
                {filter.merv ? ` · MERV ${filter.merv}` : ''}
              </div>
              <div className="tag">SKU: {filter.sku}</div>
            </div>
          </Link>
        ))}

        {hasQuery && !error && sortedResults.length === 0 ? (
          <div className="card">
            <strong>No matches yet.</strong>
            <p style={{ color: 'var(--muted)' }}>
              Try a different size, remove the MERV filter, or check the SKU/UPC.
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
