import { AuthEmailForm } from "@/components/auth-email-form";
import { env } from "@/lib/env";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <AuthEmailForm mode="login" hasGoogle={Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)} />
    </main>
  );
}
