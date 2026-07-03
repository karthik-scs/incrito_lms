"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { apiJson } from "@/lib/authClient";

type StorageSettings = {
  endpointUrl: string | null;
  awsRegion: string | null;
  awsBucket: string | null;
  awsAccessKeyId: string | null;
  awsSecretKeySet: boolean;
  updatedAt: string;
};

const inputClass =
  "mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent";

export function StorageSettingsTab() {
  const [endpointUrl, setEndpointUrl] = useState("");
  const [awsRegion, setAwsRegion] = useState("");
  const [awsBucket, setAwsBucket] = useState("");
  const [awsAccessKeyId, setAwsAccessKeyId] = useState("");
  const [awsSecretKey, setAwsSecretKey] = useState("");
  const [awsSecretKeySet, setAwsSecretKeySet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const result = await apiJson<StorageSettings>("/api/storage-settings");
    if (result.ok) {
      setEndpointUrl(result.data.endpointUrl ?? "");
      setAwsRegion(result.data.awsRegion ?? "");
      setAwsBucket(result.data.awsBucket ?? "");
      setAwsAccessKeyId(result.data.awsAccessKeyId ?? "");
      setAwsSecretKeySet(result.data.awsSecretKeySet);
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
    if (endpointUrl) body.endpointUrl = endpointUrl;
    if (awsRegion) body.awsRegion = awsRegion;
    if (awsBucket) body.awsBucket = awsBucket;
    if (awsAccessKeyId) body.awsAccessKeyId = awsAccessKeyId;
    if (awsSecretKey) body.awsSecretKey = awsSecretKey;
    const result = await apiJson<StorageSettings>("/api/storage-settings", { method: "PATCH", body: JSON.stringify(body) });
    setSubmitting(false);
    if (!result.ok) { setError(result.message); return; }
    setAwsSecretKeySet(result.data.awsSecretKeySet);
    setAwsSecretKey("");
    setSaved(true);
  }

  const isConfigured = Boolean(awsRegion && awsBucket && awsAccessKeyId && awsSecretKeySet);

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 max-w-xl">
      <div className="flex items-center gap-2 mb-1">
        <HardDrive size={16} className="text-accent" />
        <h2 className="text-base font-semibold text-text-primary">Storage (S3-compatible)</h2>
        {isConfigured && (
          <span className="flex items-center gap-1 text-xs text-success font-medium">
            <CheckCircle2 size={13} />
            Configured
          </span>
        )}
      </div>
      <p className="text-sm text-text-secondary mb-6">
        All uploaded files (avatars, attachments, recordings) are stored in your S3 bucket. Changes take effect
        immediately for all new uploads — no server restart needed.
      </p>

      {loading && <p className="text-sm text-text-secondary">Loading…</p>}

      {!loading && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-text-secondary">
              Custom Endpoint URL
              <span className="ml-1.5 text-xs text-text-muted font-normal">(optional — for Wasabi, Cloudflare R2, MinIO, etc.)</span>
            </label>
            <input value={endpointUrl} onChange={(e) => setEndpointUrl(e.target.value)} placeholder="https://s3.ap-southeast-1.wasabisys.com" className={inputClass} />
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary">Region</label>
            <input value={awsRegion} onChange={(e) => setAwsRegion(e.target.value)} placeholder="e.g. ap-south-1" className={inputClass} />
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary">Bucket name</label>
            <input value={awsBucket} onChange={(e) => setAwsBucket(e.target.value)} placeholder="my-incrito-media" className={inputClass} />
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary">Access Key ID</label>
            <input value={awsAccessKeyId} onChange={(e) => setAwsAccessKeyId(e.target.value)} placeholder="Access key ID" className={inputClass} />
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary">
              Secret Access Key
              {awsSecretKeySet && <span className="ml-1.5 text-xs text-text-muted font-normal">(set — leave blank to keep current)</span>}
            </label>
            <input
              type="password"
              value={awsSecretKey}
              onChange={(e) => setAwsSecretKey(e.target.value)}
              placeholder={awsSecretKeySet ? "••••••••••••••••••••" : "Paste secret access key"}
              className={inputClass}
            />
          </div>

          {error && <p className="text-sm text-error">{error}</p>}
          {saved && <p className="text-sm text-success">Saved — new credentials will be used immediately.</p>}

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
