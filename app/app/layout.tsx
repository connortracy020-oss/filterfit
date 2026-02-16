import { AppSidebar } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import { requireOrgSession } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { org, subscription } = await requireOrgSession();

  return (
    <div className="min-h-screen md:flex">
      <AppSidebar orgName={org.name} />
      <div className="flex-1">
        <header className="border-b bg-white px-6 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted-foreground">Organization timezone: {org.timezone}</p>
            <Badge variant="outline">Billing: {subscription?.status ?? "incomplete"}</Badge>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
