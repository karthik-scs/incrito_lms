"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { apiJson } from "@/lib/authClient";

type Settings = {
  platformName: string;
  supportEmail: string | null;
  maintenanceMode: boolean;
};

export function GeneralSettingsTab() {
  const [platformName, setPlatformName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const result = await apiJson<Settings>("/api/settings");
    if (result.ok) {
      setPlatformName(result.data.platformName);
      setSupportEmail(result.data.supportEmail ?? "");
      setMaintenanceMode(result.data.maintenanceMode);
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
        platformName,
        supportEmail: supportEmail || undefined,
        maintenanceMode,
      }),
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSuccess(true);
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 max-w-xl">
      <h2 className="text-base font-semibold text-text-primary">General Settings</h2>
      <p className="text-sm text-text-secondary mt-1">Platform-wide identity and availability.</p>

      {loading && <p className="mt-6 text-sm text-text-secondary">Loading…</p>}

      {!loading && (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-text-secondary" htmlFor="platform-name">
              Platform name
            </label>
            <input
              id="platform-name"
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              required
              className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary" htmlFor="support-email">
              Support email
            </label>
            <input
              id="support-email"
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              placeholder="support@incrito.dev"
              className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>

          <Switch
            checked={maintenanceMode}
            onChange={setMaintenanceMode}
            label="Maintenance mode"
            description="Shows a maintenance notice to non-admin users platform-wide."
          />

          {error && <p className="text-sm text-error">{error}</p>}
          {success && <p className="text-sm text-success">Settings saved.</p>}

          <div className="flex justify-end mt-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
