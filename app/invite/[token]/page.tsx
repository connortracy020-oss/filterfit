import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptInvite } from "@/lib/auth/invite";

export default async function InvitePage({ params }: { params: { token: string } }) {
  const invite = await prisma.inviteToken.findUnique({ where: { token: params.token } });

  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    notFound();
  }

  async function accept(formData: FormData) {
    "use server";

    await acceptInvite({
      token: params.token,
      name: String(formData.get("name") ?? ""),
      password: String(formData.get("password") ?? "")
    });

    redirect("/auth/login?registered=1");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accept invite</CardTitle>
          <CardDescription>
            Join as <strong>{invite.role}</strong> with <strong>{invite.email}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={accept} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" minLength={8} required />
            </div>
            <Button type="submit" className="w-full">
              Join organization
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
