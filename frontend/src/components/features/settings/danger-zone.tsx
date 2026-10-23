"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2, X, Loader2, ShieldAlert } from "lucide-react";
import { deleteAccount } from "@/lib/api/endpoints";
import { useAuthStore } from "@/lib/store/auth-store";
import { clearTokens } from "@/lib/api/client";
import { useToast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

export function DangerZone() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const { addToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isConfirmed = confirmInput.trim() === "DELETE";

  const handleOpenDialog = () => {
    setConfirmInput("");
    setErrorMsg(null);
    setIsOpen(true);
  };

  const handleCloseDialog = () => {
    if (isDeleting) return;
    setIsOpen(false);
    setConfirmInput("");
    setErrorMsg(null);
  };

  const handleDelete = async () => {
    if (!isConfirmed || isDeleting) return;

    setIsDeleting(true);
    setErrorMsg(null);

    try {
      await deleteAccount();

      // Clear all state & tokens
      logout();
      clearTokens();

      addToast("Your account and all associated data have been deleted.", "info", "Account Deleted");
      setIsOpen(false);

      // Redirect user to login page
      router.replace("/login");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to delete account. Please try again.";
      setErrorMsg(msg);
      addToast(msg, "error", "Deletion Failed");
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 dark:bg-destructive/10 p-6 sm:p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-destructive/15 p-2.5 text-destructive shrink-0 mt-0.5">
            <AlertTriangle className="h-5 w-5" />
          </div>

          <div className="flex-1 space-y-1">
            <h2 className="text-base font-semibold text-destructive">Danger Zone</h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Irreversible actions that affect your data and profile. Once deleted, your account cannot be recovered.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border border-destructive/20 bg-background/60 p-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-foreground">Delete Account</h3>
            <p className="text-xs text-muted-foreground max-w-xl">
              Permanently delete your profile, documents, generated notes, and exam history.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenDialog}
            className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground shadow-xs hover:bg-destructive/90 transition-colors cursor-pointer shrink-0"
          >
            <Trash2 className="h-4 w-4" />
            Delete Account
          </button>
        </div>
      </div>

      {/* Confirmation Dialog Overlay */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-200"
        >
          <div className="w-full max-w-md rounded-2xl border border-destructive/30 bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-destructive/15 p-2 text-destructive">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 id="delete-dialog-title" className="text-base font-semibold text-foreground">
                    Delete Student Account
                  </h3>
                  <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseDialog}
                disabled={isDeleting}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Warning description */}
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3.5 text-xs text-destructive leading-relaxed">
              <p className="font-semibold mb-1">Warning: Permanent Data Loss</p>
              All subjects, syllabus trees, AI generated notes, cheat sheets, question papers, quiz records, and study analytics will be wiped permanently from our servers.
            </div>

            {/* Error Message */}
            {errorMsg && (
              <p className="text-xs font-medium text-destructive bg-destructive/10 p-2 rounded">
                {errorMsg}
              </p>
            )}

            {/* Confirmation input */}
            <div className="space-y-1.5 pt-1">
              <label
                htmlFor="confirm-delete-input"
                className="block text-xs font-medium text-foreground"
              >
                To confirm, type <span className="font-bold text-destructive font-mono">DELETE</span> below:
              </label>
              <input
                id="confirm-delete-input"
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="DELETE"
                disabled={isDeleting}
                className={cn(
                  "w-full rounded-lg border bg-background px-3.5 py-2 text-sm text-foreground font-mono transition-colors focus:outline-none focus:ring-2",
                  isConfirmed
                    ? "border-destructive focus:ring-destructive"
                    : "border-input focus:ring-primary"
                )}
                autoComplete="off"
                autoFocus
              />
            </div>

            {/* Dialog Footer Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                onClick={handleCloseDialog}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={!isConfirmed || isDeleting}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground shadow-sm hover:bg-destructive/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    Permanently Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
