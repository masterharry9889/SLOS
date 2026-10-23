'use client';

import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import {
  Link as LinkIcon,
  Copy,
  Check,
  Quote,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { slugify } from './table-of-contents';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  onCitationClick?: (page: number) => void;
}

/**
 * Parses inline citations like [Page 5] or [source:page:5] in text
 */
function parseCitationsInText(
  text: string,
  onCitationClick?: (page: number) => void
): React.ReactNode {
  const citationRegex = /\[(?:source:page:(\d+)|Page\s*(\d+))\]/gi;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = citationRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const pageNum = parseInt(match[1] || match[2], 10);
    parts.push(
      <button
        key={`citation-${match.index}-${pageNum}`}
        type="button"
        onClick={() => onCitationClick?.(pageNum)}
        className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/25 hover:bg-primary/20 hover:border-primary/50 transition-all cursor-pointer align-baseline shadow-2xs"
        title={`View referenced source document page ${pageNum}`}
      >
        <FileText className="h-3 w-3 opacity-75" />
        <span>Page {pageNum}</span>
      </button>
    );
    lastIndex = citationRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

function processChildrenCitations(
  children: React.ReactNode,
  onCitationClick?: (page: number) => void
): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child === 'string') {
      return parseCitationsInText(child, onCitationClick);
    }
    return child;
  });
}

/**
 * Custom CodeBlock with top bar, detected language, and clipboard copy button
 */
