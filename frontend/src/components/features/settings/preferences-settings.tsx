"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Globe, Check, Loader2, Languages, CheckCircle2 } from "lucide-react";
import { updateSettings } from "@/lib/api/endpoints";
import { useToast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import type { UserSettings } from "@/types";

interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  region: string;
}

const supportedLanguages: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English (US)", region: "United States" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", region: "India" },
  { code: "es", name: "Spanish", nativeName: "Español", region: "Spain / Latin America" },
  { code: "fr", name: "French", nativeName: "Français", region: "France / Canada" },
  { code: "de", name: "German", nativeName: "Deutsch", region: "Germany / Austria" },
  { code: "ja", name: "Japanese", nativeName: "日本語", region: "Japan" },
];

interface PreferencesSettingsProps {
  initialSettings?: UserSettings | null;
}

export function PreferencesSettings({ initialSettings }: PreferencesSettingsProps) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    initialSettings?.language || "en"
  );
  const [hasChanged, setHasChanged] = useState(false);

  const mutation = useMutation({
    mutationFn: (newLanguage: string) => updateSettings({ language: newLanguage }),
    onSuccess: (data) => {
      queryClient.setQueryData(["settings"], data);
      setHasChanged(false);
      const langObj = supportedLanguages.find((l) => l.code === data.language);
      addToast(
        `Language preference set to ${langObj?.name || data.language}`,
        "success",
        "Preferences Updated"
      );
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to save language preference.";
      addToast(msg, "error", "Error");
    },
  });

  const handleLanguageChange = (code: string) => {
    setSelectedLanguage(code);
    setHasChanged(code !== (initialSettings?.language || "en"));
  };

  const handleSave = () => {
    mutation.mutate(selectedLanguage);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm">
      <div className="mb-6 border-b border-border pb-4">
        <h2 className="text-lg font-semibold text-foreground">Language & Regional Preferences</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Select your primary language for notes generation, summaries, and user interface.
        </p>
      </div>

      <div className="space-y-6">
        <div className="max-w-xl space-y-2">
          <label htmlFor="language-select" className="block text-xs font-semibold text-foreground uppercase tracking-wide">
            Interface & Content Language
          </label>

          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
              <Languages className="h-4 w-4" />
            </div>
            <select
              id="language-select"
              value={selectedLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-4 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors cursor-pointer"
            >
              {supportedLanguages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} — {lang.nativeName} ({lang.region})
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-muted-foreground pt-1">
            AI note-taking and revision cheat sheets will adapt prompts and translations to match this locale.
          </p>
        </div>

        {/* Visual Grid of Language Badges */}
        <div className="pt-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Quick Selector
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {supportedLanguages.map((lang) => {
              const isActive = selectedLanguage === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleLanguageChange(lang.code)}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border text-left transition-all cursor-pointer",
                    isActive
                      ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/30"
                      : "border-border bg-background hover:bg-muted/50 text-foreground"
                  )}
                >
                  <div className="truncate">
                    <p className="text-xs font-semibold truncate">{lang.nativeName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{lang.name}</p>
                  </div>
                  {isActive && <Check className="h-4 w-4 text-primary shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <button
            type="button"
            disabled={!hasChanged || mutation.isPending}
            onClick={() => {
              setSelectedLanguage(initialSettings?.language || "en");
              setHasChanged(false);
            }}
            className="px-4 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanged || mutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Save Preferences
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
