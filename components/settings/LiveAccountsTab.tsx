"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Video } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { apiJson } from "@/lib/authClient";

type LiveAccount = {
  id: string;
  provider: "ZOHO";
  isActive: boolean;
  zohoAccountOwnerName: string | null;
};

export function LiveAccountsTab() {
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<LiveAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [zohoNotice, setZohoNotice] = useState<"success" | "error" | null>(null);

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

  const zohoAccount = accounts.find((a) => a.provider === "ZOHO");

  async function handleDisconnect(id: string) {
    if (!window.confirm("Disconnect your Zoho account? Future live classes won't be auto-scheduled.")) return;
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
        <h2 className="text-base font-semibold text-text-primary">Live Class Account</h2>
        <p className="text-sm text-text-secondary mt-1">
          Connect your Zoho Meeting account to schedule live classes under your own license. Sessions
          open in a new tab to start/join. Without a connected account, live sessions are created
          without a meeting URL and you can paste one in manually after scheduling.
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
              ? `${zohoAccount.zohoAccountOwnerName ?? "Your Zoho Workplace account"} is linked — live classes you schedule will use it.`
              : "Connecting opens Zoho's sign-in to link your Workplace account — no keys to copy."}
          </p>
        </div>
      )}
    </div>
  );
}
