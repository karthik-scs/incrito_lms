"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { Tooltip } from "@/components/ui/Tooltip";
import { apiJson } from "@/lib/authClient";

type Settings = {
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUsername: string | null;
  smtpFromName: string | null;
  smtpFromEmail: string | null;
  smtpSecure: boolean;
  smtpPasswordSet: boolean;
};

export function EmailSettingsTab() {
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpFromName, setSmtpFromName] = useState("");
  const [smtpFromEmail, setSmtpFromEmail] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [smtpPasswordSet, setSmtpPasswordSet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const result = await apiJson<Settings>("/api/settings");
    if (result.ok) {
      setSmtpHost(result.data.smtpHost ?? "");
      setSmtpPort(result.data.smtpPort ? String(result.data.smtpPort) : "");
      setSmtpUsername(result.data.smtpUsername ?? "");
      setSmtpFromName(result.data.smtpFromName ?? "");
      setSmtpFromEmail(result.data.smtpFromEmail ?? "");
      setSmtpSecure(result.data.smtpSecure);
      setSmtpPasswordSet(result.data.smtpPasswordSet);
    } else {
      setError(result.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    const result = await apiJson<Settings>("/api/settings", {
      method: "PATCH",
      body: JSON.stringify({
        smtpHost: smtpHost || undefined,
        smtpPort: smtpPort ? Number(smtpPort) : undefined,
        smtpUsername: smtpUsername || undefined,
        smtpPassword: smtpPassword || undefined,
        smtpFromName: smtpFromName || undefined,
        smtpFromEmail: smtpFromEmail || undefined,
        smtpSecure,
      }),
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSmtpPassword("");
    setSmtpPasswordSet(result.data.smtpPasswordSet);
    setSuccess(true);
  }

  async function handleTestEmail() {
    setTestResult(null);
    setTestSending(true);
    const result = await apiJson<{ sent: boolean; to: string }>("/api/settings/test-email", { method: "POST" });
    setTestSending(false);
    if (result.ok) {
      setTestResult({ ok: true, message: `Test email sent to ${result.data.to} — check your inbox.` });
    } else {
      setTestResult({ ok: false, message: result.message });
    }
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 max-w-xl">
      <h2 className="text-base font-semibold text-text-primary">Email Configuration (SMTP)</h2>
      <p className="text-sm text-text-secondary mt-1">Outgoing mail server used for system emails.</p>

      {loading && <p className="mt-6 text-sm text-text-secondary">Loading…</p>}

      {!loading && (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-medium text-text-secondary" htmlFor="smtp-host">
                SMTP host
              </label>
              <input
                id="smtp-host"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.example.com"
                className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary" htmlFor="smtp-port">
                Port
              </label>
              <input
                id="smtp-port"
                type="number"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                placeholder="587"
                className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-text-secondary" htmlFor="smtp-username">
                Username
              </label>
              <input
                id="smtp-username"
                value={smtpUsername}
                onChange={(e) => setSmtpUsername(e.target.value)}
                className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary" htmlFor="smtp-password">
                Password
              </label>
              <input
                id="smtp-password"
                type="password"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                placeholder={smtpPasswordSet ? "Leave blank to keep current" : "Not set"}
                className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-text-secondary" htmlFor="smtp-from-name">
                From name
              </label>
              <input
                id="smtp-from-name"
                value={smtpFromName}
                onChange={(e) => setSmtpFromName(e.target.value)}
                placeholder="incrito LMS"
                className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary" htmlFor="smtp-from-email">
                From email
              </label>
              <input
                id="smtp-from-email"
                type="email"
                value={smtpFromEmail}
                onChange={(e) => setSmtpFromEmail(e.target.value)}
                placeholder="noreply@incrito.dev"
                className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
          </div>

          <Switch
            checked={smtpSecure}
            onChange={setSmtpSecure}
            label="Use TLS/SSL"
            description="Recommended for ports 465/587."
          />

          {error && <p className="text-sm text-error">{error}</p>}
          {success && <p className="text-sm text-success">SMTP settings saved.</p>}
          {testResult && (
            <p className={`text-sm ${testResult.ok ? "text-success" : "text-error"}`}>{testResult.message}</p>
          )}

          <div className="flex justify-end gap-2 mt-2">
            <Button
              type="button"
              variant="secondary"
              disabled={testSending || !smtpPasswordSet}
              onClick={handleTestEmail}
            >
              {testSending ? "Sending…" : "Send Test Email"}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
