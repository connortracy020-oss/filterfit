import { createCaseAction } from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireOrgSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function NewCasePage() {
  const { org } = await requireOrgSession();

  const vendors = await prisma.vendor.findMany({
    where: { orgId: org.id },
    include: { templates: true },
    orderBy: { name: "asc" }
  });

  return (
    <div className="max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Create case</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createCaseAction} className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="vendorId">Vendor</Label>
              <select id="vendorId" name="vendorId" required className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Select vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="templateId">Template (optional)</Label>
              <select id="templateId" name="templateId" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">No template</option>
                {vendors.flatMap((vendor) =>
                  vendor.templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {vendor.name} - {template.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <Label htmlFor="receiptId">Receipt ID</Label>
              <Input id="receiptId" name="receiptId" />
            </div>
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" name="sku" />
            </div>

            <div>
              <Label htmlFor="brand">Brand</Label>
              <Input id="brand" name="brand" />
            </div>
            <div>
              <Label htmlFor="model">Model</Label>
              <Input id="model" name="model" />
            </div>

            <div>
              <Label htmlFor="serialNumber">Serial number</Label>
              <Input id="serialNumber" name="serialNumber" />
            </div>
            <div>
              <Label htmlFor="qty">Quantity</Label>
              <Input id="qty" name="qty" type="number" min={1} defaultValue={1} />
            </div>

            <div>
              <Label htmlFor="unitCost">Unit cost</Label>
              <Input id="unitCost" name="unitCost" type="number" step="0.01" />
            </div>
            <div>
              <Label htmlFor="expectedCredit">Expected credit</Label>
              <Input id="expectedCredit" name="expectedCredit" type="number" step="0.01" />
            </div>

            <div>
              <Label htmlFor="purchaseDate">Purchase date</Label>
              <Input id="purchaseDate" name="purchaseDate" type="date" />
            </div>
            <div>
              <Label htmlFor="returnDate">Return date</Label>
              <Input id="returnDate" name="returnDate" type="date" />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="customerReturnReason">Return reason</Label>
              <Textarea id="customerReturnReason" name="customerReturnReason" />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="internalNotes">Internal notes</Label>
              <Textarea id="internalNotes" name="internalNotes" />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Create case</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
