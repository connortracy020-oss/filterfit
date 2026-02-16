import { MembershipRole } from "@prisma/client";
import { notFound } from "next/navigation";
import { saveVendorTemplateAction } from "@/app/app/actions";
import { TemplateEditor } from "@/components/template-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOrgSession } from "@/lib/auth/session";
import { parseTemplateSteps } from "@/lib/vendors/template";
import { prisma } from "@/lib/prisma";

export default async function VendorDetailPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams: { templateId?: string };
}) {
  const { org, membership } = await requireOrgSession();

  const vendor = await prisma.vendor.findFirst({
    where: {
      id: params.id,
      orgId: org.id
    },
    include: {
      templates: {
        orderBy: {
          createdAt: "desc"
        }
      }
    }
  });

  if (!vendor) {
    notFound();
  }

  const selectedTemplate =
    vendor.templates.find((template) => template.id === searchParams.templateId) ?? vendor.templates[0] ?? null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{vendor.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Edit vendor templates and checklist requirements.</p>
        </CardContent>
      </Card>

      {membership.role === MembershipRole.ADMIN ? (
        <TemplateEditor
          action={saveVendorTemplateAction}
          vendorId={vendor.id}
          templateId={selectedTemplate?.id}
          initialName={selectedTemplate?.name ?? "Default template"}
          initialSlaDays={selectedTemplate?.slaDays ?? 14}
          initialRequiredFields={
            Array.isArray(selectedTemplate?.requiredFields)
              ? selectedTemplate?.requiredFields.map(String)
              : ["serialNumber", "receipt", "photo"]
          }
          initialSteps={selectedTemplate ? parseTemplateSteps(selectedTemplate.steps) : undefined}
        />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Only admins can edit templates.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Existing templates</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {vendor.templates.length === 0 ? <li className="text-muted-foreground">No templates yet.</li> : null}
            {vendor.templates.map((template) => (
              <li key={template.id}>
                <a href={`/app/vendors/${vendor.id}?templateId=${template.id}`} className="font-medium text-primary hover:underline">
                  {template.name}
                </a>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
