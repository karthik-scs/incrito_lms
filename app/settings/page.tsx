"use client";

import { Suspense, useState } from "react";
import { Bell, Shield, User, Video } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ProfileSettingsTab } from "@/components/settings/ProfileSettingsTab";
import { NotificationSettingsTab } from "@/components/settings/NotificationSettingsTab";
import { PersonalSecurityTab } from "@/components/settings/PersonalSecurityTab";
import { LiveAccountsTab } from "@/components/settings/LiveAccountsTab";
import { useAuth } from "@/components/providers/AuthProvider";

const ALL_TABS = [
  { key: "profile", label: "Profile", icon: User },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "security", label: "Security", icon: Shield },
  { key: "live-accounts", label: "Live Class Accounts", icon: Video, staffOnly: true },
] as const;

export default function SettingsPage() {
  const { user } = useAuth();
  const isStudent = user?.role === "Student";
  const TABS = ALL_TABS.filter((t) => !("staffOnly" in t && t.staffOnly && isStudent));
  const [activeTab, setActiveTab] = useState<string>("profile");

  return (
    <AdminLayout>
      <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
      <p className="text-sm text-text-secondary mt-1">Manage your profile, notifications, and account security.</p>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        <nav className="bg-surface border border-border rounded-2xl p-2 flex flex-col gap-1 h-fit">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-left transition-colors ${
                  isActive ? "bg-accent-light text-accent" : "text-text-dark hover:bg-surface-secondary"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div>
          {activeTab === "profile" && <ProfileSettingsTab />}
          {activeTab === "notifications" && <NotificationSettingsTab />}
          {activeTab === "security" && (
            <div className="flex flex-col gap-6 max-w-xl">
              <PersonalSecurityTab />
            </div>
          )}
          {activeTab === "live-accounts" && !isStudent && (
            <Suspense fallback={<p className="text-sm text-text-secondary">Loading…</p>}>
              <LiveAccountsTab />
            </Suspense>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
