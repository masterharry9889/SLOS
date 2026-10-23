"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Download, Loader2, CheckCircle2, FileArchive, Database, ExternalLink } from "lucide-react";
import { exportData } from "@/lib/api/endpoints";
import { useToast } from "@/components/ui/toaster";
import { DangerZone } from "./danger-zone";

export function DataSettings() {
  const { addToast } = useToast();
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const exportMutation = useMutation({
    mutationFn: exportData,
    onSuccess: (data) => {
      setDownloadUrl(data.download_url);
      addToast(
        "Your data export has been prepared and is ready for download.",
        "success",
        "Export Ready"
      );

      // Trigger browser download if URL is direct
      if (data.download_url && typeof window !== "undefined") {
        const link = document.createElement("a");
        link.href = data.download_url;
        link.download = `slos-data-export-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to generate data export.";
      addToast(msg, "error", "Export Error");
    },
  });

  const handleExport = () => {
    exportMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Data Export Card */}
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm">
        <div className="mb-6 border-b border-border pb-4">
          <h2 className="text-lg font-semibold text-foreground">Data Management & Portability</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Download a full copy of your Student Life OS data or manage account ownership.
          </p>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-muted/30 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="rounded-lg bg-primary/10 p-2.5 text-primary shrink-0 mt-0.5">
                <Database className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">Export All Student Data</h3>
                <p className="text-xs text-muted-foreground max-w-lg leading-relaxed">
                  Export a comprehensive archive containing your registered subjects, topic trees, markdown notes, quiz history, and study timer records in JSON format.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExport}
              disabled={exportMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0"
            >
              {exportMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Export...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export My Data
                </>
              )}
            </button>
          </div>

          {/* Download link notification card if ready */}
          {downloadUrl && (
            <div className="rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-4 flex items-center justify-between gap-4 animate-in fade-in-0 duration-200">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                    Export successfully generated!
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    If your download did not start automatically, use the direct link.
                  </p>
                </div>
              </div>

              <a
                href={downloadUrl}
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                Download File
              </a>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-muted-foreground">
            <div className="rounded-lg border border-border/80 p-3 bg-card/60">
              <p className="font-semibold text-foreground mb-1">Standard Format</p>
              Machine-readable structured JSON format compatible with external tools.
            </div>
            <div className="rounded-lg border border-border/80 p-3 bg-card/60">
              <p className="font-semibold text-foreground mb-1">Complete Notes</p>
              Includes all markdown notes, formula cheat sheets, and question banks.
            </div>
            <div className="rounded-lg border border-border/80 p-3 bg-card/60">
              <p className="font-semibold text-foreground mb-1">Privacy Focused</p>
              Exports are generated securely and can only be downloaded by your account.
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone Section */}
      <DangerZone />
    </div>
  );
}
