'use client';

import React, { useState } from 'react';
import {
  Copy,
  Check,
  Sparkles,
  User as UserIcon,
  FileText,
  Layers,
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { MarkdownRenderer } from '../notes/markdown-renderer';
import type { ChatMessage as ChatMessageType, Citation } from '@/types';

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
  onCitationClick?: (citation: Citation) => void;
}

export function ChatMessage({
  message,
  isStreaming,
  onCitationClick,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const isAssistant = !isUser;
  const isTyping = isAssistant && isStreaming && (!message.content || message.content.length === 0);

  const handleCopy = () => {
    if (!message.content) return;
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        'group flex w-full flex-col gap-1.5 transition-opacity',
        isUser ? 'items-end' : 'items-start'
      )}
    >
      {/* Header Info: Role, Level Badge, and Timestamp */}
      <div className="flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
        {isAssistant ? (
          <div className="flex items-center gap-1.5 font-bold text-foreground">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-2.5 w-2.5" />
            </span>
            <span>Doubt Solver</span>
            {message.level && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[9px] font-extrabold uppercase tracking-wider text-primary">
                {message.level}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 font-semibold text-muted-foreground">
            <UserIcon className="h-3 w-3" />
            <span>You</span>
          </div>
        )}

        <span>•</span>
        <span className="text-[10px]">
          {message.created_at ? formatRelativeTime(message.created_at) : 'Just now'}
        </span>
      </div>

      {/* Message Bubble */}
      <div
        className={cn(
          'relative max-w-[88%] sm:max-w-[82%] rounded-2xl p-4 text-xs shadow-2xs transition-all',
          isUser
            ? 'rounded-tr-xs bg-primary text-primary-foreground font-medium selection:bg-primary-foreground/30'
            : 'rounded-tl-xs border border-border bg-card text-card-foreground'
        )}
      >
        {/* Copy button on hover for assistant messages */}
        {isAssistant && message.content && (
          <button
            type="button"
            onClick={handleCopy}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer border border-border/50 shadow-2xs"
            title="Copy response to clipboard"
          >
            {copied ? (
              <Check className="h-3 w-3 text-emerald-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        )}

        {/* Content Rendering */}
        {isTyping ? (
          /* Typing indicator (3 animated dots) */
          <div className="flex items-center gap-1.5 py-2 px-1">
            <span
              className="h-2 w-2 rounded-full bg-primary/60 animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="h-2 w-2 rounded-full bg-primary/60 animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="h-2 w-2 rounded-full bg-primary/60 animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </div>
        ) : isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed text-sm">
            {message.content}
          </p>
        ) : (
          <div className="prose-xs space-y-2">
            <MarkdownRenderer
              content={message.content}
              className="text-xs leading-relaxed"
            />
            {isStreaming && (
              <span className="inline-block h-3.5 w-1.5 translate-y-0.5 bg-primary animate-pulse ml-0.5 rounded-xs" />
            )}
          </div>
        )}

        {/* Citations section if present */}
        {isAssistant && message.citations && message.citations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/60">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              <Layers className="h-3 w-3 text-primary" />
              <span>Referenced Sources</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {message.citations.map((citation, index) => (
                <button
                  key={`${citation.note_id}-${citation.section}-${index}`}
                  type="button"
                  onClick={() => onCitationClick?.(citation)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-background/80 hover:bg-primary/10 hover:border-primary/40 px-2 py-1 text-[11px] font-medium text-foreground transition-colors cursor-pointer text-left shadow-2xs"
                  title={`Jump to section "${citation.section}" in ${citation.chapter_title}`}
                >
                  <FileText className="h-3 w-3 text-primary shrink-0" />
                  <span className="font-semibold text-primary truncate max-w-[140px]">
                    {citation.section || citation.chapter_title}
                  </span>
                  {citation.page !== undefined && (
                    <span className="text-muted-foreground text-[10px]">
                      (p. {citation.page})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
