"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Video } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { apiJson } from "@/lib/authClient";

type LiveAccount = {
  id: string;
  provider: "ZOOM" | "ZOHO";
  isActive: boolean;
  zoomAccountId: string | null;
  zohoAccountOwnerName: string | null;
};

export function LiveAccountsTab() {
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<LiveAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [zohoNotice, setZohoNotice] = useState<"success" | "error" | null>(null);

  const [zoomFormOpen, setZoomFormOpen] = useState(false);
  const [zoomAccountId, setZoomAccountId] = useState("");
  const [zoomClientId, setZoomClientId] = useState("");
  const [zoomClientSecret, setZoomClientSecret] = useState("");
  const [zoomSecretToken, setZoomSecretToken] = useState("");
  const [zoomError, setZoomError] = useState<string | null>(null);
  const [zoomSubmitting, setZoomSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    const result = await apiJson<LiveAccount[]>("/api/live-accounts");
    if (result.ok) setAccounts(result.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const zoho = searchParams.get("zoho");
    if (zoho === "success" || zoho === "error") setZohoNotice(zoho);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const zoomAccount = accounts.find((a) => a.provider === "ZOOM");
  const zohoAccount = accounts.find((a) => a.provider === "ZOHO");

  async function handleConnectZoom(e: React.FormEvent) {
    e.preventDefault();
    setZoomError(null);
    setZoomSubmitting(true);
    const result = await apiJson("/api/live-accounts/zoom", {
      method: "POST",
      body: JSON.stringify({ zoomAccountId, zoomClientId, zoomClientSecret, zoomSecretToken }),
    });
    setZoomSubmitting(false);
    if (!result.ok) {
      setZoomError(result.message);
      return;
    }
    setZoomFormOpen(false);
    setZoomAccountId("");
    setZoomClientId("");
    setZoomClientSecret("");
    setZoomSecretToken("");
    await load();
  }

  async function handleDisconnect(id: string) {
    if (!window.confirm("Disconnect this account? Future live classes will fall back to the shared Zoom pool (for Zoom) or be unavailable (for Zoho).")) return;
    const result = await apiJson(`/api/live-accounts/${id}`, { method: "DELETE" });
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    await load();
  }

  async function handleConnectZoho() {
    const result = await apiJson<{ url: string }>("/api/live-accounts/zoho/authorize");
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    window.location.href = result.data.url;
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <h2 className="text-base font-semibold text-text-primary">Live Class Accounts</h2>
        <p className="text-sm text-text-secondary mt-1">
          Connect your own Zoom and/or Zoho Meeting account to schedule live classes under your own license. Both
          open in a new tab to start/join — there's no in-app calling yet. If you don't connect an account, Zoom
          sessions you host fall back to the platform's shared pool.
        </p>
      </div>

      {zohoNotice === "success" && (
        <p className="text-sm text-success bg-success-lightest rounded-md px-3 py-2">Zoho account connected.</p>
      )}
      {zohoNotice === "error" && (
        <p className="text-sm text-error bg-error/10 rounded-md px-3 py-2">Couldn't connect your Zoho account — try again.</p>
      )}

      {loading && <p className="text-sm text-text-secondary">Loading…</p>}

      {!loading && (
        <>
          <div className="bg-surface border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video size={16} className="text-accent" />
                <p className="text-sm font-semibold text-text-primary">Zoom</p>
                {zoomAccount && <Badge variant="success">Connected</Badge>}
              </div>
              {zoomAccount ? (
                <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => handleDisconnect(zoomAccount.id)}>
                  Disconnect
                </Button>
              ) : (
                <Button className="px-3 py-1.5 text-xs" onClick={() => setZoomFormOpen((v) => !v)}>
                  {zoomFormOpen ? "Cancel" : "Connect"}
                </Button>
              )}
            </div>
            {zoomAccount && (
              <p className="text-xs text-text-muted mt-2">Zoom account ID: {zoomAccount.zoomAccountId}</p>
            )}

            {!zoomAccount && zoomFormOpen && (
              <form onSubmit={handleConnectZoom} className="mt-4 flex flex-col gap-3">
                <p className="text-xs text-text-muted">
                  From a Server-to-Server OAuth app in your Zoom Marketplace account — same credential shape as the
                  platform's own Zoom accounts.
                </p>
                <input
                  value={zoomAccountId}
                  onChange={(e) => setZoomAccountId(e.target.value)}
                  placeholder="Zoom Account ID"
                  required
                  className="bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                />
                <input
                  value={zoomClientId}
                  onChange={(e) => setZoomClientId(e.target.value)}
                  placeholder="Client ID"
                  required
                  className="bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                />
                <input
                  value={zoomClientSecret}
                  onChange={(e) => setZoomClientSecret(e.target.value)}
                  type="password"
                  placeholder="Client Secret"
                  required
                  className="bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                />
                <input
                  value={zoomSecretToken}
                  onChange={(e) => setZoomSecretToken(e.target.value)}
                  type="password"
                  placeholder="Webhook Secret Token"
                  required
                  className="bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                />
                {zoomError && <p className="text-sm text-error">{zoomError}</p>}
                <Button type="submit" disabled={zoomSubmitting} className="self-end px-3 py-1.5 text-xs">
                  {zoomSubmitting ? "Connecting…" : "Connect Zoom"}
                </Button>
              </form>
            )}
          </div>

          <div className="bg-surface border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video size={16} className="text-accent" />
                <p className="text-sm font-semibold text-text-primary">Zoho Meeting</p>
                {zohoAccount && <Badge variant="success">Connected</Badge>}
              </div>
              {zohoAccount ? (
                <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => handleDisconnect(zohoAccount.id)}>
                  Disconnect
                </Button>
              ) : (
                <Button className="px-3 py-1.5 text-xs" onClick={handleConnectZoho}>
                  Connect with Zoho
                </Button>
              )}
            </div>
            <p className="text-xs text-text-muted mt-2">
              {zohoAccount
                ? "Your Zoho Workplace account is linked — live classes you schedule can use it."
                : "Connecting opens Zoho's sign-in to link your Workplace account — no keys to copy."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
