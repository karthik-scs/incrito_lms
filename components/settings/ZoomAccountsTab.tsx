"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/Switch";
import { apiJson } from "@/lib/authClient";

type ZoomAccount = {
  id: string;
  label: string;
  zoomAccountId: string;
  clientId: string;
  clientSecretSet: boolean;
  secretTokenSet: boolean;
  sdkKey: string | null;
  sdkSecretSet: boolean;
  sdkConfigured: boolean;
  concurrentLimit: number;
  isActive: boolean;
  webhookUrl: string;
};

const inputClass =
  "mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent";

function emptyForm() {
  return {
    label: "",
    zoomAccountId: "",
    clientId: "",
    clientSecret: "",
    secretToken: "",
    sdkKey: "",
    sdkSecret: "",
    concurrentLimit: "2",
    isActive: true,
  };
}

export function ZoomAccountsTab() {
  const [accounts, setAccounts] = useState<ZoomAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ZoomAccount | "new" | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    const result = await apiJson<ZoomAccount[]>("/api/zoom-accounts");
    if (result.ok) setAccounts(result.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing("new");
    setForm(emptyForm());
    setError(null);
  }

  function openEdit(account: ZoomAccount) {
    setEditing(account);
    setForm({
      label: account.label,
      zoomAccountId: account.zoomAccountId,
      clientId: account.clientId,
      clientSecret: "",
      secretToken: "",
      sdkKey: account.sdkKey ?? "",
      sdkSecret: "",
      concurrentLimit: String(account.concurrentLimit),
      isActive: account.isActive,
    });
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload = {
      label: form.label,
      zoomAccountId: form.zoomAccountId,
      clientId: form.clientId,
      clientSecret: form.clientSecret || undefined,
      secretToken: form.secretToken || undefined,
      sdkKey: form.sdkKey || undefined,
      sdkSecret: form.sdkSecret || undefined,
      concurrentLimit: Number(form.concurrentLimit) || 2,
      isActive: form.isActive,
    };

    const result =
      editing !== "new" && editing
        ? await apiJson(`/api/zoom-accounts/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        : await apiJson("/api/zoom-accounts", { method: "POST", body: JSON.stringify(payload) });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setEditing(null);
    await load();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Remove this Zoom account? Live classes already scheduled on it keep working, but no new ones will use it.")) return;
    await apiJson(`/api/zoom-accounts/${id}`, { method: "DELETE" });
    await load();
  }

  async function copyWebhookUrl(url: string) {
    await navigator.clipboard.writeText(url).catch(() => null);
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 max-w-2xl">
      <h2 className="text-base font-semibold text-text-primary">Live Class API (Zoom)</h2>
      <p className="text-sm text-text-secondary mt-1">
        Server-to-Server OAuth apps used to auto-schedule live classes. Add more than one to raise total
        concurrent-meeting capacity — once an account hits its limit, the next live class scheduled automatically
        rotates to the next account with spare capacity.
      </p>

      {loading && <p className="mt-6 text-sm text-text-secondary">Loading…</p>}

      {!loading && !editing && (
        <div className="mt-6 flex flex-col gap-3">
          {accounts.length === 0 && (
            <p className="text-sm text-text-muted py-4 text-center">No Zoom accounts configured yet — live classes will use mock meeting links until one is added.</p>
          )}
          {accounts.map((account) => (
            <div key={account.id} className="bg-surface-secondary rounded-lg p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{account.label}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    Account ID {account.zoomAccountId} · {account.concurrentLimit} concurrent meeting{account.concurrentLimit === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={account.isActive ? "success" : "muted"}>{account.isActive ? "Active" : "Disabled"}</Badge>
                  <Badge variant={account.sdkConfigured ? "success" : "info"}>
                    {account.sdkConfigured ? "In-app join ready" : "Join-link only"}
                  </Badge>
                  <button onClick={() => openEdit(account)} aria-label="Edit account" className="text-text-muted hover:text-accent p-1.5">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(account.id)} aria-label="Delete account" className="text-text-muted hover:text-error p-1.5">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <input readOnly value={account.webhookUrl} className="flex-1 bg-surface border border-border rounded-md px-2.5 py-1.5 text-xs text-text-muted" />
                <Button variant="secondary" onClick={() => copyWebhookUrl(account.webhookUrl)} className="px-2.5 py-1.5 text-xs">
                  Copy
                </Button>
              </div>
              <p className="text-xs text-text-muted mt-1.5">
                Paste this into this account's Zoom App → Event Subscriptions, subscribed to Meeting Started, Meeting Ended, and Recording Completed.
              </p>
            </div>
          ))}
          <Button variant="secondary" onClick={openCreate}>
            <Plus size={14} /> Add Zoom account
          </Button>
        </div>
      )}

      {editing && (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-text-secondary">Label</label>
            <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required placeholder="e.g. Primary Zoom account" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-text-secondary">Account ID</label>
              <input value={form.zoomAccountId} onChange={(e) => setForm({ ...form, zoomAccountId: e.target.value })} required className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary">Client ID</label>
              <input value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} required className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-text-secondary">Client secret</label>
              <input
                type="password"
                value={form.clientSecret}
                onChange={(e) => setForm({ ...form, clientSecret: e.target.value })}
                placeholder={editing !== "new" && editing?.clientSecretSet ? "Leave blank to keep current" : "Not set"}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary">Secret token (webhook)</label>
              <input
                type="password"
                value={form.secretToken}
                onChange={(e) => setForm({ ...form, secretToken: e.target.value })}
                placeholder={editing !== "new" && editing?.secretTokenSet ? "Leave blank to keep current" : "Not set"}
                className={inputClass}
              />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium text-text-secondary">Meeting SDK (optional — for in-app join)</p>
            <p className="text-xs text-text-muted mt-1">
              A separate "Meeting SDK" app's key/secret, not the Server-to-Server OAuth credentials above. Without
              this, live classes still get auto-scheduled and recorded — joining just opens the Zoom link in a new
              tab instead of embedding the call inside this app.
            </p>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <label className="text-sm font-medium text-text-secondary">SDK key</label>
                <input value={form.sdkKey} onChange={(e) => setForm({ ...form, sdkKey: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary">SDK secret</label>
                <input
                  type="password"
                  value={form.sdkSecret}
                  onChange={(e) => setForm({ ...form, sdkSecret: e.target.value })}
                  placeholder={editing !== "new" && editing?.sdkSecretSet ? "Leave blank to keep current" : "Not set"}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-end">
            <div>
              <label className="text-sm font-medium text-text-secondary">Concurrent meeting limit</label>
              <input
                type="number"
                min={1}
                value={form.concurrentLimit}
                onChange={(e) => setForm({ ...form, concurrentLimit: e.target.value })}
                className={inputClass}
              />
            </div>
            <Switch checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} label="Active" description="Disabled accounts are skipped when picking where to schedule a new meeting." />
          </div>

          {error && <p className="text-sm text-error">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : editing === "new" ? "Add account" : "Save changes"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
