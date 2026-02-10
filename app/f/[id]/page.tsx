import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatSize } from '@/lib/format';
import ShareButton from '@/components/ShareButton';

export default async function FilterDetail({
  params
}: {
  params: { id: string };
}) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: filter, error } = await supabase
      .from('filters')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !filter) {
      return (
        <div className="card">
          <h1>Filter not found</h1>
          <p style={{ color: 'var(--muted)' }}>
            We couldn’t find that filter. Try searching again.
          </p>
          <Link href="/" className="button secondary">
            Back to search
          </Link>
        </div>
      );
    }

    const { data: aliases } = await supabase
      .from('aliases')
      .select('alias')
      .eq('filter_id', filter.id)
      .order('alias');

    return (
      <div className="grid" style={{ gap: '18px' }}>
        <Link href="/" className="button secondary">
          Back to search
        </Link>
        <section className="card">
          <div className="badge">{formatSize(filter.nominal_w, filter.nominal_h, filter.thickness)}</div>
          <h1 style={{ marginTop: '12px' }}>{filter.product_name}</h1>
          <p style={{ color: 'var(--muted)' }}>{filter.brand}</p>
          {filter.merv ? <div className="tag">MERV {filter.merv}</div> : null}
        </section>

        <section className="card grid" style={{ gap: '12px' }}>
          <div>
            <strong>SKU:</strong> {filter.sku}
          </div>
          {filter.upc ? (
            <div>
              <strong>UPC:</strong> {filter.upc}
            </div>
          ) : null}
          {filter.series ? (
            <div>
              <strong>Series:</strong> {filter.series}
            </div>
          ) : null}
          {filter.url ? (
            <div>
              <strong>Product link:</strong>{' '}
              <a href={filter.url} target="_blank" rel="noreferrer">
                Open product page
              </a>
            </div>
          ) : null}
          {filter.notes ? (
            <div>
              <strong>Notes:</strong> {filter.notes}
            </div>
          ) : null}
          {aliases && aliases.length ? (
            <div>
              <strong>Aliases:</strong>{' '}
              {aliases.map((alias) => (
                <span key={alias.alias} className="tag" style={{ marginRight: '6px' }}>
                  {alias.alias}
                </span>
              ))}
            </div>
          ) : null}
        </section>

        <section className="card">
          <h2>Share this fit</h2>
          <p style={{ color: 'var(--muted)' }}>
            Copy the link below and send it to a customer or teammate.
          </p>
          <ShareButton />
        </section>
      </div>
    );
  } catch (error) {
    return (
      <div className="card">
        <h1>Supabase configuration missing</h1>
        <p style={{ color: 'var(--muted)' }}>
          Set the environment variables and try again.
        </p>
      </div>
    );
  }
}
