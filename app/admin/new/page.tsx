import Link from 'next/link';
import { getUserAndAdmin } from '@/lib/auth';
import FilterFields from '@/components/FilterFields';
import { createFilter } from '../actions';

type SearchParams = Record<string, string | string[] | undefined>;

function getParam(searchParams: SearchParams, key: string) {
  const value = searchParams[key];
  return typeof value === 'string' ? value : '';
}

export default async function NewFilterPage({
  searchParams
}: {
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

  return (
    <div className="grid" style={{ gap: '16px' }}>
      <Link href="/admin" className="button secondary">
        Back to dashboard
      </Link>
      <div className="card">
        <h1>Add a new filter</h1>
        <form action={createFilter} className="grid" style={{ marginTop: '16px', gap: '16px' }}>
          <FilterFields />
          <button type="submit">Create filter</button>
        </form>
      </div>
      {message ? (
        <div className={`notice ${status === 'error' ? 'error' : 'success'}`}>{message}</div>
      ) : null}
    </div>
  );
}
