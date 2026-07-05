"use client";

import { useState } from "react";
import { Bell, BookOpen, Database, HardDrive, HeadphonesIcon, Layers, Mail, Settings as SettingsIcon, Shield, ShieldCheck, User } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ProfileSettingsTab } from "@/components/settings/ProfileSettingsTab";
import { NotificationSettingsTab } from "@/components/settings/NotificationSettingsTab";
import { EmailSettingsTab } from "@/components/settings/EmailSettingsTab";
import { SecuritySettingsTab } from "@/components/settings/SecuritySettingsTab";
import { GeneralSettingsTab } from "@/components/settings/GeneralSettingsTab";
import { RolesPermissionsTab } from "@/components/settings/RolesPermissionsTab";
import { CourseSettingsTab } from "@/components/settings/CourseSettingsTab";
import { PlanSettingsTab } from "@/components/settings/PlanSettingsTab";
import { StorageSettingsTab } from "@/components/settings/StorageSettingsTab";
import { ZohoSettingsTab } from "@/components/settings/ZohoSettingsTab";
import { SupportSettingsTab } from "@/components/settings/SupportSettingsTab";

const TABS = [
  { key: "profile", label: "Profile Settings", icon: User, content: ProfileSettingsTab },
  { key: "notifications", label: "Notification Settings", icon: Bell, content: NotificationSettingsTab },
  { key: "email", label: "Email Configure (SMTP)", icon: Mail, content: EmailSettingsTab },
  { key: "courses", label: "Courses Settings", icon: BookOpen, content: CourseSettingsTab },
  { key: "plans", label: "Plans", icon: Layers, content: PlanSettingsTab },
  { key: "storage", label: "Storage (S3)", icon: HardDrive, content: StorageSettingsTab },
  { key: "zoho", label: "Zoho Settings", icon: Database, content: ZohoSettingsTab },
  { key: "support", label: "Support Settings", icon: HeadphonesIcon, content: SupportSettingsTab },
  { key: "security", label: "Security", icon: Shield, content: SecuritySettingsTab },
  { key: "general", label: "General Settings", icon: SettingsIcon, content: GeneralSettingsTab },
  { key: "roles", label: "Roles & Permissions", icon: ShieldCheck, content: RolesPermissionsTab },
] as const;

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["key"]>("profile");

  const ActiveContent = TABS.find((tab) => tab.key === activeTab)?.content ?? ProfileSettingsTab;

  return (
    <AdminLayout>
      <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
      <p className="text-sm text-text-secondary mt-1">Manage your account and platform configuration.</p>

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
          <ActiveContent />
        </div>
      </div>
    </AdminLayout>
  );
}
