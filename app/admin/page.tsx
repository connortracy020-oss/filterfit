import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getUserAndAdmin } from '@/lib/auth';
import { formatSize } from '@/lib/format';
import ConfirmButton from '@/components/ConfirmButton';
import { deleteFilter } from './actions';

const PAGE_SIZE = 20;

type SearchParams = Record<string, string | string[] | undefined>;

function getParam(searchParams: SearchParams, key: string) {
  const value = searchParams[key];
  return typeof value === 'string' ? value : '';
}

export default async function AdminPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const status = getParam(searchParams, 'status');
  const message = getParam(searchParams, 'message');

  const auth = await getUserAndAdmin();

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
      <div className="grid" style={{ gap: '16px' }}>
        <div className="card">
          <h1>Admin dashboard</h1>
          <p style={{ color: 'var(--muted)' }}>
            Log in with your admin account to manage filters.
          </p>
          <Link href="/login" className="button">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  if (!auth.isAdmin) {
    return (
      <div className="card">
        <h1>Not authorized</h1>
        <p style={{ color: 'var(--muted)' }}>
          Your account does not have admin access.
        </p>
      </div>
    );
  }

  try {
    const supabase = createSupabaseServerClient();
    const page = Math.max(Number.parseInt(getParam(searchParams, 'page'), 10) || 1, 1);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data: filters, count } = await supabase
      .from('filters')
      .select('*', { count: 'exact' })
      .order('brand', { ascending: true })
      .order('product_name', { ascending: true })
      .range(from, to);

    const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1;

    return (
      <div className="grid" style={{ gap: '18px' }}>
        <section className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1>Admin dashboard</h1>
            <p style={{ color: 'var(--muted)' }}>Manage filters and aliases.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link href="/admin/new" className="button">
              Add filter
            </Link>
            <Link href="/admin/import" className="button secondary">
              Import CSV
            </Link>
          </div>
        </section>

        {message ? (
          <div className={`notice ${status === 'error' ? 'error' : 'success'}`}>{message}</div>
        ) : null}

        <section className="card">
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
            <thead>
              <tr>
                <th>Size</th>
                <th>Product</th>
                <th>SKU</th>
                <th>MERV</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filters?.map((filter) => (
                <tr key={filter.id}>
                  <td>{formatSize(filter.nominal_w, filter.nominal_h, filter.thickness)}</td>
                  <td>
                    <strong>{filter.product_name}</strong>
                    <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{filter.brand}</div>
                  </td>
                  <td>{filter.sku}</td>
                  <td>{filter.merv ?? '—'}</td>
                  <td style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <Link href={`/admin/edit/${filter.id}`} className="button secondary">
                      Edit
                    </Link>
                    <form action={deleteFilter}>
                      <input type="hidden" name="id" value={filter.id} />
                      <ConfirmButton label="Delete" message="Delete this filter?" className="button ghost" />
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
          {!filters?.length ? (
            <p style={{ color: 'var(--muted)', marginTop: '12px' }}>
              No filters yet. Add one to get started.
            </p>
          ) : null}
        </section>

        {totalPages > 1 ? (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link
              href={`/admin?page=${Math.max(page - 1, 1)}`}
              className="button secondary"
            >
              Previous
            </Link>
            <span className="tag">
              Page {page} of {totalPages}
            </span>
            <Link
              href={`/admin?page=${Math.min(page + 1, totalPages)}`}
              className="button secondary"
            >
              Next
            </Link>
          </div>
        ) : null}
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
