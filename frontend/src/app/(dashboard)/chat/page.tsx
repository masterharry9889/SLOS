"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  MessageSquare,
  Trash2,
  Edit2,
  Check,
  X,
  Send,
  StopCircle,
  GraduationCap,
  BookOpen,
  Sparkles,
  FileText,
  CheckCircle2,
  ShieldCheck,
  Copy,
  RotateCcw,
  Key,
  Cpu,
  ChevronDown,
  Layers,
  Sparkle,
} from "lucide-react";
import { useChatSessionsStore } from "@/store/chat-sessions-store";
import { useLLMStore, ACADEMIC_AGENTS } from "@/store/llm-store";
import { useSubjects } from "@/lib/api/subjects";
import { streamAgentChat } from "@/lib/llm-service";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import type { AgentId, ChatLevel, ChatMessage } from "@/types";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const {
    sessions,
    activeSessionId,
    createSession,
    setActiveSession,
    deleteSession,
    renameSession,
    clearSessionMessages,
    setSessionAgent,
    setSessionLevel,
    setSessionSubject,
    addMessage,
    updateMessageContent,
    getActiveSession,
  } = useChatSessionsStore();

  const { providers, activeProviderId, activeModel, hasConfiguredKey } = useLLMStore();
  const { data: subjects = [] } = useSubjects();

  const [inputMessage, setInputMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<AgentId | "all">("all");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  const activeSession = getActiveSession();
  const activeAgent = activeSession
    ? ACADEMIC_AGENTS[activeSession.agentId]
    : ACADEMIC_AGENTS.tutor;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages, isStreaming]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputMessage]);

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.messages.some((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesAgent =
        selectedAgentFilter === "all" || s.agentId === selectedAgentFilter;

      return matchesSearch && matchesAgent;
    });
  }, [sessions, searchQuery, selectedAgentFilter]);

  const handleStartNewChat = (agentId: AgentId = "tutor", subjectId?: string) => {
    const id = createSession({
      agentId,
      subjectId: subjectId || (subjects.length > 0 ? subjects[0].id : undefined),
      provider: activeProviderId,
      model: activeModel,
    });
    setShowNewChatModal(false);
    setActiveSession(id);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputMessage).trim();
    if (!prompt || isStreaming || !activeSession) return;

    setInputMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: prompt,
      created_at: new Date().toISOString(),
    };

    addMessage(activeSession.id, userMessage);

    const assistantMessageId = `asst-${Date.now()}`;
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      level: activeSession.level,
      created_at: new Date().toISOString(),
    };

    addMessage(activeSession.id, assistantMessage);
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const subjectObj = subjects.find((s) => s.id === activeSession.subjectId);
    let streamedContent = "";

    const conversationHistory = [
      ...activeSession.messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: prompt },
    ];

    try {
      await streamAgentChat({
        agentId: activeSession.agentId,
        level: activeSession.level,
        subjectTitle: subjectObj?.title,
        messages: conversationHistory,
        signal: controller.signal,
        onToken: (token) => {
          streamedContent += token;
          updateMessageContent(activeSession.id, assistantMessageId, streamedContent);
        },
        onDone: () => {
          setIsStreaming(false);
          abortControllerRef.current = null;
        },
        onError: (err) => {
          setIsStreaming(false);
          abortControllerRef.current = null;
          updateMessageContent(
            activeSession.id,
            assistantMessageId,
            `${streamedContent}\n\n⚠️ *Stream interrupted: ${err}*`
          );
        },
      });
    } catch (err: unknown) {
      setIsStreaming(false);
      abortControllerRef.current = null;
      const msg = err instanceof Error ? err.message : String(err);
      updateMessageContent(
        activeSession.id,
        assistantMessageId,
        `⚠️ *Error: ${msg}*`
      );
    }
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getAgentIcon = (id: AgentId, className = "h-4 w-4") => {
    switch (id) {
      case "tutor":
        return <GraduationCap className={className} />;
      case "notes":
        return <BookOpen className={className} />;
      case "cheatsheet":
        return <Sparkles className={className} />;
      case "paper":
        return <FileText className={className} />;
      case "assessment":
        return <CheckCircle2 className={className} />;
      case "verifier":
        return <ShieldCheck className={className} />;
    }
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {/* ── Left Sidebar: Chat Sessions ─────────────────────────────────── */}
      <aside className="w-72 sm:w-80 shrink-0 border-r border-border bg-muted/20 flex flex-col justify-between overflow-hidden">
        {/* Top Controls */}
        <div className="p-3.5 space-y-3 border-b border-border bg-card/60">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MessageSquare className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold text-foreground">AI Chats</h2>
            </div>

            <button
              type="button"
              onClick={() => handleStartNewChat(activeSession?.agentId || "tutor")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Chat</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full rounded-xl border border-input bg-background/80 pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          {/* Agent Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setSelectedAgentFilter("all")}
              className={cn(
                "px-2 py-0.5 rounded-md font-medium shrink-0 transition-colors cursor-pointer",
                selectedAgentFilter === "all"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              All
            </button>
            {(Object.keys(ACADEMIC_AGENTS) as AgentId[]).map((agentKey) => (
              <button
                key={agentKey}
                type="button"
                onClick={() => setSelectedAgentFilter(agentKey)}
                className={cn(
                  "px-2 py-0.5 rounded-md font-medium shrink-0 transition-colors cursor-pointer",
                  selectedAgentFilter === agentKey
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {ACADEMIC_AGENTS[agentKey].shortName}
              </button>
            ))}
          </div>
        </div>

        {/* Sessions Scrollable List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredSessions.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No conversations found. Click{" "}
              <button
                type="button"
                onClick={() => handleStartNewChat()}
                className="text-primary hover:underline font-semibold"
              >
                New Chat
              </button>{" "}
              to start.
            </div>
          ) : (
            filteredSessions.map((s) => {
              const isSelected = s.id === activeSessionId;
              const agent = ACADEMIC_AGENTS[s.agentId] || ACADEMIC_AGENTS.tutor;
              const isEditing = editingSessionId === s.id;

              return (
                <div
                  key={s.id}
                  onClick={() => setActiveSession(s.id)}
                  className={cn(
                    "group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-xs transition-all cursor-pointer",
                    isSelected
                      ? "bg-primary/10 text-primary font-semibold ring-1 ring-primary/20 shadow-xs"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className={cn("p-1 rounded-md shrink-0", agent.badgeBg, agent.badgeColor)}>
                      {getAgentIcon(s.agentId, "h-3.5 w-3.5")}
                    </span>

                    {isEditing ? (
                      <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editTitleInput}
                          onChange={(e) => setEditTitleInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              renameSession(s.id, editTitleInput);
                              setEditingSessionId(null);
                            }
                          }}
                          className="w-full rounded border border-primary px-1.5 py-0.5 text-xs bg-background text-foreground"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => {
                            renameSession(s.id, editTitleInput);
                            setEditingSessionId(null);
                          }}
                          className="text-emerald-600 hover:text-emerald-700 p-0.5"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="truncate">{s.title}</span>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0 ml-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSessionId(s.id);
                          setEditTitleInput(s.title);
                        }}
                        className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-background/80"
                        title="Rename"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(s.id);
                        }}
                        className="p-1 text-muted-foreground hover:text-destructive rounded hover:bg-background/80"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer: API Key Status Bar */}
        <div className="p-3 border-t border-border bg-card/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 truncate">
            <Cpu className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-[11px] text-muted-foreground truncate font-mono">
              {providers[activeProviderId]?.name}: {activeModel}
            </span>
          </div>

          <Link
            href="/settings"
            className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline shrink-0"
          >
            <Key className="h-3 w-3" />
            <span>Keys</span>
          </Link>
        </div>
      </aside>

      {/* ── Main Chat Area ──────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col justify-between overflow-hidden bg-background">
        {/* Chat Header Bar */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border bg-card/70 px-5 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <span className={cn("p-2 rounded-xl shrink-0 border", activeAgent.badgeBg, activeAgent.badgeColor)}>
              {getAgentIcon(activeSession?.agentId || "tutor", "h-5 w-5")}
            </span>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-foreground truncate">
                {activeSession?.title || "New Chat"}
              </h1>
              <p className="text-xs text-muted-foreground truncate">
                {activeAgent.role} • {activeAgent.name}
              </p>
            </div>
          </div>

          {/* Controls: Agent Switcher, Level, Subject Context */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Agent Selector Dropdown */}
            {activeSession && (
              <div className="relative">
                <select
                  value={activeSession.agentId}
                  onChange={(e) => setSessionAgent(activeSession.id, e.target.value as AgentId)}
                  className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                >
                  {(Object.keys(ACADEMIC_AGENTS) as AgentId[]).map((key) => (
                    <option key={key} value={key}>
                      Agent: {ACADEMIC_AGENTS[key].shortName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Level Toggle */}
            {activeSession && (
              <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
                {(["simple", "exam", "advanced"] as ChatLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSessionLevel(activeSession.id, lvl)}
                    className={cn(
                      "rounded-md px-2 py-1 font-medium capitalize transition-all cursor-pointer",
                      activeSession.level === lvl
                        ? "bg-background text-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            )}

            {/* Subject Context Selector */}
            {activeSession && subjects.length > 0 && (
              <select
                value={activeSession.subjectId || ""}
                onChange={(e) => setSessionSubject(activeSession.id, e.target.value || undefined)}
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer max-w-[140px] truncate"
              >
                <option value="">No Context</option>
                {subjects.map((subj) => (
                  <option key={subj.id} value={subj.id}>
                    {subj.title}
                  </option>
                ))}
              </select>
            )}

            {/* Clear messages button */}
            {activeSession && activeSession.messages.length > 1 && (
              <button
                type="button"
                onClick={() => clearSessionMessages(activeSession.id)}
                className="rounded-lg border border-border bg-background p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                title="Clear conversation"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </header>

        {/* API Key Missing Warning Banner (if no key set) */}
        {!hasConfiguredKey() && (
          <div className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50/70 px-4 py-2 text-xs text-amber-900 dark:border-amber-950 dark:bg-amber-950/30 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                Running on simulated preview mode. Add your <strong>Google Gemini</strong> or <strong>OpenAI</strong> API key in Settings for full real-time reasoning.
              </span>
            </div>
            <Link
              href="/settings"
              className="inline-flex items-center gap-1 font-semibold text-amber-800 underline dark:text-amber-200 shrink-0"
            >
              Add API Key →
            </Link>
          </div>
        )}

        {/* Messages Stream Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {activeSession?.messages.map((message) => {
            const isUser = message.role === "user";

            return (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 sm:gap-4 max-w-4xl mx-auto",
                  isUser ? "justify-end" : "justify-start"
                )}
              >
                {/* Agent Avatar */}
                {!isUser && (
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border shadow-xs",
                      activeAgent.badgeBg,
                      activeAgent.badgeColor
                    )}
                  >
                    {getAgentIcon(activeSession.agentId, "h-4 w-4")}
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={cn(
                    "relative group rounded-2xl px-4 py-3 text-sm leading-relaxed transition-all shadow-xs",
                    isUser
                      ? "bg-primary text-primary-foreground max-w-[85%] sm:max-w-[75%]"
                      : "bg-card border border-border text-foreground max-w-full sm:max-w-[88%]"
                  )}
                >
                  {/* Assistant meta header */}
                  {!isUser && (
                    <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-1.5 mb-2 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-foreground">
                          {activeAgent.shortName} Agent
                        </span>
                        {message.level && (
                          <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] font-mono capitalize">
                            {message.level}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyMessage(message.id, message.content)}
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1 rounded p-1 text-muted-foreground hover:text-foreground transition-opacity cursor-pointer"
                        title="Copy message"
                      >
                        {copiedMessageId === message.id ? (
                          <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Message Content */}
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  ) : message.content ? (
                    <MarkdownRenderer content={message.content} />
                  ) : (
                    <div className="flex items-center gap-1.5 py-1 text-muted-foreground animate-pulse text-xs">
                      <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
                      <span>{activeAgent.shortName} Agent is thinking & composing...</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Starter Prompts (if session has only 1 welcome message) */}
          {activeSession && activeSession.messages.length <= 1 && (
            <div className="max-w-2xl mx-auto pt-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                Suggested Prompts for {activeAgent.shortName}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activeAgent.suggestedPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(prompt)}
                    className="flex items-start gap-2 rounded-xl border border-border bg-card p-3 text-left text-xs font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all shadow-2xs cursor-pointer group"
                  >
                    <span className="mt-0.5 text-primary opacity-60 group-hover:opacity-100">
                      <Sparkles className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex-1 leading-snug">{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <div className="border-t border-border bg-card/60 p-3 sm:p-4">
          <div className="max-w-4xl mx-auto space-y-2">
            <div className="relative flex items-end rounded-2xl border border-input bg-background/90 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask ${activeAgent.name}... (Press Enter to send, Shift+Enter for new line)`}
                rows={1}
                className="w-full resize-none bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none max-h-44 min-h-[46px]"
              />

              <div className="flex items-center gap-1.5 p-2 shrink-0">
                {isStreaming ? (
                  <button
                    type="button"
                    onClick={handleStopStreaming}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-sm cursor-pointer"
                    title="Stop generation"
                  >
                    <StopCircle className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!inputMessage.trim()}
                    onClick={() => handleSendMessage()}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm cursor-pointer"
                    title="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
              <span>
                Engine: <strong className="text-foreground">{providers[activeProviderId]?.name}</strong> ({activeModel})
              </span>
              <span>
                Enter to send • Shift + Enter for newline
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
