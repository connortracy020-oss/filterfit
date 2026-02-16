"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-semibold">Something went wrong</h1>
      <p className="mt-3 text-sm text-muted-foreground">{error.message}</p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
