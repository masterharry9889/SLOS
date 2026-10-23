"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  User,
  Palette,
  Globe,
  Database,
  ChevronRight,
  Settings as SettingsIcon,
  Shield,
  Loader2,
} from "lucide-react";
import { getSettings } from "@/lib/api/endpoints";
import { useAuthStore } from "@/lib/store/auth-store";
import { cn } from "@/lib/utils";
import { ProfileForm } from "@/components/features/settings/profile-form";
import { AppearanceSettings } from "@/components/features/settings/appearance-settings";
import { PreferencesSettings } from "@/components/features/settings/preferences-settings";
import { DataSettings } from "@/components/features/settings/data-settings";
import { ApiSettings } from "@/components/features/settings/api-settings";
import { Key } from "lucide-react";

type TabId = "profile" | "api-keys" | "appearance" | "preferences" | "data";

interface TabDefinition {
  id: TabId;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tabs: TabDefinition[] = [
  {
    id: "profile",
    label: "Profile",
    description: "Personal details, avatar, and display settings",
    icon: User,
  },
  {
    id: "api-keys",
    label: "LLM & API Keys",
    description: "Configure Gemini, OpenAI, Claude & Groq API keys",
    icon: Key,
  },
  {
    id: "appearance",
    label: "Appearance",
    description: "Visual theme, dark mode, and interface scaling",
    icon: Palette,
  },
  {
    id: "preferences",
    label: "Preferences",
    description: "Language locale and study options",
    icon: Globe,
  },
  {
    id: "data",
    label: "Data & Privacy",
    description: "Export backups and account management",
    icon: Database,
  },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const { user } = useAuthStore();

  // Fetch user settings using TanStack Query
  const { data: settings, isLoading, isError } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb: Dashboard > Settings */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link
          href="/"
          className="hover:text-foreground transition-colors font-medium"
        >
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
        <span className="font-semibold text-foreground">Settings</span>
      </nav>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <SettingsIcon className="h-6 w-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Settings
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Manage your personal profile, application appearance, regional language preferences, and data privacy.
          </p>
        </div>

        {/* Security badge / status */}
        <div className="flex items-center gap-2 self-start sm:self-center px-3 py-1.5 rounded-full border border-border bg-card text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5 text-emerald-500" />
          <span>Student OS Secure</span>
        </div>
      </div>

      {/* Tabbed Navigation */}
      <div className="space-y-6">
        <div className="border-b border-border">
          <nav
            role="tablist"
            aria-label="Settings navigation"
            className="flex space-x-2 sm:space-x-4 overflow-x-auto scrollbar-none pb-px"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`tabpanel-${tab.id}`}
                  id={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  type="button"
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap border-b-2 py-3 px-3 text-xs sm:text-sm font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-t-md",
                    isActive
                      ? "border-primary text-primary font-semibold bg-primary/5"
                      : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Panels */}
        <div className="mt-4">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div
              role="tabpanel"
              id="tabpanel-profile"
              aria-labelledby="tab-profile"
              className="animate-in fade-in-50 duration-200"
            >
              <ProfileForm initialUser={user} />
            </div>
          )}

          {/* API Keys Tab */}
          {activeTab === "api-keys" && (
            <div
              role="tabpanel"
              id="tabpanel-api-keys"
              aria-labelledby="tab-api-keys"
              className="animate-in fade-in-50 duration-200"
            >
              <ApiSettings />
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === "appearance" && (
            <div
              role="tabpanel"
              id="tabpanel-appearance"
              aria-labelledby="tab-appearance"
              className="animate-in fade-in-50 duration-200"
            >
              <AppearanceSettings />
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === "preferences" && (
            <div
              role="tabpanel"
              id="tabpanel-preferences"
              aria-labelledby="tab-preferences"
              className="animate-in fade-in-50 duration-200"
            >
              {isLoading ? (
                <div className="rounded-xl border border-border bg-card p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-xs">Loading preferences...</p>
                </div>
              ) : (
                <PreferencesSettings initialSettings={settings} />
              )}
            </div>
          )}

          {/* Data & Privacy Tab */}
          {activeTab === "data" && (
            <div
              role="tabpanel"
              id="tabpanel-data"
              aria-labelledby="tab-data"
              className="animate-in fade-in-50 duration-200"
            >
              <DataSettings />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
