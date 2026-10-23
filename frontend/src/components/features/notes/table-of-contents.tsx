'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { ListFilter, ChevronDown, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Extracts headings h1 through h4 from raw markdown content
 */
export function extractHeadings(markdown: string): HeadingItem[] {
  if (!markdown) return [];
  const headingRegex = /^(#{1,4})\s+(.+)$/gm;
  const headings: HeadingItem[] = [];
  const seenIds = new Map<string, number>();
  let match;

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    // Strip bold, italics, inline code, and links
    const cleanText = match[2]
      .trim()
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    let baseId = slugify(cleanText);
    if (!baseId) baseId = `section-${headings.length + 1}`;

    let id = baseId;
    if (seenIds.has(baseId)) {
      const count = seenIds.get(baseId)! + 1;
      seenIds.set(baseId, count);
      id = `${baseId}-${count}`;
    } else {
      seenIds.set(baseId, 1);
    }

    headings.push({ id, text: cleanText, level });
  }

  return headings;
}

interface TableOfContentsProps {
  content: string;
  className?: string;
  onSelectSection?: (id: string) => void;
}

export function TableOfContents({
  content,
  className,
  onSelectSection,
}: TableOfContentsProps) {
  const headings = useMemo(() => extractHeadings(content), [content]);
  const [activeId, setActiveId] = useState<string>('');
  const [mobileOpen, setMobileOpen] = useState(false);

  // Track active heading on scroll
  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find visible intersecting headings
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length > 0) {
          // Sort by position from top
          const topEntry = visibleEntries.reduce((prev, curr) =>
            prev.boundingClientRect.top < curr.boundingClientRect.top ? prev : curr
          );
          setActiveId(topEntry.target.id);
        }
      },
      {
        rootMargin: '-80px 0% -60% 0%',
        threshold: [0, 0.5, 1],
      }
    );

    headings.forEach((heading) => {
      const el = document.getElementById(heading.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  const handleHeadingClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const topOffset = 85;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - topOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });

      setActiveId(id);
      setMobileOpen(false);
      onSelectSection?.(id);
    }
  };

  if (headings.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Table of contents"
      className={cn('text-xs', className)}
    >
      {/* Mobile Collapsible Header */}
      <div className="lg:hidden mb-4">
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <ListFilter className="h-4 w-4 text-primary" />
            <span>Table of Contents</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              {headings.length}
            </span>
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200',
              mobileOpen && 'rotate-180'
            )}
          />
        </button>

        {mobileOpen && (
          <div className="mt-2 rounded-xl border border-border bg-card p-3 shadow-md max-h-72 overflow-y-auto space-y-1 animate-in fade-in-50 duration-150">
            {headings.map((heading) => {
              const isActive = activeId === heading.id;
              return (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  onClick={(e) => handleHeadingClick(e, heading.id)}
                  style={{ paddingLeft: `${(heading.level - 1) * 12 + 8}px` }}
                  className={cn(
                    'block py-1.5 pr-2 rounded-md transition-colors truncate text-xs',
                    isActive
                      ? 'bg-primary/10 font-bold text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {heading.text}
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop Sticky Table of Contents */}
      <div className="hidden lg:block">
        <div className="flex items-center gap-2 pb-3 mb-3 border-b border-border/60">
          <Bookmark className="h-4 w-4 text-primary" />
          <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">
            On this page
          </h4>
          <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
            {headings.length}
          </span>
        </div>

        <ul className="space-y-1 relative before:absolute before:left-1 before:top-2 before:bottom-2 before:w-[1px] before:bg-border/60">
          {headings.map((heading) => {
            const isActive = activeId === heading.id;

            return (
              <li
                key={heading.id}
                style={{ paddingLeft: `${(heading.level - 1) * 10}px` }}
              >
                <a
                  href={`#${heading.id}`}
                  onClick={(e) => handleHeadingClick(e, heading.id)}
                  className={cn(
                    'group flex items-center gap-1.5 py-1 px-2 rounded-md transition-all text-left text-xs line-clamp-1 cursor-pointer',
                    isActive
                      ? 'bg-primary/10 text-primary font-bold shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  )}
                  title={heading.text}
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full transition-all shrink-0',
                      isActive
                        ? 'bg-primary scale-125'
                        : 'bg-muted-foreground/30 group-hover:bg-foreground/50'
                    )}
                  />
                  <span className="truncate">{heading.text}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
