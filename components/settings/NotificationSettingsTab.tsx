"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/Switch";
import { apiJson } from "@/lib/authClient";

type NotificationPreferences = {
  emailEnabled: boolean;
  enrollmentEmails: boolean;
  announcementEmails: boolean;
  certificateEmails: boolean;
  liveClassEmails: boolean;
  productUpdateEmails: boolean;
};

const FIELDS: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  { key: "emailEnabled", label: "Email notifications", description: "Master switch for all email notifications below." },
  { key: "enrollmentEmails", label: "Enrollment updates", description: "When a student is enrolled or unenrolled from a cohort." },
  { key: "announcementEmails", label: "Announcements", description: "When a new announcement is published." },
  { key: "certificateEmails", label: "Certificate issued", description: "When a certificate is issued to a student." },
  { key: "liveClassEmails", label: "Live class reminders", description: "When a live class is scheduled or about to start." },
  { key: "productUpdateEmails", label: "Product updates", description: "Occasional news about new incrito features." },
];

export function NotificationSettingsTab() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const result = await apiJson<NotificationPreferences>("/api/notification-preferences");
    if (result.ok) setPreferences(result.data);
    else setError(result.message);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleToggle(key: keyof NotificationPreferences, value: boolean) {
    if (!preferences) return;
    setPreferences({ ...preferences, [key]: value });
    setSaving(true);
    const result = await apiJson<NotificationPreferences>("/api/notification-preferences", {
      method: "PATCH",
      body: JSON.stringify({ [key]: value }),
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      await load();
      return;
    }
    setPreferences(result.data);
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 max-w-xl">
      <h2 className="text-base font-semibold text-text-primary">Notification Settings</h2>
      <p className="text-sm text-text-secondary mt-1">Choose which emails you want to receive.</p>

      {loading && <p className="mt-6 text-sm text-text-secondary">Loading…</p>}
      {error && <p className="mt-6 text-sm text-error">{error}</p>}

      {preferences && (
        <div className="mt-6 flex flex-col gap-5">
          {FIELDS.map((field) => (
            <Switch
              key={field.key}
              label={field.label}
              description={field.description}
              checked={preferences[field.key]}
              onChange={(value) => handleToggle(field.key, value)}
            />
          ))}
          {saving && <p className="text-xs text-text-muted">Saving…</p>}
        </div>
      )}
    </div>
  );
}
