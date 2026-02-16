"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AuthEmailFormProps {
  mode: "login" | "signup";
  hasGoogle: boolean;
}

export function AuthEmailForm({ mode, hasGoogle }: AuthEmailFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setSent(false);

    const callbackUrl = mode === "signup" ? "/onboarding" : "/app/dashboard";
    const result = await signIn("email", {
      email,
      redirect: false,
      callbackUrl
    });

    if (result?.error) {
      toast.error(result.error);
      setLoading(false);
      return;
    }

    toast.success("Magic link sent. Check your inbox.");
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">
        {mode === "signup" ? "Create your account" : "Sign in"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {mode === "signup"
          ? "Start your 3-day trial. We will email a secure sign-in link."
          : "We will email you a secure sign-in link."}
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleEmailSubmit}>
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            placeholder="owner@yourstore.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? "Sending..." : "Send magic link"}
        </Button>
      </form>

      {hasGoogle ? (
        <Button
          variant="outline"
          className="mt-3 w-full"
          onClick={() => {
            void signIn("google", { callbackUrl: mode === "signup" ? "/onboarding" : "/app/dashboard" });
          }}
        >
          Continue with Google
        </Button>
      ) : null}

      <p className="mt-6 text-sm text-muted-foreground">
        {mode === "signup" ? "Already have an account? " : "Need an account? "}
        <Link className="font-medium text-primary hover:underline" href={mode === "signup" ? "/login" : "/signup"}>
          {mode === "signup" ? "Sign in" : "Sign up"}
        </Link>
      </p>

      {sent ? (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          Magic link sent to {email}. For local development, links are also saved in
          <code className="ml-1 rounded bg-emerald-100 px-1 py-0.5">.tmp/magic-links</code>.
        </p>
      ) : null}
    </div>
  );
}
