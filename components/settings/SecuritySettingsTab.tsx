"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/Switch";
import { apiJson } from "@/lib/authClient";
import { PersonalSecurityTab } from "./PersonalSecurityTab";

type SecuritySettings = {
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  enforceTwoFactor: boolean;
  maxDevicesPerUser: number;
};

export function SecuritySettingsTab() {
  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  async function loadSettings() {
    const result = await apiJson<SecuritySettings>("/api/settings");
    if (result.ok) {
      setSettings({
        sessionTimeoutMinutes: result.data.sessionTimeoutMinutes,
        maxLoginAttempts: result.data.maxLoginAttempts,
        enforceTwoFactor: result.data.enforceTwoFactor,
        maxDevicesPerUser: result.data.maxDevicesPerUser ?? 5,
      });
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function handleSettingsChange(field: keyof SecuritySettings, value: number | boolean) {
    if (!settings) return;
    const next = { ...settings, [field]: value };
    setSettings(next);
    setSettingsError(null);
    setSettingsSuccess(false);
    setSavingSettings(true);
    const result = await apiJson<SecuritySettings>("/api/settings", {
      method: "PATCH",
      body: JSON.stringify({ [field]: value }),
    });
    setSavingSettings(false);
    if (!result.ok) {
      setSettingsError(result.message);
      return;
    }
    setSettingsSuccess(true);
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <PersonalSecurityTab />

      {settings && (
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h2 className="text-base font-semibold text-text-primary">Security Policy</h2>
          <p className="text-sm text-text-secondary mt-1">Platform-wide security defaults.</p>

          <div className="mt-6 flex flex-col gap-5">
            <div>
              <label className="text-sm font-medium text-text-secondary" htmlFor="session-timeout">
                Session timeout (minutes)
              </label>
              <input
                id="session-timeout"
                type="number"
                min={5}
                max={1440}
                value={settings.sessionTimeoutMinutes}
                onChange={(e) => handleSettingsChange("sessionTimeoutMinutes", Number(e.target.value))}
                className="mt-1 w-32 bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary" htmlFor="max-login-attempts">
                Max login attempts
              </label>
              <input
                id="max-login-attempts"
                type="number"
                min={1}
                max={20}
                value={settings.maxLoginAttempts}
                onChange={(e) => handleSettingsChange("maxLoginAttempts", Number(e.target.value))}
                className="mt-1 w-32 bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary" htmlFor="max-devices">
                Max devices per user
              </label>
              <p className="text-xs text-text-muted mt-0.5">
                Maximum number of devices a user can be signed in from simultaneously. Oldest session is
                revoked automatically when a new login exceeds this limit.
              </p>
              <input
                id="max-devices"
                type="number"
                min={1}
                max={20}
                value={settings.maxDevicesPerUser}
                onChange={(e) => handleSettingsChange("maxDevicesPerUser", Number(e.target.value))}
                className="mt-1 w-32 bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
            <Switch
              checked={settings.enforceTwoFactor}
              onChange={(value) => handleSettingsChange("enforceTwoFactor", value)}
              label="Enforce two-factor authentication"
              description="Require all admins to set up 2FA before signing in."
            />
            {settingsError && <p className="text-sm text-error">{settingsError}</p>}
            {savingSettings && <p className="text-xs text-text-muted">Saving…</p>}
            {settingsSuccess && !savingSettings && <p className="text-xs text-success">Saved.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
