import Link from 'next/link';
import type { CSSProperties } from 'react';
import { getUserAndAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import FilterFields from '@/components/FilterFields';
import ConfirmButton from '@/components/ConfirmButton';
import { addAlias, deleteAlias, updateFilter } from '../../actions';

const aliasInputStyle: CSSProperties = { maxWidth: '320px' };

type SearchParams = Record<string, string | string[] | undefined>;

function getParam(searchParams: SearchParams, key: string) {
  const value = searchParams[key];
  return typeof value === 'string' ? value : '';
}

export default async function EditFilterPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams: SearchParams;
}) {
  const auth = await getUserAndAdmin();
  const status = getParam(searchParams, 'status');
  const message = getParam(searchParams, 'message');

  if (auth.error?.includes('Missing Supabase')) {
    return (
      <div className="card">
        <h1>Supabase not configured</h1>
        <p style={{ color: 'var(--muted)' }}>
          Set the Supabase environment variables to access the admin dashboard.
        </p>
      </div>
    );
  }

  if (!auth.user) {
    return (
      <div className="card">
        <h1>Admin login required</h1>
        <Link href="/login" className="button">
          Go to login
        </Link>
      </div>
    );
  }

  if (!auth.isAdmin) {
    return (
      <div className="card">
        <h1>Not authorized</h1>
        <p style={{ color: 'var(--muted)' }}>You do not have admin access.</p>
      </div>
    );
  }

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
          <Link href="/admin" className="button secondary">
            Back to dashboard
          </Link>
        </div>
      );
    }

    const { data: aliases } = await supabase
      .from('aliases')
      .select('*')
      .eq('filter_id', filter.id)
      .order('alias');

    return (
      <div className="grid" style={{ gap: '16px' }}>
        <Link href="/admin" className="button secondary">
          Back to dashboard
        </Link>

        {message ? (
          <div className={`notice ${status === 'error' ? 'error' : 'success'}`}>{message}</div>
        ) : null}

        <section className="card">
          <h1>Edit filter</h1>
          <form action={updateFilter} className="grid" style={{ marginTop: '16px', gap: '16px' }}>
            <input type="hidden" name="id" value={filter.id} />
            <FilterFields defaults={filter} />
            <button type="submit">Save changes</button>
          </form>
        </section>

        <section className="card">
          <h2>Aliases</h2>
          <p style={{ color: 'var(--muted)' }}>
            Add alternate part numbers or alternate naming for this filter.
          </p>
          <form action={addAlias} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
            <input type="hidden" name="filter_id" value={filter.id} />
            <input name="alias" placeholder="Alias" style={aliasInputStyle} />
            <button type="submit">Add alias</button>
          </form>

          <div style={{ marginTop: '16px', display: 'grid', gap: '8px' }}>
            {aliases?.length ? (
              aliases.map((alias) => (
                <div key={alias.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <span className="tag">{alias.alias}</span>
                  <form action={deleteAlias}>
                    <input type="hidden" name="alias_id" value={alias.id} />
                    <input type="hidden" name="filter_id" value={filter.id} />
                    <ConfirmButton label="Remove" message="Remove this alias?" className="button ghost" />
                  </form>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--muted)' }}>No aliases yet.</p>
            )}
          </div>
        </section>
      </div>
    );
  } catch (error) {
    return (
      <div className="card">
        <h1>Supabase not configured</h1>
        <p style={{ color: 'var(--muted)' }}>
          Set the Supabase environment variables to access the admin dashboard.
        </p>
      </div>
    );
  }
}
