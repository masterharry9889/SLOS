"use client";

import { Server, ShieldCheck } from "lucide-react";

export function ApiSettings() {
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-primary/10 p-2 text-primary">
          <Server className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-foreground">Server-managed AI</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Chat and generation requests go through the authenticated backend and agents service.
            Provider credentials are configured by the service operator and are never stored in
            this browser.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        <span>AI requests are proxied by the Student Life OS backend.</span>
      </div>
    </section>
  );
}