function CodeBlock({ children, ...props }: React.ComponentPropsWithoutRef<'pre'>) {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  const handleCopy = () => {
    if (!preRef.current) return;
    const text = preRef.current.innerText || '';
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  let language = 'code';
  if (
    React.isValidElement(children) &&
    typeof children.props === 'object' &&
    children.props !== null
  ) {
    const childProps = children.props as { className?: string };
    const match = /language-([a-zA-Z0-9_-]+)/.exec(childProps.className || '');
    if (match) {
      language = match[1];
    }
  }

  return (
    <div className="relative group my-4 rounded-xl border border-border/80 bg-zinc-950 dark:bg-zinc-900/90 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-zinc-900/90 dark:bg-zinc-950 border-b border-zinc-800 text-zinc-400 text-[11px] font-mono">
        <span className="uppercase font-semibold tracking-wider text-[10px] text-zinc-300">
          {language}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer text-[11px]"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre
        ref={preRef}
        {...props}
        className="p-4 text-xs font-mono overflow-x-auto text-zinc-100 leading-relaxed selection:bg-primary/30"
      >
        {children}
      </pre>
    </div>
  );
}

/**
 * Generates custom heading with anchor ID and hoverable direct link icon
 */
const createHeading = (level: 1 | 2 | 3 | 4) => {
  return function HeadingComponent({
    children,
    ...props
  }: React.ComponentPropsWithoutRef<'h1'>) {
    const text = React.Children.toArray(children)
      .map((c) => (typeof c === 'string' ? c : ''))
      .join('');
    const id = slugify(text) || `section-${level}`;
    const Tag = `h${level}` as const;

    const styles = {
      1: 'text-2xl sm:text-3xl font-extrabold tracking-tight mt-8 mb-4 border-b border-border/60 pb-2 text-foreground scroll-mt-24',
      2: 'text-xl sm:text-2xl font-bold tracking-tight mt-7 mb-3 text-foreground scroll-mt-24',
      3: 'text-base sm:text-lg font-bold mt-5 mb-2 text-foreground scroll-mt-24',
      4: 'text-sm sm:text-base font-semibold mt-4 mb-2 text-foreground scroll-mt-24',
    }[level];

    return (
      <Tag id={id} className={cn('group relative flex items-center gap-2', styles)} {...props}>
        <span>{children}</span>
        <a
          href={`#${id}`}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary cursor-pointer p-0.5"
          aria-label={`Link to section: ${text}`}
          title="Permanent link to this heading"
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </a>
      </Tag>
    );
  };
};

export function MarkdownRenderer({
  content,
  className,
  onCitationClick,
}: MarkdownRendererProps) {
  return (
    <div
      className={cn(
        'prose prose-zinc dark:prose-invert max-w-none text-foreground/90 leading-relaxed',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[
          [rehypeKatex, { throwOnError: false }],
          rehypeHighlight,
        ]}
        components={{
          h1: createHeading(1),
          h2: createHeading(2),
          h3: createHeading(3),
          h4: createHeading(4),

          p: ({ children }) => (
            <p className="my-3 text-sm leading-relaxed text-foreground/90">
              {processChildrenCitations(children, onCitationClick)}
            </p>
          ),

          pre: CodeBlock,

          code: ({ children, className: codeClassName, ...props }) => {
            const isBlock = codeClassName?.includes('hljs') || codeClassName?.includes('language-');
            if (isBlock) {
              return (
                <code className={codeClassName} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code
                {...props}
                className="px-1.5 py-0.5 rounded bg-muted text-primary font-mono text-[0.85em] font-medium border border-border/40"
              >
                {children}
              </code>
            );
          },

          blockquote: ({ children }) => (
            <blockquote className="my-4 rounded-r-xl rounded-l border-l-4 border-primary bg-primary/5 dark:bg-primary/10 p-4 text-sm text-foreground/90 shadow-2xs">
              <div className="flex items-start gap-3">
                <Quote className="h-4 w-4 text-primary shrink-0 not-italic opacity-80 mt-0.5" />
                <div className="space-y-1.5 not-italic flex-1">{children}</div>
              </div>
            </blockquote>
          ),

          table: ({ children, ...props }) => (
            <div className="my-5 overflow-x-auto rounded-xl border border-border shadow-2xs">
              <table {...props} className="w-full text-left text-xs border-collapse">
                {children}
              </table>
            </div>
          ),

          thead: ({ children, ...props }) => (
            <thead {...props} className="bg-muted/70 text-muted-foreground border-b border-border">
              {children}
            </thead>
          ),

          th: ({ children, ...props }) => (
            <th
              {...props}
              className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-foreground"
            >
              {children}
            </th>
          ),

          td: ({ children, ...props }) => (
            <td {...props} className="px-4 py-2.5 text-xs border-t border-border/40">
              {children}
            </td>
          ),

          ul: ({ children, ...props }) => (
            <ul {...props} className="my-3 ml-5 list-disc space-y-1.5 text-sm text-foreground/90">
              {children}
            </ul>
          ),

          ol: ({ children, ...props }) => (
            <ol {...props} className="my-3 ml-5 list-decimal space-y-1.5 text-sm text-foreground/90">
              {children}
            </ol>
          ),

          li: ({ children, ...props }) => (
            <li {...props} className="leading-relaxed">
              {processChildrenCitations(children, onCitationClick)}
            </li>
          ),

          a: ({ href, children, ...props }) => {
            const isExternal = href?.startsWith('http://') || href?.startsWith('https://');
            return (
              <a
                href={href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                className="font-semibold text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary transition-colors inline-flex items-center gap-0.5"
                {...props}
              >
                <span>{children}</span>
                {isExternal && <ExternalLink className="h-3 w-3 inline opacity-70" />}
              </a>
            );
          },

          img: ({ src, alt, ...props }) => (
            <figure className="my-6">
              <div className="overflow-hidden rounded-xl border border-border bg-muted shadow-2xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={alt || 'Note illustration'}
                  loading="lazy"
                  className="w-full h-auto object-cover max-h-[500px]"
                  {...props}
                />
              </div>
              {alt && (
                <figcaption className="mt-2 text-center text-xs text-muted-foreground italic">
                  {alt}
                </figcaption>
              )}
            </figure>
          ),

          hr: () => <hr className="my-6 border-t border-border/80" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
