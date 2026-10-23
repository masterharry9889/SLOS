import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges class names safely using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats a file size in bytes to a human-readable string (e.g. 2.4 MB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const idx = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, idx)).toFixed(dm))} ${sizes[idx]}`;
}

/**
 * Formats an ISO date string into readable date (e.g. "Oct 24, 2026")
 */
export function formatDate(dateStr?: string | Date | null): string {
  if (!dateStr) return '';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

/**
 * Calculates days remaining until target date. Returns null if invalid or not set.
 */
export function getDaysUntil(dateStr?: string | Date | null): number | null {
  if (!dateStr) return null;
  const target = typeof dateStr === 'string' ? new Date(dateStr).getTime() : dateStr.getTime();
  if (isNaN(target)) return null;
  const now = new Date().getTime();
  const diffTime = target - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

/**
 * Returns human-readable relative time string (e.g. "2 hours ago", "yesterday")
 */
export function formatRelativeTime(dateStr?: string | Date | null): string {
  if (!dateStr) return '';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const time = d.getTime();
  if (isNaN(time)) return '';

  const now = Date.now();
  const diffSeconds = Math.round((now - time) / 1000);

  if (diffSeconds < 60) return 'Just now';
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.round(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}w ago`;

  return formatDate(d);
}

