"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function ToastListener() {
  const params = useSearchParams();

  useEffect(() => {
    const success = params.get("success");
    const error = params.get("error");

    if (success) {
      toast.success(success);
    }

    if (error) {
      toast.error(error);
    }
  }, [params]);

  return null;
}
