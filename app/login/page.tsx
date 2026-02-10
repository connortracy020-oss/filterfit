import Link from 'next/link';
import { login } from './actions';

type SearchParams = Record<string, string | string[] | undefined>;

function getParam(searchParams: SearchParams, key: string) {
  const value = searchParams[key];
  return typeof value === 'string' ? value : '';
}

export default function LoginPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const status = getParam(searchParams, 'status');
  const message = getParam(searchParams, 'message');

  return (
    <div className="grid" style={{ gap: '16px' }}>
      <div className="card">
        <h1>Admin login</h1>
        <p style={{ color: 'var(--muted)' }}>
          Sign in with your Supabase email + password.
        </p>
        <form action={login} className="grid" style={{ marginTop: '16px' }}>
          <div>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required />
          </div>
          <button type="submit">Log in</button>
        </form>
      </div>

      {message ? (
        <div className={`notice ${status === 'error' ? 'error' : 'success'}`}>{message}</div>
      ) : null}

      <Link href="/" className="button secondary">
        Back to search
      </Link>
    </div>
  );
}
