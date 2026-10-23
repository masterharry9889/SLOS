'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { cn } from '@/lib/utils';

export interface MarkdownRendererProps {
  content: string;
  className?: string;
  compact?: boolean;
}

export function MarkdownRenderer({
  content,
  className,
  compact = false,
}: MarkdownRendererProps) {
  return (
    <div
      className={cn(
        'prose-student text-foreground leading-relaxed',
        compact ? 'text-xs space-y-1.5' : 'text-sm space-y-3',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ ...props }) => (
            <h1
              className={cn(
                'font-bold tracking-tight text-foreground border-b border-border pb-1 mb-2',
                compact ? 'text-base mt-2' : 'text-xl mt-4'
              )}
              {...props}
            />
          ),
          h2: ({ ...props }) => (
            <h2
              className={cn(
                'font-semibold tracking-tight text-foreground border-l-2 border-primary pl-2 mb-1.5',
                compact ? 'text-sm mt-2' : 'text-lg mt-3'
              )}
              {...props}
            />
          ),
          h3: ({ ...props }) => (
            <h3
              className={cn(
                'font-medium text-foreground mb-1',
                compact ? 'text-xs mt-1.5 font-bold' : 'text-base mt-2.5'
              )}
              {...props}
            />
          ),
          p: ({ ...props }) => (
            <p
              className={cn(
                'text-foreground/90 break-words',
                compact ? 'my-0.5 leading-snug' : 'my-1.5 leading-normal'
              )}
              {...props}
            />
          ),
          strong: ({ ...props }) => (
            <strong
              className="font-bold text-foreground bg-primary/10 px-1 py-0.5 rounded text-[0.95em]"
              {...props}
            />
          ),
          em: ({ ...props }) => (
            <em className="italic text-foreground/90" {...props} />
          ),
          ul: ({ ...props }) => (
            <ul
              className={cn(
                'list-disc list-inside space-y-0.5 text-foreground/90',
                compact ? 'my-1 pl-1' : 'my-2 pl-2'
              )}
              {...props}
            />
          ),
          ol: ({ ...props }) => (
            <ol
              className={cn(
                'list-decimal list-inside space-y-0.5 text-foreground/90',
                compact ? 'my-1 pl-1' : 'my-2 pl-2'
              )}
              {...props}
            />
          ),
          li: ({ ...props }) => (
            <li className={cn(compact ? 'leading-tight' : 'leading-relaxed')} {...props} />
          ),
          blockquote: ({ ...props }) => (
            <blockquote
              className={cn(
                'border-l-3 border-primary/50 bg-muted/40 italic rounded-r py-1 px-3 text-muted-foreground',
                compact ? 'my-1 text-[11px]' : 'my-2.5 text-xs'
              )}
              {...props}
            />
          ),
          table: ({ ...props }) => (
            <div className="overflow-x-auto my-2 w-full rounded border border-border">
              <table className="w-full text-left border-collapse text-xs" {...props} />
            </div>
          ),
          thead: ({ ...props }) => (
            <thead className="bg-muted/70 text-foreground font-semibold border-b border-border" {...props} />
          ),
          tbody: ({ ...props }) => (
            <tbody className="divide-y divide-border/60 bg-card/50" {...props} />
          ),
          tr: ({ ...props }) => (
            <tr className="hover:bg-muted/30 transition-colors" {...props} />
          ),
          th: ({ ...props }) => (
            <th className={cn(compact ? 'px-2 py-1' : 'px-3 py-1.5')} {...props} />
          ),
          td: ({ ...props }) => (
            <td className={cn(compact ? 'px-2 py-1' : 'px-3 py-1.5')} {...props} />
          ),
          code: ({ inline, ...props }: { inline?: boolean } & React.HTMLAttributes<HTMLElement>) => {
            if (inline) {
              return (
                <code
                  className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground font-medium border border-border/50"
                  {...props}
                />
              );
            }
            return (
              <div className="my-2 overflow-x-auto rounded-md bg-muted/80 p-2.5 text-xs font-mono border border-border text-foreground">
                <code className="block" {...props} />
              </div>
            );
          },
          hr: () => <hr className="my-3 border-border" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default MarkdownRenderer;
