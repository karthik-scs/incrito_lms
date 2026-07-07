"use client";

import { useEffect, useState } from "react";
import { HardDrive, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { apiJson } from "@/lib/authClient";

type FileUpload = {
  id: string;
  s3Key: string;
  sizeBytes: number;
  context: string;
  createdAt: string;
};

type UsageData = {
  usedBytes: number;
  limitMb: number;
  files: FileUpload[];
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const CONTEXT_LABEL: Record<string, string> = {
  CHAT: "Chat",
  DISCUSSION: "Discussion",
  COMMUNITY: "Community",
};

export function MyStorageTab() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await apiJson<UsageData>("/api/storage/me");
    if (res.ok) setData(res.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function del(id: string) {
    if (!window.confirm("Delete this file permanently? This cannot be undone.")) return;
    await apiJson(`/api/storage/me/files/${id}`, { method: "DELETE" });
    await load();
  }

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-6">
        <p className="text-sm text-text-muted">Loading storage usage…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-6">
        <p className="text-sm text-text-muted">Could not load storage data.</p>
      </div>
    );
  }

  const limitBytes = data.limitMb * 1024 * 1024;
  const pct = Math.min(100, Math.round((data.usedBytes / limitBytes) * 100));
  const barColor = pct >= 90 ? "bg-error" : pct >= 70 ? "bg-warning" : "bg-accent";

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent-light text-accent shrink-0">
          <HardDrive size={18} />
        </span>
        <div>
          <h2 className="text-base font-semibold text-text-primary">My Storage</h2>
          <p className="text-xs text-text-muted mt-0.5">Track your file uploads across chat, discussion, and community areas.</p>
        </div>
      </div>

      <div className="bg-surface-secondary rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-text-primary">Storage used</span>
          <span className="text-text-secondary">{formatBytes(data.usedBytes)} of {data.limitMb} MB</span>
        </div>
        <div className="h-2 rounded-full bg-border-light overflow-hidden">
          <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-text-muted">{pct}% used · {data.files.length} file{data.files.length !== 1 ? "s" : ""}</p>
      </div>

      {data.files.length === 0 ? (
        <p className="text-sm text-text-muted text-center py-6">No uploaded files tracked yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-text-secondary">Your uploaded files</p>
          {data.files.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-3 bg-surface-secondary rounded-lg px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm text-text-primary truncate">{f.s3Key.split("/").pop() ?? f.s3Key}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  <Badge variant="neutral" size="sm">{CONTEXT_LABEL[f.context] ?? f.context}</Badge>{" "}
                  {formatBytes(f.sizeBytes)} · {new Date(f.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => del(f.id)}
                className="text-text-muted hover:text-error p-1.5 shrink-0 transition-colors"
                title="Delete file"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
