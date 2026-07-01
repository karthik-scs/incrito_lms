"use client";

import { useState } from "react";
import { Bell, FileText, Settings as SettingsIcon } from "lucide-react";
import { WhatsAppConfigurationTab } from "./whatsapp/WhatsAppConfigurationTab";
import { WhatsAppTemplatesTab } from "./whatsapp/WhatsAppTemplatesTab";
import { WhatsAppNotificationsTab } from "./whatsapp/WhatsAppNotificationsTab";

const SUB_TABS = [
  { key: "configuration", label: "Configuration", icon: SettingsIcon, content: WhatsAppConfigurationTab },
  { key: "templates", label: "Templates", icon: FileText, content: WhatsAppTemplatesTab },
  { key: "notifications", label: "Notifications", icon: Bell, content: WhatsAppNotificationsTab },
] as const;

export function WhatsAppSettingsTab() {
  const [activeSubTab, setActiveSubTab] = useState<(typeof SUB_TABS)[number]["key"]>("configuration");

  const ActiveContent = SUB_TABS.find((tab) => tab.key === activeSubTab)?.content ?? WhatsAppConfigurationTab;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4">
      <nav className="bg-surface border border-border rounded-2xl p-2 flex flex-col gap-1 h-fit">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key === activeSubTab;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-left transition-colors ${
                isActive ? "bg-accent-light text-accent" : "text-text-dark hover:bg-surface-secondary"
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div>
        <ActiveContent />
      </div>
    </div>
  );
}
