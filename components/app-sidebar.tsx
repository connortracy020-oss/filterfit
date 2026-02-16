import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

const links = [
  { href: "/app/dashboard", label: "Dashboard" },
  { href: "/app/cases", label: "Cases" },
  { href: "/app/import", label: "Import" },
  { href: "/app/vendors", label: "Vendors" },
  { href: "/app/reports", label: "Reports" },
  { href: "/app/settings", label: "Settings" }
];

export function AppSidebar({ orgName }: { orgName: string }) {
  return (
    <aside className="w-full border-b bg-white p-4 md:w-64 md:border-b-0 md:border-r md:min-h-screen">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">VendorCredit Radar</p>
      <h1 className="mt-1 text-lg font-semibold text-slate-900">{orgName}</h1>
      <nav className="mt-6 flex flex-col gap-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-md px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="mt-6">
        <SignOutButton />
      </div>
    </aside>
  );
}
