import { notFound } from "next/navigation";
import { CaseStatus } from "@prisma/client";
import { updateCaseDetailsAction, updateCaseStatusAction, toggleChecklistItemAction } from "@/app/app/actions";
import { CaseStatusPill } from "@/components/case-status-pill";
import { EvidenceUploader } from "@/components/evidence-uploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { requireOrgSession } from "@/lib/auth/session";
import { decimalToNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { toCurrency, toDateLabel } from "@/lib/utils";

function StatusAction({ caseId, status, label }: { caseId: string; status: CaseStatus; label: string }) {
  return (
    <form action={updateCaseStatusAction}>
      <input type="hidden" name="caseId" value={caseId} />
      <input type="hidden" name="status" value={status} />
      <Button type="submit" variant="outline">
        {label}
      </Button>
    </form>
  );
}

export default async function CaseDetailPage({ params }: { params: { id: string } }) {
  const { org } = await requireOrgSession();

  const item = await prisma.case.findFirst({
    where: {
      id: params.id,
      orgId: org.id
    },
    include: {
      vendor: true,
      template: true,
      assignedTo: true,
      checklist: {
        orderBy: {
          createdAt: "asc"
        }
      },
      evidenceFiles: {
        orderBy: {
          createdAt: "desc"
        }
      },
      events: {
        orderBy: {
          createdAt: "desc"
        },
        include: {
          actor: true
        }
      }
    }
  });

  if (!item) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>{item.vendor.name}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Case ID: {item.id}</p>
            </div>
            <CaseStatusPill status={item.status} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-5">
            <div>
              <p className="text-muted-foreground">Expected credit</p>
              <p className="font-semibold">{toCurrency(decimalToNumber(item.expectedCredit))}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Actual credit</p>
              <p className="font-semibold">{toCurrency(decimalToNumber(item.actualCredit))}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Due date</p>
              <p className="font-semibold">{toDateLabel(item.dueDate)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Assigned to</p>
              <p className="font-semibold">{item.assignedTo?.name ?? "Unassigned"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Return date</p>
              <p className="font-semibold">{toDateLabel(item.returnDate)}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild>
              <a href={`/api/cases/${item.id}/packet`} target="_blank" rel="noreferrer">
                Generate Claim Packet PDF
              </a>
            </Button>
            <StatusAction caseId={item.id} status={CaseStatus.READY_TO_SUBMIT} label="Mark Ready to Submit" />
            <StatusAction caseId={item.id} status={CaseStatus.SUBMITTED} label="Mark Submitted" />
            <StatusAction caseId={item.id} status={CaseStatus.APPROVED} label="Mark Approved" />
            <StatusAction caseId={item.id} status={CaseStatus.DENIED} label="Mark Denied" />
            <StatusAction caseId={item.id} status={CaseStatus.CREDIT_RECEIVED} label="Mark Credit Received" />
            <StatusAction caseId={item.id} status={CaseStatus.CLOSED} label="Close" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Case details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateCaseDetailsAction} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="caseId" value={item.id} />
            <input type="hidden" name="vendorId" value={item.vendorId} />
            <input type="hidden" name="templateId" value={item.templateId ?? ""} />

            <div>
              <Label htmlFor="receiptId">Receipt ID</Label>
              <Input id="receiptId" name="receiptId" defaultValue={item.receiptId ?? ""} />
            </div>
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" name="sku" defaultValue={item.sku ?? ""} />
            </div>
            <div>
              <Label htmlFor="serialNumber">Serial number</Label>
              <Input id="serialNumber" name="serialNumber" defaultValue={item.serialNumber ?? ""} />
            </div>
            <div>
              <Label htmlFor="qty">Qty</Label>
              <Input id="qty" name="qty" type="number" min={1} defaultValue={item.qty} />
            </div>
            <div>
              <Label htmlFor="unitCost">Unit cost</Label>
              <Input id="unitCost" name="unitCost" type="number" step="0.01" defaultValue={decimalToNumber(item.unitCost)} />
            </div>
            <div>
              <Label htmlFor="expectedCredit">Expected credit</Label>
              <Input
                id="expectedCredit"
                name="expectedCredit"
                type="number"
                step="0.01"
                defaultValue={decimalToNumber(item.expectedCredit)}
              />
            </div>
            <div>
              <Label htmlFor="actualCredit">Actual credit</Label>
              <Input id="actualCredit" name="actualCredit" type="number" step="0.01" defaultValue={decimalToNumber(item.actualCredit)} />
            </div>
            <div>
              <Label htmlFor="returnDate">Return date</Label>
              <Input
                id="returnDate"
                name="returnDate"
                type="date"
                defaultValue={item.returnDate ? item.returnDate.toISOString().slice(0, 10) : ""}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="customerReturnReason">Return reason</Label>
              <Textarea id="customerReturnReason" name="customerReturnReason" defaultValue={item.customerReturnReason ?? ""} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="internalNotes">Internal notes</Label>
              <Textarea id="internalNotes" name="internalNotes" defaultValue={item.internalNotes ?? ""} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Save changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Tabs defaultValue="checklist">
        <TabsList>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="checklist">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {item.checklist.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No template checklist on this case.</p>
                ) : null}
                {item.checklist.map((step) => (
                  <div key={step.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{step.title}</p>
                      <p className="text-xs text-muted-foreground">{step.description || "No description"}</p>
                    </div>
                    <form action={toggleChecklistItemAction}>
                      <input type="hidden" name="caseId" value={item.id} />
                      <input type="hidden" name="itemId" value={step.id} />
                      <input type="hidden" name="completed" value={String(!step.completedAt)} />
                      <Button type="submit" variant={step.completedAt ? "outline" : "secondary"}>
                        {step.completedAt ? "Mark incomplete" : "Mark complete"}
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evidence">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <EvidenceUploader caseId={item.id} />
              <div className="space-y-2">
                {item.evidenceFiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No evidence uploaded yet.</p>
                ) : null}
                {item.evidenceFiles.map((file) => (
                  <div key={file.id} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">{file.filename}</p>
                    <p className="text-muted-foreground">
                      {file.type} · {(file.size / 1024).toFixed(1)} KB · {toDateLabel(file.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {item.events.map((event) => (
                  <div key={event.id} className="rounded-lg border p-3">
                    <p className="text-sm font-medium">{event.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {toDateLabel(event.createdAt)} · {event.actor?.name ?? event.actor?.email ?? "System"}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
