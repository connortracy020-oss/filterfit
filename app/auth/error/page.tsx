import Link from "next/link";

export default function AuthErrorPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">Authentication error</h1>
      <p className="text-sm text-muted-foreground">{searchParams.error ?? "Unable to complete sign-in."}</p>
      <Link href="/login" className="text-sm font-medium text-primary">
        Return to login
      </Link>
    </main>
  );
}
