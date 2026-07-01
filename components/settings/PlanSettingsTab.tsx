"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { apiJson } from "@/lib/authClient";

type DurationUnit = "DAYS" | "MONTHS" | "YEARS";

type PlanSetting = {
  id: string;
  plan: string;
  displayName: string;
  lmsAccessDurationValue: number;
  lmsAccessDurationUnit: DurationUnit;
  recordingAccessDurationValue: number;
  recordingAccessDurationUnit: DurationUnit;
  canAccess1on1Calls: boolean;
  mentorCallLimitPerMonth: number | null;
  studentCallLimitPerMonth: number | null;
  canDownloadResources: boolean;
  canAccessRecordings: boolean;
  canAccessCommunity: boolean;
};

const UNIT_OPTIONS = [
  { value: "DAYS", label: "Days" },
  { value: "MONTHS", label: "Months" },
  { value: "YEARS", label: "Years" },
];

const SYSTEM_PLANS = ["ICAP", "INTENSIVE_PRO"];

function PlanCard({
  setting,
  onSave,
  onDelete,
}: {
  setting: PlanSetting;
  onSave: (data: Partial<PlanSetting>) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState(setting.displayName);
  const [lmsValue, setLmsValue] = useState(setting.lmsAccessDurationValue);
  const [lmsUnit, setLmsUnit] = useState<DurationUnit>(setting.lmsAccessDurationUnit);
  const [recValue, setRecValue] = useState(setting.recordingAccessDurationValue);
  const [recUnit, setRecUnit] = useState<DurationUnit>(setting.recordingAccessDurationUnit);
  const [can1on1, setCan1on1] = useState(setting.canAccess1on1Calls);
  const [mentorLimit, setMentorLimit] = useState<string>(setting.mentorCallLimitPerMonth?.toString() ?? "");
  const [studentLimit, setStudentLimit] = useState<string>(setting.studentCallLimitPerMonth?.toString() ?? "");
  const [canDownload, setCanDownload] = useState(setting.canDownloadResources);
  const [canRecordings, setCanRecordings] = useState(setting.canAccessRecordings);
  const [canCommunity, setCanCommunity] = useState(setting.canAccessCommunity);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);

  const isSystem = SYSTEM_PLANS.includes(setting.plan);

  async function handleSave() {
    setSubmitting(true);
    setSaved(false);
    await onSave({
      displayName,
      lmsAccessDurationValue: lmsValue,
      lmsAccessDurationUnit: lmsUnit,
      recordingAccessDurationValue: recValue,
      recordingAccessDurationUnit: recUnit,
      canAccess1on1Calls: can1on1,
      mentorCallLimitPerMonth: mentorLimit ? Number(mentorLimit) : null,
      studentCallLimitPerMonth: studentLimit ? Number(studentLimit) : null,
      canDownloadResources: canDownload,
      canAccessRecordings: canRecordings,
      canAccessCommunity: canCommunity,
    });
    setSubmitting(false);
    setSaved(true);
  }

  async function handleDelete() {
    if (!onDelete) return;
    if (!window.confirm(`Delete plan "${setting.displayName}"? This cannot be undone.`)) return;
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <label className="text-xs font-medium text-text-secondary">Plan name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full bg-surface border border-border rounded-md px-2.5 py-1.5 text-sm font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
          />
          <p className="text-xs text-text-muted mt-0.5">Internal key: <code>{setting.plan}</code></p>
        </div>
        {!isSystem && onDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="mt-5 p-1.5 rounded-lg text-text-muted hover:text-error hover:bg-error/10 transition-colors"
            title="Delete plan"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {/* Access durations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-text-secondary">LMS Access duration</label>
          <div className="mt-1 flex gap-2">
            <input
              type="number"
              min={1}
              value={lmsValue}
              onChange={(e) => setLmsValue(Number(e.target.value))}
              className="w-20 bg-surface border border-border rounded-md px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
            <div className="flex-1">
              <Select value={lmsUnit} onChange={(v) => setLmsUnit(v as DurationUnit)} options={UNIT_OPTIONS} />
            </div>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">Recording Access duration</label>
          <div className="mt-1 flex gap-2">
            <input
              type="number"
              min={1}
              value={recValue}
              onChange={(e) => setRecValue(Number(e.target.value))}
              className="w-20 bg-surface border border-border rounded-md px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
            <div className="flex-1">
              <Select value={recUnit} onChange={(v) => setRecUnit(v as DurationUnit)} options={UNIT_OPTIONS} />
            </div>
          </div>
        </div>
      </div>

      {/* Feature permissions */}
      <div className="border-t border-border pt-4 flex flex-col gap-3">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Feature Access</p>
        <Switch checked={canRecordings} onChange={setCanRecordings} label="Access class recordings" />
        <Switch checked={canDownload} onChange={setCanDownload} label="Download resources" />
        <Switch checked={canCommunity} onChange={setCanCommunity} label="Community access" />
      </div>

      {/* 1:1 Call limits */}
      <div className="border-t border-border pt-4 flex flex-col gap-3">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">1:1 Video & Audio Calls</p>
        <Switch checked={can1on1} onChange={setCan1on1} label="Allow 1:1 mentor calls" />
        {can1on1 && (
          <div className="grid grid-cols-2 gap-4 mt-1">
            <div>
              <label className="text-xs font-medium text-text-secondary">Mentor call limit / month</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  min={0}
                  value={mentorLimit}
                  onChange={(e) => setMentorLimit(e.target.value)}
                  placeholder="Unlimited"
                  className="w-28 bg-surface border border-border rounded-md px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                />
                <span className="text-xs text-text-muted">calls</span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">Leave blank for unlimited</p>
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary">Student call limit / month</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  min={0}
                  value={studentLimit}
                  onChange={(e) => setStudentLimit(e.target.value)}
                  placeholder="Unlimited"
                  className="w-28 bg-surface border border-border rounded-md px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                />
                <span className="text-xs text-text-muted">calls</span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">Leave blank for unlimited</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        {saved && <span className="text-xs text-success">Saved</span>}
        <Button onClick={handleSave} disabled={submitting} className="px-3 py-1.5 text-xs">
          {submitting ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

const BLANK_NEW_PLAN = {
  plan: "",
  displayName: "",
  lmsAccessDurationValue: 12,
  lmsAccessDurationUnit: "MONTHS" as DurationUnit,
  recordingAccessDurationValue: 12,
  recordingAccessDurationUnit: "MONTHS" as DurationUnit,
};

function NewPlanForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [form, setForm] = useState(BLANK_NEW_PLAN);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCreate() {
    if (!form.plan || !form.displayName) {
      setError("Plan key and display name are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    const res = await apiJson("/api/plan-settings", { method: "POST", body: JSON.stringify(form) });
    if (!res.ok) {
      setError(res.message ?? "Failed to create plan");
      setSubmitting(false);
      return;
    }
    onCreated();
  }

  return (
    <div className="bg-surface border border-accent rounded-2xl p-5 flex flex-col gap-4">
      <p className="text-sm font-semibold text-text-primary">New Plan</p>

      {error && <p className="text-xs text-error">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-text-secondary">Display name</label>
          <input
            value={form.displayName}
            onChange={(e) => set("displayName", e.target.value)}
            placeholder="e.g. Premium Pro"
            className="mt-1 w-full bg-surface border border-border rounded-md px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">
            Plan key <span className="text-text-muted">(uppercase, no spaces)</span>
          </label>
          <input
            value={form.plan}
            onChange={(e) => set("plan", e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"))}
            placeholder="e.g. PREMIUM_PRO"
            className="mt-1 w-full bg-surface border border-border rounded-md px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-text-secondary">LMS Access duration</label>
          <div className="mt-1 flex gap-2">
            <input
              type="number"
              min={1}
              value={form.lmsAccessDurationValue}
              onChange={(e) => set("lmsAccessDurationValue", Number(e.target.value))}
              className="w-20 bg-surface border border-border rounded-md px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
            <div className="flex-1">
              <Select
                value={form.lmsAccessDurationUnit}
                onChange={(v) => set("lmsAccessDurationUnit", v as DurationUnit)}
                options={UNIT_OPTIONS}
              />
            </div>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">Recording Access duration</label>
          <div className="mt-1 flex gap-2">
            <input
              type="number"
              min={1}
              value={form.recordingAccessDurationValue}
              onChange={(e) => set("recordingAccessDurationValue", Number(e.target.value))}
              className="w-20 bg-surface border border-border rounded-md px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
            <div className="flex-1">
              <Select
                value={form.recordingAccessDurationUnit}
                onChange={(v) => set("recordingAccessDurationUnit", v as DurationUnit)}
                options={UNIT_OPTIONS}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button onClick={onCancel} className="text-xs text-text-muted hover:text-text-primary px-3 py-1.5">
          Cancel
        </button>
        <Button onClick={handleCreate} disabled={submitting} className="px-3 py-1.5 text-xs">
          {submitting ? "Creating…" : "Create plan"}
        </Button>
      </div>
    </div>
  );
}

export function PlanSettingsTab() {
  const [settings, setSettings] = useState<PlanSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  async function load() {
    setLoading(true);
    const result = await apiJson<PlanSetting[]>("/api/plan-settings");
    if (result.ok) setSettings(result.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave(plan: string, data: Partial<PlanSetting>) {
    const result = await apiJson(`/api/plan-settings/${plan}`, { method: "PATCH", body: JSON.stringify(data) });
    if (!result.ok) window.alert(result.message);
    await load();
  }

  async function handleDelete(plan: string) {
    const result = await apiJson(`/api/plan-settings/${plan}`, { method: "DELETE" });
    if (!result.ok) window.alert(result.message);
    await load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Plans</h2>
          <p className="text-sm text-text-secondary mt-1">
            Create and configure plans. Rename or set durations and feature access per plan.
          </p>
        </div>
        <Button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs">
          <Plus size={13} />
          New Plan
        </Button>
      </div>

      {loading && <p className="mt-6 text-sm text-text-secondary">Loading…</p>}

      {!loading && (
        <div className="mt-4 flex flex-col gap-4">
          {showNew && (
            <NewPlanForm
              onCreated={async () => {
                setShowNew(false);
                await load();
              }}
              onCancel={() => setShowNew(false)}
            />
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {settings.map((setting) => (
              <PlanCard
                key={setting.plan}
                setting={setting}
                onSave={(data) => handleSave(setting.plan, data)}
                onDelete={SYSTEM_PLANS.includes(setting.plan) ? undefined : () => handleDelete(setting.plan)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
