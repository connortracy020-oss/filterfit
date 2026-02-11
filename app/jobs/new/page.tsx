import { JobStatus } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createJobAction } from "@/app/jobs/actions";

const statuses = Object.values(JobStatus) as JobStatus[];

export default function NewJobPage() {
  return (
    <AppShell>
      <Card>
        <CardHeader>
          <CardTitle>Create job</CardTitle>
          <CardDescription>Track permit and inspection progress from day one.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createJobAction} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer name</Label>
              <Input id="customerName" name="customerName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteAddress">Site address</Label>
              <Input id="siteAddress" name="siteAddress" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="county">County</Label>
              <Input id="county" name="county" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" name="state" defaultValue="WA" maxLength={2} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP</Label>
              <Input id="zip" name="zip" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="utility">Utility</Label>
              <Input id="utility" name="utility" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="systemSizeKw">System size (kW)</Label>
              <Input id="systemSizeKw" name="systemSizeKw" type="number" min={0.1} step={0.1} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select id="status" name="status" defaultValue={JobStatus.LEAD} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTargetDate">Target start date</Label>
              <Input id="startTargetDate" name="startTargetDate" type="date" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Create job</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AppShell>
  );
}
