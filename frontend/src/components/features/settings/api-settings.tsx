"use client";

import React, { useState } from "react";
import {
  Key,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  ExternalLink,
  Shield,
  Loader2,
  Trash2,
  Cpu,
  Server,
  Zap,
  CheckCircle2,
  AlertCircle,
  Copy,
} from "lucide-react";
import { useLLMStore, testProviderApiKey } from "@/store/llm-store";
import type { LLMProviderId } from "@/types";
import { cn } from "@/lib/utils";

export function ApiSettings() {
  const {
    providers,
    activeProviderId,
    activeModel,
    setApiKey,
    setDefaultModel,
    setBaseUrl,
    setActiveProvider,
    clearApiKey,
  } = useLLMStore();

  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Record<string, { success: boolean; message: string }>
  >({});
  const [savedFeedbacks, setSavedFeedbacks] = useState<Record<string, boolean>>({});

  const toggleVisibility = (id: string) => {
    setVisibleKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = (id: LLMProviderId) => {
    setSavedFeedbacks((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setSavedFeedbacks((prev) => ({ ...prev, [id]: false }));
    }, 2000);
  };

  const handleTest = async (id: LLMProviderId) => {
    const config = providers[id];
    setTestingProvider(id);
    setTestResults((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    const result = await testProviderApiKey(
      id,
      config.apiKey,
      config.defaultModel,
      config.baseUrl
    );

    setTestingProvider(null);
    setTestResults((prev) => ({ ...prev, [id]: result }));
  };

  const getProviderIcon = (id: LLMProviderId) => {
    switch (id) {
      case "gemini":
        return <Sparkles className="h-5 w-5 text-indigo-500" />;
      case "openai":
        return <Cpu className="h-5 w-5 text-emerald-500" />;
      case "anthropic":
        return <Zap className="h-5 w-5 text-amber-500" />;
      case "groq":
        return <Zap className="h-5 w-5 text-orange-500" />;
      case "deepseek":
        return <Server className="h-5 w-5 text-blue-500" />;
      case "custom":
        return <Server className="h-5 w-5 text-purple-500" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Privacy & Security Header Card */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/70 via-background to-purple-50/50 p-6 dark:border-indigo-900/50 dark:from-indigo-950/20 dark:to-purple-950/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                <Key className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-bold text-foreground">
                LLM & Agent API Keys
              </h2>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                Client Vault
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
              Configure your own API keys to power Student Life OS agents (Tutor, Notes, Cheatsheets, Exam Papers).
              Keys are stored securely in your browser&apos;s local storage and used directly for inference.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3.5 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Encrypted in Browser</span>
          </div>
        </div>
      </div>

      {/* Active Default Provider Selector */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Default Agent Engine
            </h3>
            <p className="text-xs text-muted-foreground">
              Select which provider will power your chat and content-generation agents by default.
            </p>
          </div>
          <span className="text-xs font-mono font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-md">
            Model: {activeModel}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-1">
          {(Object.keys(providers) as LLMProviderId[]).map((id) => {
            const p = providers[id];
            const isSelected = activeProviderId === id;
            const hasKey = Boolean(p.apiKey && p.apiKey.trim().length > 0) || id === "custom";

            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveProvider(id)}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all text-center gap-1.5 cursor-pointer relative",
                  isSelected
                    ? "border-primary bg-primary/10 text-primary shadow-sm font-semibold ring-2 ring-primary/20"
                    : "border-border bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                )}
              >
                {getProviderIcon(id)}
                <span className="truncate w-full">{p.name.replace("Google ", "").replace(" Cloud", "")}</span>
                {hasKey ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 absolute top-2 right-2" title="Key configured" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 absolute top-2 right-2" title="No key" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Provider API Key Cards */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold tracking-tight text-foreground">
          Provider Configurations
        </h3>

        <div className="grid grid-cols-1 gap-4">
          {(Object.keys(providers) as LLMProviderId[]).map((id) => {
            const config = providers[id];
            const isVisible = visibleKeys[id] || false;
            const isTesting = testingProvider === id;
            const testResult = testResults[id];
            const isSaved = savedFeedbacks[id] || false;
            const hasKey = Boolean(config.apiKey && config.apiKey.trim().length > 0);

            return (
              <div
                key={id}
                className={cn(
                  "rounded-2xl border transition-all p-5 space-y-4",
                  activeProviderId === id
                    ? "border-primary/50 bg-card shadow-md shadow-primary/5 ring-1 ring-primary/20"
                    : "border-border bg-card/60 hover:border-border/80"
                )}
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background shadow-xs">
                      {getProviderIcon(id)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-foreground">
                          {config.name}
                        </h4>
                        {activeProviderId === id && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                            Default
                          </span>
                        )}
                        {hasKey ? (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <Check className="h-3 w-3" /> Configured
                          </span>
                        ) : (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            Not Set
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {config.description}
                      </p>
                    </div>
                  </div>

                  <a
                    href={config.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline self-start sm:self-center shrink-0"
                  >
                    <span>Get API Key</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {/* Inputs grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
                  {/* API Key Input */}
                  <div className={cn("space-y-1.5", id === "custom" ? "md:col-span-4" : "md:col-span-8")}>
                    <label
                      htmlFor={`api-key-${id}`}
                      className="text-xs font-semibold text-foreground flex items-center justify-between"
                    >
                      <span>API Key</span>
                      {hasKey && (
                        <span className="text-[10px] font-normal text-muted-foreground">
                          {config.apiKey.length} characters
                        </span>
                      )}
                    </label>

                    <div className="relative flex items-center">
                      <input
                        id={`api-key-${id}`}
                        type={isVisible ? "text" : "password"}
                        value={config.apiKey}
                        onChange={(e) => setApiKey(id, e.target.value)}
                        placeholder={`Enter your ${config.name} API Key...`}
                        className="w-full rounded-xl border border-input bg-background/80 px-3.5 py-2.5 pr-20 text-xs font-mono text-foreground placeholder:text-muted-foreground/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      />
                      <div className="absolute right-1.5 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleVisibility(id)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                          title={isVisible ? "Hide API Key" : "Show API Key"}
                        >
                          {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        {hasKey && (
                          <button
                            type="button"
                            onClick={() => clearApiKey(id)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                            title="Clear Key"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Custom Base URL (if custom) */}
                  {id === "custom" && (
                    <div className="md:col-span-4 space-y-1.5">
                      <label
                        htmlFor={`base-url-${id}`}
                        className="text-xs font-semibold text-foreground"
                      >
                        Base URL
                      </label>
                      <input
                        id={`base-url-${id}`}
                        type="text"
                        value={config.baseUrl || ""}
                        onChange={(e) => setBaseUrl(id, e.target.value)}
                        placeholder="http://localhost:11434/v1"
                        className="w-full rounded-xl border border-input bg-background/80 px-3.5 py-2.5 text-xs font-mono text-foreground placeholder:text-muted-foreground/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      />
                    </div>
                  )}

                  {/* Model Selector */}
                  <div className="md:col-span-4 space-y-1.5">
                    <label
                      htmlFor={`model-select-${id}`}
                      className="text-xs font-semibold text-foreground"
                    >
                      Default Model
                    </label>
                    <select
                      id={`model-select-${id}`}
                      value={config.defaultModel}
                      onChange={(e) => setDefaultModel(id, e.target.value)}
                      className="w-full rounded-xl border border-input bg-background/80 px-3.5 py-2.5 text-xs font-medium text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                    >
                      {config.availableModels.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Test results banner */}
                {testResult && (
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-xl p-3 text-xs",
                      testResult.success
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "border border-destructive/20 bg-destructive/10 text-destructive dark:border-destructive/30"
                    )}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                    )}
                    <span className="flex-1 font-medium">{testResult.message}</span>
                  </div>
                )}

                {/* Actions row */}
                <div className="flex items-center justify-between pt-1 border-t border-border/40">
                  <div className="text-[11px] text-muted-foreground">
                    {activeProviderId === id ? (
                      <span className="text-primary font-medium">Currently active engine for all agents</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveProvider(id)}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer hover:underline"
                      >
                        Make default engine
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isTesting || (!hasKey && id !== "custom")}
                      onClick={() => handleTest(id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isTesting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                          <span>Testing...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="h-3.5 w-3.5 text-amber-500" />
                          <span>Test Connection</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSave(id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                        isSaved
                          ? "bg-emerald-600 text-white"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      )}
                    >
                      {isSaved ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Saved!</span>
                        </>
                      ) : (
                        <span>Save Key</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommended Setup Box */}
      <div className="rounded-2xl border border-border bg-muted/30 p-5 space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Academic Optimization Tip
        </h4>
        <p className="text-xs text-muted-foreground leading-relaxed">
          For fast mathematical proofs, derivations, and multi-page syllabus indexing, we recommend starting with{" "}
          <strong className="text-foreground">Google Gemini 2.5 Flash</strong> (free tier available on Google AI Studio) or{" "}
          <strong className="text-foreground">Groq Cloud (Llama 3.3 70B)</strong> for instantaneous token streaming.
        </p>
      </div>
    </div>
  );
}
