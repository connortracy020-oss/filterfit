import { UserRole } from "@prisma/client";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { canManageUsers } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { inviteUserAction, updateUserRoleAction } from "@/app/settings/actions";

const roleOptions = Object.values(UserRole) as UserRole[];

export default async function UsersSettingsPage() {
  const session = await requireSession();
  const users = await prisma.user.findMany({
    where: {
      orgId: session.user.orgId
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  const invites = await prisma.inviteToken.findMany({
    where: {
      orgId: session.user.orgId,
      acceptedAt: null,
      expiresAt: { gte: new Date() }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  const canManage = canManageUsers(session.user.role);
  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">User Settings</h2>
            <p className="text-sm text-muted-foreground">Invite users and assign organization roles.</p>
          </div>
          <Link className="text-sm text-primary" href="/settings/reminders">
            Reminder rules
          </Link>
        </div>

        {canManage ? (
          <Card>
            <CardHeader>
              <CardTitle>Invite user</CardTitle>
              <CardDescription>Invite with email and role. Link expires in 7 days.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={inviteUserAction} className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <select id="role" name="role" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Button type="submit">Send invite</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>{user.createdAt.toLocaleDateString()}</TableCell>
                    <TableCell>
                      {canManage ? (
                        <form action={updateUserRoleAction} className="flex items-center gap-2">
                          <input type="hidden" name="userId" value={user.id} />
                          <select name="role" defaultValue={user.role} className="h-9 rounded-md border border-input px-2 text-sm">
                            {roleOptions.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                          <Button type="submit" size="sm" variant="outline">
                            Save
                          </Button>
                        </form>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending invites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {invites.length === 0 ? <p className="text-sm text-muted-foreground">No pending invites.</p> : null}
            {invites.map((invite) => (
              <div key={invite.id} className="rounded-md border p-3 text-sm">
                <p>
                  {invite.email} ({invite.role})
                </p>
                <p className="text-muted-foreground">{appUrl}/invite/{invite.token}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
