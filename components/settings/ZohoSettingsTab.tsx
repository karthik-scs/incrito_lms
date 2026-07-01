"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Video } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { apiJson } from "@/lib/authClient";

type ZohoSettings = {
  clientId: string | null;
  clientSecretSet: boolean;
  accountsDomain: string;
  apiDomain: string;
  updatedAt: string;
};

const inputClass =
  "mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent";

export function ZohoSettingsTab() {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [clientSecretSet, setClientSecretSet] = useState(false);
  const [accountsDomain, setAccountsDomain] = useState("https://accounts.zoho.in");
  const [apiDomain, setApiDomain] = useState("https://meeting.zoho.in");
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const result = await apiJson<ZohoSettings>("/api/zoho-settings");
    if (result.ok) {
      setClientId(result.data.clientId ?? "");
      setClientSecretSet(result.data.clientSecretSet);
      setAccountsDomain(result.data.accountsDomain);
      setApiDomain(result.data.apiDomain);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);
    const body: Record<string, string> = {};
    if (clientId) body.clientId = clientId;
    if (clientSecret) body.clientSecret = clientSecret;
    if (accountsDomain) body.accountsDomain = accountsDomain;
    if (apiDomain) body.apiDomain = apiDomain;
    const result = await apiJson<ZohoSettings>("/api/zoho-settings", { method: "PATCH", body: JSON.stringify(body) });
    setSubmitting(false);
    if (!result.ok) { setError(result.message); return; }
    setClientSecretSet(result.data.clientSecretSet);
    setClientSecret("");
    setSaved(true);
  }

  const isConfigured = Boolean(clientId && clientSecretSet);

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 max-w-xl">
      <div className="flex items-center gap-2 mb-1">
        <Video size={16} className="text-accent" />
        <h2 className="text-base font-semibold text-text-primary">Zoho Meeting</h2>
        {isConfigured && (
          <span className="flex items-center gap-1 text-xs text-success font-medium">
            <CheckCircle2 size={13} />
            Configured
          </span>
        )}
      </div>
      <p className="text-sm text-text-secondary mb-1">
        Org-level OAuth app credentials — set once here, used as the base for every user's personal
        "Connect with Zoho" flow in their own Live Class Accounts settings.
      </p>
      <p className="text-xs text-text-muted mb-6">
        Self Client app · India datacenter (<code>accounts.zoho.in</code> / <code>meeting.zoho.in</code>). Change the
        domain fields only if your Zoho org is registered in a different region.
      </p>

      {loading && <p className="text-sm text-text-secondary">Loading…</p>}

      {!loading && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-text-secondary">Client ID</label>
            <input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="1000.XXXXXXXX" className={inputClass} />
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary">
              Client Secret
              {clientSecretSet && <span className="ml-1.5 text-xs text-text-muted font-normal">(set — leave blank to keep current)</span>}
            </label>
            <input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder={clientSecretSet ? "••••••••••••••••••••" : "Paste client secret"}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-text-secondary">Accounts domain</label>
              <input value={accountsDomain} onChange={(e) => setAccountsDomain(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary">API domain</label>
              <input value={apiDomain} onChange={(e) => setApiDomain(e.target.value)} className={inputClass} />
            </div>
          </div>

          {error && <p className="text-sm text-error">{error}</p>}
          {saved && <p className="text-sm text-success">Saved — users can now connect their Zoho accounts.</p>}

          <div className="flex justify-end mt-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
