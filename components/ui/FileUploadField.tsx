"use client";

import { useId, useRef, useState } from "react";
import { FileText, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { apiJson } from "@/lib/authClient";

type UploadResponse = { url: string; fileType?: string };

/**
 * A real file picker that uploads immediately on selection and shows a preview straight away —
 * a local `URL.createObjectURL` preview while the request is in flight, then the real uploaded
 * URL once it resolves. Used anywhere a model field is "paste a URL" backed by an actual file
 * (course/lesson thumbnails, resources, assignment submissions) instead of a plain text input.
 */
export function FileUploadField({
  label,
  endpoint,
  accept,
  value,
  onUploaded,
  kind = "image",
}: {
  label?: string;
  endpoint: string;
  accept: string;
  value: string | null;
  onUploaded: (url: string, fileType?: string) => void;
  kind?: "image" | "file";
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const localPreviewUrl = URL.createObjectURL(file);
    setPreview(localPreviewUrl);
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    const result = await apiJson<UploadResponse>(endpoint, { method: "POST", body: formData });

    setUploading(false);
    URL.revokeObjectURL(localPreviewUrl);
    setPreview(null);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    onUploaded(result.data.url, result.data.fileType);
    if (inputRef.current) inputRef.current.value = "";
  }

  const displayUrl = preview ?? value;

  return (
    <div>
      {label && (
        <label className="text-sm font-medium text-text-secondary" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className="mt-1 flex items-center gap-3">
        {kind === "image" ? (
          displayUrl ? (
            <img
              src={displayUrl}
              alt=""
              className="w-16 h-16 rounded-md object-cover border border-border shrink-0"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          ) : (
            <div className="w-16 h-16 rounded-md bg-surface-secondary border border-border flex items-center justify-center text-text-muted shrink-0">
              <UploadCloud size={18} />
            </div>
          )
        ) : displayUrl ? (
          <span className="flex items-center gap-1.5 text-xs text-text-secondary bg-surface-secondary border border-border rounded-md px-2.5 py-2 shrink-0">
            <FileText size={14} />
            File attached
          </span>
        ) : null}

        <div>
          <input ref={inputRef} id={inputId} type="file" accept={accept} onChange={handleChange} className="hidden" />
          <Button variant="secondary" onClick={() => inputRef.current?.click()} disabled={uploading} className="px-3 py-1.5 text-xs">
            {uploading ? "Uploading…" : displayUrl ? "Replace file" : "Upload file"}
          </Button>
        </div>
      </div>
      {error && <p className="text-xs text-error mt-1.5">{error}</p>}
    </div>
  );
}
