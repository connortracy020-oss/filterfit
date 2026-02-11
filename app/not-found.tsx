import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md rounded-lg border bg-white p-6">
        <h1 className="text-lg font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">The resource you requested does not exist or you do not have access.</p>
        <Link className="mt-4 inline-block text-primary" href="/dashboard">
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
