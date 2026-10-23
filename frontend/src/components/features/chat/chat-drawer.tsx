'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Sparkles,
  Trash2,
  RefreshCw,
  HelpCircle,
  AlertCircle,
  Lightbulb,
  GraduationCap,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store';
import { useChat } from '@/hooks/useChat';
import { ChatMessage } from './chat-message';
import { Skeleton } from '@/components/ui/skeleton';
import type { ChatLevel, Citation } from '@/types';

interface ChatDrawerProps {
  subjectId: string;
  chapterId?: string;
  chapterTitle?: string;
  onCitationClick?: (citation: Citation) => void;
}

const LEVEL_OPTIONS: {
  id: ChatLevel;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}[] = [
  {
    id: 'simple',
    label: 'Simple',
    icon: Lightbulb,
    description: 'Beginner-friendly analogies and intuitive breakdowns',
  },
  {
    id: 'exam',
    label: 'Exam Level',
    icon: GraduationCap,
    description: 'Textbook precision, key scoring keywords, and formulas',
  },
  {
    id: 'advanced',
    label: 'Advanced',
    icon: Zap,
    description: 'Deep theoretical nuances, proofs, and edge cases',
  },
];

const SUGGESTED_QUESTIONS = [
  'Explain the most challenging concept in this chapter with an analogy',
  'What are the typical exam pitfalls or tricky questions here?',
  'Summarize the core formulas and when to apply each',
  'Provide a quick 3-question self-test on these topics',
];

export function ChatDrawer({
  subjectId,
  chapterId,
  chapterTitle,
  onCitationClick,
}: ChatDrawerProps) {
  const { chatDrawerOpen, toggleChatDrawer } = useUIStore();
  const {
    messages,
    isLoading,
    isStreaming,
    error,
    level,
    setLevel,
    sendMessage,
    clearHistory,
    retryLastMessage,
  } = useChat(subjectId, chapterId);

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new message or streaming token
  useEffect(() => {
    if (chatDrawerOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming, chatDrawerOpen]);

  // Focus textarea when drawer opens
  useEffect(() => {
    if (chatDrawerOpen) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [chatDrawerOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && chatDrawerOpen) {
        toggleChatDrawer(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chatDrawerOpen, toggleChatDrawer]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput('');
    await sendMessage(trimmed, level);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectSuggested = (question: string) => {
    setInput(question);
    textareaRef.current?.focus();
  };

  const handleInternalCitationClick = (citation: Citation) => {
    if (onCitationClick) {
      onCitationClick(citation);
    } else {
      // Default fallback: search for element with section slug
      const sectionEl = document.getElementById(citation.section);
      if (sectionEl) {
        sectionEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  if (!chatDrawerOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden print:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        onClick={() => toggleChatDrawer(false)}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-6">
        <aside
          aria-label="Doubt solver chat"
          className="flex h-full w-screen max-w-md sm:max-w-lg flex-col bg-card border-l border-border shadow-2xl transition-transform duration-300 ease-in-out animate-in slide-in-from-right"
        >
          {/* 1. Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-muted/20">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span>Ask a Doubt</span>
                  <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.2 text-[10px] font-bold">
                    AI Active
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground truncate max-w-[220px]">
                  {chapterTitle ? chapterTitle : 'Course Material Tutor'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={clearHistory}
                  disabled={isStreaming}
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
                  title="Clear conversation history"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => toggleChatDrawer(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Close drawer (Esc)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 2. Level Selector */}
          <div className="border-b border-border bg-background px-4 py-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Explanation Depth
              </span>
              <span className="text-[10px] text-muted-foreground italic">
                {LEVEL_OPTIONS.find((l) => l.id === level)?.description}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {LEVEL_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = level === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setLevel(opt.id)}
                    className={cn(
                      'flex items-center justify-center gap-1.5 rounded-xl py-1.5 px-2 text-xs font-semibold transition-all cursor-pointer',
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Messages List Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
            {isLoading ? (
              <div className="space-y-4 py-4">
                <div className="flex items-start gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-20 w-3/4 rounded-xl" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Skeleton className="h-14 w-2/3 rounded-xl" />
                </div>
              </div>
            ) : messages.length === 0 ? (
              /* Empty State with Suggested Questions */
              <div className="py-8 text-center space-y-6">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <HelpCircle className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-foreground">
                    Have doubts about this topic?
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Ask questions in natural language, request step-by-step derivations, or clarify tricky concepts.
                  </p>
                </div>

                <div className="space-y-2 text-left pt-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                    Suggested Questions
                  </span>
                  <div className="space-y-1.5">
                    {SUGGESTED_QUESTIONS.map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSuggested(q)}
                        className="w-full text-left rounded-xl border border-border bg-background p-2.5 text-xs text-foreground/80 hover:text-foreground hover:border-primary/40 hover:bg-muted/40 transition-colors cursor-pointer"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Message List */
              <>
                {messages.map((msg, index) => (
                  <ChatMessage
                    key={msg.id || index}
                    message={msg}
                    isStreaming={isStreaming && index === messages.length - 1}
                    onCitationClick={handleInternalCitationClick}
                  />
                ))}
              </>
            )}

            {/* Error banner if stream encountered an issue */}
            {error && (
              <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  type="button"
                  onClick={retryLastMessage}
                  className="font-bold underline hover:no-underline ml-2 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 4. Input Area */}
          <div className="border-t border-border bg-card p-3 sm:p-4">
            <form onSubmit={handleSubmit} className="relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask any doubt... (Shift+Enter for newline)"
                rows={2}
                disabled={isStreaming}
                className="w-full resize-none rounded-xl border border-border bg-background p-3 pr-12 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed disabled:opacity-60"
              />

              <button
                type="submit"
                disabled={!input.trim() || isStreaming}
                className="absolute right-2.5 bottom-3.5 flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
                title="Send doubt (Enter)"
              >
                {isStreaming ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </button>
            </form>

            <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-muted-foreground">
              <span>Shift + Enter for new line</span>
              <span>{level.toUpperCase()} level</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
