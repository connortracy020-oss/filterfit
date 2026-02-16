import { ImportJobStatus } from "@prisma/client";
import {
  confirmImportAction,
  saveImportMappingAction,
  uploadImportCsvAction
} from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOrgSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function ImportPage({
  searchParams
}: {
  searchParams: { jobId?: string; stage?: string };
}) {
  const { org } = await requireOrgSession();

  const job = searchParams.jobId
    ? await prisma.importJob.findFirst({
        where: {
          id: searchParams.jobId,
          orgId: org.id
        },
        include: {
          rows: {
            take: 25,
            orderBy: {
              createdAt: "asc"
            }
          }
        }
      })
    : null;

  const previewRows = (job?.previewRows as Array<Record<string, string>> | null) ?? [];
  const headers = previewRows.length > 0 ? Object.keys(previewRows[0] ?? {}) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">CSV Import Wizard</h1>
        <Button asChild variant="outline">
          <a href="/api/import/template">Download sample CSV</a>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Step 1: Upload CSV (max 20MB)</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={uploadImportCsvAction} className="flex flex-wrap items-center gap-3">
            <input type="file" name="csv" accept="text/csv,.csv" required className="block text-sm" />
            <Button type="submit">Upload</Button>
          </form>
        </CardContent>
      </Card>

      {job ? (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Preview rows ({previewRows.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b">
                    {headers.map((header) => (
                      <th key={header} className="px-2 py-2 font-medium text-muted-foreground">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b">
                      {headers.map((header) => (
                        <td key={`${rowIndex}-${header}`} className="px-2 py-2">
                          {row[header]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {job ? (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Map columns</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={saveImportMappingAction} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="importJobId" value={job.id} />
              <div>
                <label className="mb-1 block text-sm font-medium">Dedupe mode</label>
                <select name="dedupeMode" className="h-10 w-full rounded-md border border-input px-3 text-sm">
                  <option value="SKIP">Skip duplicates</option>
                  <option value="UPDATE">Update duplicates</option>
                </select>
              </div>

              {[
                ["sku", "SKU"],
                ["description", "Description"],
                ["returnReason", "Return reason"],
                ["unitCost", "Unit cost"],
                ["qty", "Quantity"],
                ["vendor", "Vendor"],
                ["brand", "Brand"],
                ["returnDate", "Return date"],
                ["receiptId", "Receipt ID"],
                ["serialNumber", "Serial number"],
                ["expectedCredit", "Expected credit"]
              ].map(([name, label]) => (
                <div key={name}>
                  <label className="mb-1 block text-sm font-medium">{label}</label>
                  <select name={name} className="h-10 w-full rounded-md border border-input px-3 text-sm">
                    <option value="">Not mapped</option>
                    {headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              <div className="md:col-span-2">
                <Button type="submit">Save mapping</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {job && (searchParams.stage === "confirm" || job.status === ImportJobStatus.READY || job.status === ImportJobStatus.COMPLETED) ? (
        <Card>
          <CardHeader>
            <CardTitle>Step 4/5: Confirm import and create cases</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Rows in job: {job.rows.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">Current status: {job.status}</p>
            <form action={confirmImportAction} className="mt-4">
              <input type="hidden" name="importJobId" value={job.id} />
              <Button type="submit">Run import</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
