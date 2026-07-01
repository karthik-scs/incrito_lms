"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/Switch";
import { apiJson } from "@/lib/authClient";

type NotificationSettings = {
  classReminderEnabled: boolean;
  deadlineReminderEnabled: boolean;
  enrollmentEnabled: boolean;
  announcementEnabled: boolean;
  certificateIssuedEnabled: boolean;
};

const FIELDS: { key: keyof NotificationSettings; label: string; description: string }[] = [
  { key: "classReminderEnabled", label: "Class reminders", description: "Send a WhatsApp message before a live class starts." },
  { key: "deadlineReminderEnabled", label: "Deadline reminders", description: "Send a WhatsApp message before an assignment is due." },
  { key: "enrollmentEnabled", label: "Enrollment confirmations", description: "Send a WhatsApp message when a student is enrolled in a cohort." },
  { key: "announcementEnabled", label: "Announcements", description: "Send a WhatsApp message when a new announcement is published." },
  { key: "certificateIssuedEnabled", label: "Certificate issued", description: "Send a WhatsApp message when a certificate is issued." },
];

export function WhatsAppNotificationsTab() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const result = await apiJson<NotificationSettings>("/api/whatsapp/settings");
    if (result.ok) setSettings(result.data);
    else setError(result.message);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleToggle(key: keyof NotificationSettings, value: boolean) {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
    setSaving(true);
    const result = await apiJson<NotificationSettings>("/api/whatsapp/settings", {
      method: "PATCH",
      body: JSON.stringify({ [key]: value }),
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      await load();
      return;
    }
    setSettings(result.data);
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 max-w-xl">
      <h2 className="text-base font-semibold text-text-primary">WhatsApp Notifications</h2>
      <p className="text-sm text-text-secondary mt-1">Choose which platform events send a WhatsApp message.</p>

      {loading && <p className="mt-6 text-sm text-text-secondary">Loading…</p>}
      {error && <p className="mt-6 text-sm text-error">{error}</p>}

      {settings && (
        <div className="mt-6 flex flex-col gap-5">
          {FIELDS.map((field) => (
            <Switch
              key={field.key}
              label={field.label}
              description={field.description}
              checked={settings[field.key]}
              onChange={(value) => handleToggle(field.key, value)}
            />
          ))}
          {saving && <p className="text-xs text-text-muted">Saving…</p>}
        </div>
      )}
    </div>
  );
}
