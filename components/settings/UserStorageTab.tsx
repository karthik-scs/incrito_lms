"use client";

import { useEffect, useState } from "react";
import { HardDrive, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { apiJson } from "@/lib/authClient";

type StorageRow = {
  userId: string;
  usedBytes: number;
  fileCount: number;
  limitMb: number;
  user?: { id: string; firstName: string; lastName: string; email: string; avatarUrl: string | null };
};

type FileUpload = {
  id: string;
  s3Key: string;
  sizeBytes: number;
  context: string;
  createdAt: string;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StorageBar({ used, limitMb }: { used: number; limitMb: number }) {
  const limitBytes = limitMb * 1024 * 1024;
  const pct = Math.min(100, Math.round((used / limitBytes) * 100));
  const variant = pct >= 90 ? "bg-error" : pct >= 70 ? "bg-warning" : "bg-accent";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-border-light overflow-hidden">
        <div className={`h-full rounded-full ${variant}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-text-muted whitespace-nowrap">{formatBytes(used)} / {limitMb} MB</span>
    </div>
  );
}

function UserFilesModal({
  userId,
  userName,
  onClose,
  onDeleted,
}: {
  userId: string;
  userName: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await apiJson<FileUpload[]>(`/api/storage/admin/users/${userId}/files`);
    setLoading(false);
    if (res.ok) setFiles(res.data);
  }

  useEffect(() => { load(); }, [userId]);

  async function del(id: string) {
    if (!window.confirm("Delete this file permanently?")) return;
    const res = await apiJson(`/api/storage/admin/files/${id}`, { method: "DELETE" });
    if (res.ok) { onDeleted(); setFiles((f) => f.filter((x) => x.id !== id)); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-text-primary">Files — {userName}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-lg">×</button>
        </div>
        {loading && <p className="text-sm text-text-muted">Loading…</p>}
        {!loading && files.length === 0 && <p className="text-sm text-text-muted text-center py-6">No tracked files.</p>}
        <div className="flex flex-col gap-2 overflow-y-auto">
          {files.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-3 bg-surface-secondary rounded-lg px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-xs text-text-primary truncate">{f.s3Key.split("/").pop()}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  <Badge variant="neutral" size="sm">{f.context}</Badge>{" "}
                  {formatBytes(f.sizeBytes)} · {new Date(f.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button onClick={() => del(f.id)} className="text-text-muted hover:text-error p-1.5 shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function UserStorageTab() {
  const [rows, setRows] = useState<StorageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLimit, setEditingLimit] = useState<{ userId: string; limitMb: number } | null>(null);
  const [viewingFiles, setViewingFiles] = useState<StorageRow | null>(null);

  async function load() {
    setLoading(true);
    const res = await apiJson<StorageRow[]>("/api/storage/admin");
    if (res.ok) setRows(res.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function saveLimit() {
    if (!editingLimit) return;
    await apiJson(`/api/storage/admin/users/${editingLimit.userId}/limit`, {
      method: "PATCH",
      body: JSON.stringify({ limitMb: editingLimit.limitMb }),
    });
    setEditingLimit(null);
    await load();
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent-light text-accent shrink-0">
          <HardDrive size={18} />
        </span>
        <div>
          <h2 className="text-base font-semibold text-text-primary">User Storage Limits</h2>
          <p className="text-xs text-text-muted mt-0.5">Manage per-user file storage for chat, discussion, and community uploads.</p>
        </div>
      </div>

      {loading && <p className="text-sm text-text-muted">Loading…</p>}
      {!loading && rows.length === 0 && (
        <p className="text-sm text-text-muted text-center py-8">No file uploads tracked yet.</p>
      )}

      {!loading && rows.length > 0 && (
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <div key={row.userId} className="bg-surface-secondary border border-border rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {row.user && (
                    <Avatar
                      avatarUrl={row.user.avatarUrl}
                      name={`${row.user.firstName} ${row.user.lastName}`}
                      size={32}
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {row.user ? `${row.user.firstName} ${row.user.lastName}` : row.userId}
                    </p>
                    {row.user && <p className="text-xs text-text-muted truncate">{row.user.email}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-text-muted">{row.fileCount} file{row.fileCount !== 1 ? "s" : ""}</span>
                  <Button
                    variant="secondary"
                    onClick={() => setViewingFiles(row)}
                    className="px-2.5 py-1 text-xs"
                  >
                    Files
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setEditingLimit({ userId: row.userId, limitMb: row.limitMb })}
                    className="px-2.5 py-1 text-xs"
                  >
                    Set limit
                  </Button>
                </div>
              </div>
              <StorageBar used={row.usedBytes} limitMb={row.limitMb} />
            </div>
          ))}
        </div>
      )}

      {editingLimit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4">
            <h3 className="text-base font-semibold text-text-primary">Set Storage Limit</h3>
            <div>
              <label className="text-sm font-medium text-text-secondary">Limit (MB)</label>
              <input
                type="number"
                min={10}
                value={editingLimit.limitMb}
                onChange={(e) => setEditingLimit({ ...editingLimit, limitMb: Number(e.target.value) })}
                className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <p className="text-xs text-text-muted mt-1">Default is 500 MB. This applies to chat, discussion, and community files only.</p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setEditingLimit(null)}>Cancel</Button>
              <Button onClick={saveLimit}>Save</Button>
            </div>
          </div>
        </div>
      )}

      {viewingFiles && (
        <UserFilesModal
          userId={viewingFiles.userId}
          userName={viewingFiles.user ? `${viewingFiles.user.firstName} ${viewingFiles.user.lastName}` : viewingFiles.userId}
          onClose={() => setViewingFiles(null)}
          onDeleted={load}
        />
      )}
    </div>
  );
}
