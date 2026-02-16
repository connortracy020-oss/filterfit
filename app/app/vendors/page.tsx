import Link from "next/link";
import { MembershipRole } from "@prisma/client";
import { createVendorAction } from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireOrgSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function VendorsPage() {
  const { org, membership } = await requireOrgSession();

  const vendors = await prisma.vendor.findMany({
    where: { orgId: org.id },
    include: {
      templates: true,
      cases: {
        select: {
          id: true
        }
      }
    },
    orderBy: { name: "asc" }
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Vendors</h1>

      {membership.role === MembershipRole.ADMIN ? (
        <Card>
          <CardHeader>
            <CardTitle>Add vendor</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createVendorAction} className="grid gap-3 md:grid-cols-2">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div>
                <Label htmlFor="contactEmail">Contact email</Label>
                <Input id="contactEmail" name="contactEmail" type="email" />
              </div>
              <div>
                <Label htmlFor="portalUrl">Portal URL</Label>
                <Input id="portalUrl" name="portalUrl" type="url" />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" />
              </div>
              <div className="md:col-span-2">
                <Button type="submit">Create vendor</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {vendors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No vendors yet.</p>
        ) : null}
        {vendors.map((vendor) => (
          <Card key={vendor.id}>
            <CardHeader>
              <CardTitle>{vendor.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Templates: {vendor.templates.length}</p>
              <p className="text-sm text-muted-foreground">Cases: {vendor.cases.length}</p>
              <Button className="mt-4" asChild variant="outline">
                <Link href={`/app/vendors/${vendor.id}`}>Manage templates</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
