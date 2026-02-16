import { AuthEmailForm } from "@/components/auth-email-form";
import { env } from "@/lib/env";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <AuthEmailForm mode="signup" hasGoogle={Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)} />
    </main>
  );
}
