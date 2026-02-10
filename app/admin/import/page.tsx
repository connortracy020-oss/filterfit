import Link from 'next/link';
import { getUserAndAdmin } from '@/lib/auth';
import ImportForm from '@/components/ImportForm';

export default async function ImportPage() {
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
      <section className="card">
        <h1>CSV import</h1>
        <p style={{ color: 'var(--muted)' }}>
          Upload a CSV with columns: brand, series, nominal_w, nominal_h, thickness, merv, sku,
          upc, product_name, url, notes. Only brand, sku, product_name, and size fields are required.
        </p>
        <ImportForm />
      </section>
    </div>
  );
}
