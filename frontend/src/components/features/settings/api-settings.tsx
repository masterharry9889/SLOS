"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Server, ShieldCheck, Trash2, TriangleAlert } from "lucide-react";
import {
  getSettings,
  removeLLMProvider,
  saveLLMProvider,
  selectLLMProvider,
} from "@/lib/api/endpoints";
import type { LLMProviderId, UserSettings } from "@/types";

const providers: Array<{
  id: LLMProviderId;
  name: string;
  description: string;
  model: string;
  website: string;
}> = [
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude models for writing, reasoning, and study assistance.",
    model: "claude-3-5-sonnet-20241022",
    website: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT models through the OpenAI API.",
    model: "gpt-4o-mini",
    website: "https://platform.openai.com/api-keys",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    description: "Gemini models with a Google AI API key.",
    model: "gemini-2.0-flash",
    website: "https://aistudio.google.com/app/apikey",
  },
  {
    id: "grok",
    name: "Grok",
    description: "Grok models provided by xAI.",
    model: "grok-3-mini",
    website: "https://console.x.ai/",
  },
  {
    id: "groq",
    name: "Groq",
    description: "Fast inference with Groq-hosted models.",
    model: "llama-3.3-70b-versatile",
    website: "https://console.groq.com/keys",
  },
  {
    id: "local",
    name: "Local / Ollama",
    description: "A local OpenAI-compatible server such as Ollama or vLLM.",
    model: "llama3.2",
    website: "https://ollama.com",
  },
];

interface ApiSettingsProps {
  initialSettings?: UserSettings | null;
}

export function ApiSettings({ initialSettings }: ApiSettingsProps) {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
    initialData: initialSettings ?? undefined,
  });
  const settings = settingsQuery.data;
  const [selectedId, setSelectedId] = useState<LLMProviderId | undefined>();
  const providerId = selectedId ?? settings?.llm?.activeProviderId ?? "anthropic";
  const provider = providers.find((item) => item.id === providerId) ?? providers[0];
  const savedProvider = settings?.llm?.providers[provider.id];
  const [modelDrafts, setModelDrafts] = useState<Partial<Record<LLMProviderId, string>>>({});
  const [baseUrlDrafts, setBaseUrlDrafts] = useState<Partial<Record<LLMProviderId, string>>>({});
  const [keyDrafts, setKeyDrafts] = useState<Partial<Record<LLMProviderId, string>>>({});
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const model = modelDrafts[provider.id] ?? savedProvider?.model ?? provider.model;
  const baseUrl = baseUrlDrafts[provider.id] ?? savedProvider?.baseUrl ?? "";
  const apiKey = keyDrafts[provider.id] ?? "";
  const hasSavedProviders = useMemo(
    () => providers.filter((item) => settings?.llm?.providers[item.id]?.configured),
    [settings],
  );

  const saveMutation = useMutation({
    mutationFn: () => saveLLMProvider({
      providerId: provider.id,
      model: model.trim(),
      ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
      ...(provider.id === "local" ? { baseUrl: baseUrl.trim() } : {}),
    }),
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(["settings"], updatedSettings);
      setSelectedId(provider.id);
      setKeyDrafts((drafts) => ({ ...drafts, [provider.id]: "" }));
      setMessage({ kind: "success", text: `${provider.name} verified and saved. AI requests now use this provider.` });
    },
    onError: (error: Error) => setMessage({ kind: "error", text: error.message }),
  });

  const activateMutation = useMutation({
    mutationFn: selectLLMProvider,
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(["settings"], updatedSettings);
      setMessage({ kind: "success", text: `${provider.name} is now your active AI provider.` });
    },
    onError: (error: Error) => setMessage({ kind: "error", text: error.message }),
  });

  const removeMutation = useMutation({
    mutationFn: removeLLMProvider,
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(["settings"], updatedSettings);
      setMessage({ kind: "success", text: `${provider.name} credentials removed.` });
    },
    onError: (error: Error) => setMessage({ kind: "error", text: error.message }),
  });

  const isPending = saveMutation.isPending || activateMutation.isPending || removeMutation.isPending;

  return (
    <section className="space-y-6 rounded-2xl border border-border bg-card p-6">
      <header className="flex items-start gap-3">
        <span className="rounded-xl bg-primary/10 p-2 text-primary">
          <Server className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-foreground">LLM provider</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Connect and verify a provider. The active provider is used for chat and AI generation.
            API keys are encrypted on the server and never returned to this browser.
          </p>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((item) => {
          const configured = settings?.llm?.providers[item.id]?.configured;
          const active = settings?.llm?.activeProviderId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSelectedId(item.id);
                setMessage(null);
                if (configured && !active) activateMutation.mutate(item.id);
              }}
              className={`rounded-xl border p-4 text-left transition-colors ${
                provider.id === item.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-semibold text-foreground">{item.name}</span>
                {active ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Active
                  </span>
                ) : configured ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Verified" />
                ) : null}
              </span>
              <span className="mt-2 block text-xs leading-relaxed text-muted-foreground">{item.description}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 rounded-xl border border-border bg-background/50 p-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="llm-api-key" className="block text-xs font-semibold text-foreground">
            {provider.name} API key {provider.id === "local" ? "(optional)" : ""}
          </label>
          <input
            id="llm-api-key"
            type="password"
            autoComplete="new-password"
            value={apiKey}
            onChange={(event) => setKeyDrafts((drafts) => ({ ...drafts, [provider.id]: event.target.value }))}
            placeholder={savedProvider?.configured ? "Saved securely — enter a new key to replace it" : "Paste your provider API key"}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground">
            Get a key from{" "}
            <a className="font-medium text-primary underline-offset-4 hover:underline" href={provider.website} target="_blank" rel="noreferrer">
              {provider.name}
            </a>
            . Keys are not stored in browser storage.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="llm-model" className="block text-xs font-semibold text-foreground">Model</label>
          <input
            id="llm-model"
            value={model}
            onChange={(event) => setModelDrafts((drafts) => ({ ...drafts, [provider.id]: event.target.value }))}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Provider model identifier"
          />
        </div>

        {provider.id === "local" && (
          <div className="space-y-2">
            <label htmlFor="llm-base-url" className="block text-xs font-semibold text-foreground">Provider Base URL</label>
            <input
              id="llm-base-url"
              value={baseUrl}
              onChange={(event) => setBaseUrlDrafts((drafts) => ({ ...drafts, local: event.target.value }))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter the provider base URL"
            />
            <p className="text-xs text-muted-foreground">
              Accepts HTTP(S) URLs and custom paths. Remote URLs require HTTPS. For private LAN
              hosts, add the hostname or IP to <code>LLM_LOCAL_ALLOWED_HOSTS</code> in both services.
              Docker users can try http://host.docker.internal:11434/v1.
            </p>
          </div>
        )}
      </div>

      {message && (
        <div
          role="status"
          className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${
            message.kind === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
          }`}
        >
          {message.kind === "success" ? <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> : <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      <footer className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={isPending || !model.trim() || (provider.id !== "local" && !apiKey.trim() && !savedProvider?.configured)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Verify &amp; save
        </button>
        {savedProvider?.configured && (
          <button
            type="button"
            onClick={() => removeMutation.mutate(provider.id)}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            {removeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Remove provider
          </button>
        )}
        {settings?.llm?.activeProviderId && (
          <span className="text-xs text-muted-foreground">
            {hasSavedProviders.length} provider{hasSavedProviders.length === 1 ? "" : "s"} verified
          </span>
        )}
      </footer>
    </section>
  );
}
