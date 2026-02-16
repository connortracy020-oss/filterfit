import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authOptions } from "@/lib/auth/options";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.id && session.user.orgId) {
    redirect("/app/dashboard");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-emerald-50">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <header className="flex items-center justify-between">
          <p className="text-lg font-semibold tracking-tight">VendorCredit Radar</p>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/pricing">Pricing</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/login">Login</Link>
            <Button asChild>
              <Link href="/signup">Start Trial</Link>
            </Button>
          </nav>
        </header>

        <section className="mt-20 grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <h1 className="text-4xl font-bold leading-tight text-slate-900 md:text-5xl">
              Recover vendor warranty credits before they expire.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-slate-600">
              VendorCredit Radar helps hardware, auto parts, and appliance parts retailers track returned/defective
              items, build claim packets, and close the loop on credits.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/signup">Start 3-day free trial</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/pricing">See pricing</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">What you get</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              <li>Multi-store team workflows with role-based access</li>
              <li>Vendor-specific checklists and due dates</li>
              <li>Evidence uploads with secure, time-limited links</li>
              <li>CSV imports with duplicate handling</li>
              <li>Recovery analytics and claim packet PDFs</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
