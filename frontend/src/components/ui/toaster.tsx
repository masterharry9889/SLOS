"use client";

import React, { useEffect } from "react";
import { create } from "zustand";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  title?: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (message: string, type?: ToastType, title?: string) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToast = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, type = "info", title) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastItem = {
      id,
      title,
      message,
      type,
      duration: 5000,
    };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    return id;
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
  clearToasts: () => set({ toasts: [] }),
}));

const iconMap = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const toastStyles: Record<ToastType, { bg: string; text: string; iconColor: string; border: string }> = {
  success: {
    bg: "bg-emerald-50 dark:bg-emerald-950/70",
    text: "text-emerald-900 dark:text-emerald-200",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  error: {
    bg: "bg-rose-50 dark:bg-rose-950/70",
    text: "text-rose-900 dark:text-rose-200",
    iconColor: "text-rose-600 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-800",
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-950/70",
    text: "text-amber-900 dark:text-amber-200",
    iconColor: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
  },
  info: {
    bg: "bg-blue-50 dark:bg-blue-950/70",
    text: "text-blue-900 dark:text-blue-200",
    iconColor: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
  },
};

interface ToastCardProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

function ToastCard({ toast, onDismiss }: ToastCardProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  const Icon = iconMap[toast.type] || Info;
  const style = toastStyles[toast.type] || toastStyles.info;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border p-4 shadow-lg transition-all duration-300 ease-in-out animate-in slide-in-from-bottom-5 fade-in-0",
        style.bg,
        style.border
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", style.iconColor)} />
      <div className="flex-1 text-sm">
        {toast.title && (
          <p className={cn("font-medium leading-none mb-1", style.text)}>
            {toast.title}
          </p>
        )}
        <p className={cn("text-xs leading-relaxed opacity-90", style.text)}>
          {toast.message}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Close notification"
        className={cn(
          "shrink-0 rounded p-1 transition-colors hover:bg-black/5 dark:hover:bg-white/10",
          style.iconColor
        )}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Toaster() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <aside
      aria-label="Notifications"
      className="fixed bottom-0 right-0 z-50 flex max-h-screen w-full flex-col-reverse p-4 sm:max-w-[420px] pointer-events-none gap-2"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </aside>
  );
}
