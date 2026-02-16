"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EvidenceType } from "@prisma/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const evidenceTypes = Object.values(EvidenceType);

export function EvidenceUploader({ caseId }: { caseId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<EvidenceType>(EvidenceType.PHOTO);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function upload() {
    if (!file) {
      toast.error("Select a file first");
      return;
    }

    setLoading(true);

    try {
      const presignResponse = await fetch("/api/storage/presign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          caseId,
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          type
        })
      });

      if (!presignResponse.ok) {
        throw new Error("Unable to prepare upload");
      }

      const presignPayload = (await presignResponse.json()) as { uploadUrl: string; key: string };

      const uploadResponse = await fetch(presignPayload.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream"
        },
        body: file
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      const completeResponse = await fetch("/api/storage/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          caseId,
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          type,
          key: presignPayload.key
        })
      });

      if (!completeResponse.ok) {
        throw new Error("Unable to save evidence metadata");
      }

      toast.success("Evidence uploaded");
      setFile(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm font-medium">Upload evidence</p>
      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_180px_auto] md:items-center">
        <Input
          type="file"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
          }}
        />
        <select
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={type}
          onChange={(event) => setType(event.target.value as EvidenceType)}
        >
          {evidenceTypes.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>
        <Button onClick={upload} disabled={loading}>
          {loading ? "Uploading..." : "Upload"}
        </Button>
      </div>
    </div>
  );
}
