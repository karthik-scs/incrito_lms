"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { Select } from "@/components/ui/Select";
import { apiJson } from "@/lib/authClient";

type Settings = {
  enabled: boolean;
  apiProvider: string;
  phoneNumberId: string | null;
  businessAccountId: string | null;
  webhookVerifyToken: string | null;
  accessTokenSet: boolean;
};

const PROVIDER_OPTIONS = [
  { value: "meta_cloud_api", label: "Meta Cloud API" },
  { value: "twilio", label: "Twilio" },
];

export function WhatsAppConfigurationTab() {
  const [enabled, setEnabled] = useState(false);
  const [apiProvider, setApiProvider] = useState("meta_cloud_api");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [accessTokenSet, setAccessTokenSet] = useState(false);
  const [webhookVerifyToken, setWebhookVerifyToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const result = await apiJson<Settings>("/api/whatsapp/settings");
    if (result.ok) {
      setEnabled(result.data.enabled);
      setApiProvider(result.data.apiProvider);
      setPhoneNumberId(result.data.phoneNumberId ?? "");
      setBusinessAccountId(result.data.businessAccountId ?? "");
      setWebhookVerifyToken(result.data.webhookVerifyToken ?? "");
      setAccessTokenSet(result.data.accessTokenSet);
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

    const result = await apiJson<Settings>("/api/whatsapp/settings", {
      method: "PATCH",
      body: JSON.stringify({
        enabled,
        apiProvider,
        phoneNumberId: phoneNumberId || undefined,
        businessAccountId: businessAccountId || undefined,
        accessToken: accessToken || undefined,
        webhookVerifyToken: webhookVerifyToken || undefined,
      }),
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setAccessToken("");
    setAccessTokenSet(result.data.accessTokenSet);
    setSuccess(true);
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 max-w-xl">
      <h2 className="text-base font-semibold text-text-primary">WhatsApp Configuration</h2>
      <p className="text-sm text-text-secondary mt-1">Connect your WhatsApp Business API provider.</p>

      {loading && <p className="mt-6 text-sm text-text-secondary">Loading…</p>}

      {!loading && (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Switch
            checked={enabled}
            onChange={setEnabled}
            label="Enable WhatsApp messaging"
            description="Turn off to stop all outgoing WhatsApp messages platform-wide."
          />

          <div>
            <label className="text-sm font-medium text-text-secondary">API provider</label>
            <div className="mt-1">
              <Select value={apiProvider} onChange={setApiProvider} options={PROVIDER_OPTIONS} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-text-secondary" htmlFor="wa-phone-number-id">
                Phone number ID
              </label>
              <input
                id="wa-phone-number-id"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary" htmlFor="wa-business-account-id">
                Business account ID
              </label>
              <input
                id="wa-business-account-id"
                value={businessAccountId}
                onChange={(e) => setBusinessAccountId(e.target.value)}
                className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary" htmlFor="wa-access-token">
              Access token
            </label>
            <input
              id="wa-access-token"
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder={accessTokenSet ? "Leave blank to keep current" : "Not set"}
              className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary" htmlFor="wa-webhook-token">
              Webhook verify token
            </label>
            <input
              id="wa-webhook-token"
              value={webhookVerifyToken}
              onChange={(e) => setWebhookVerifyToken(e.target.value)}
              className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>

          {error && <p className="text-sm text-error">{error}</p>}
          {success && <p className="text-sm text-success">Configuration saved.</p>}

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
