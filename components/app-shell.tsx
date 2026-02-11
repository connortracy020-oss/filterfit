import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/login");
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.user.orgId },
    select: { name: true }
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="container flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="text-xs uppercase text-muted-foreground">SolarOps Lite</p>
            <h1 className="text-lg font-semibold">{org?.name ?? "Organization"}</h1>
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <Link className="rounded-md px-3 py-2 hover:bg-slate-100" href="/dashboard">
              Dashboard
            </Link>
            <Link className="rounded-md px-3 py-2 hover:bg-slate-100" href="/today">
              Today
            </Link>
            <Link className="rounded-md px-3 py-2 hover:bg-slate-100" href="/jobs/new">
              New Job
            </Link>
            <Link className="rounded-md px-3 py-2 hover:bg-slate-100" href="/settings/users">
              Settings
            </Link>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="container py-6">{children}</main>
    </div>
  );
}
