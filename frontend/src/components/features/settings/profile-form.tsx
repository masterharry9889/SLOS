"use client";

import React, { useRef, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Lock, Loader2, User as UserIcon, Trash2, CheckCircle2 } from "lucide-react";
import { updateProfileSchema, type UpdateProfileInput } from "@/lib/schemas";
import { updateProfile } from "@/lib/api/endpoints";
import { useAuthStore } from "@/lib/store/auth-store";
import { useToast } from "@/components/ui/toaster";
import { cn, formatDate } from "@/lib/utils";
import type { User } from "@/types";

interface ProfileFormProps {
  initialUser?: User | null;
  onSuccess?: (user: User) => void;
}

export function ProfileForm({ initialUser, onSuccess }: ProfileFormProps) {
  const { user: storeUser, updateUser } = useAuthStore();
  const currentUser = initialUser || storeUser;
  const { addToast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    currentUser?.avatar_url || null
  );
  const [isPhotoHovered, setIsPhotoHovered] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: currentUser?.name || "",
      avatar_url: currentUser?.avatar_url || "",
    },
  });

  // Sync form values if currentUser changes externally
  useEffect(() => {
    if (currentUser) {
      reset({
        name: currentUser.name || "",
        avatar_url: currentUser.avatar_url || "",
      });
      setAvatarPreview(currentUser.avatar_url || null);
    }
  }, [currentUser, reset]);

  // Handle local avatar file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      addToast("Please select a valid image file (PNG, JPG, WebP)", "error");
      return;
    }

    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      addToast("Image size must be less than 5MB", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setAvatarPreview(dataUrl);
      setValue("avatar_url", dataUrl, {
        shouldDirty: true,
        shouldValidate: true,
      });
      addToast("Avatar preview ready. Click Save to persist.", "info");
    };
    reader.onerror = () => {
      addToast("Failed to read image file", "error");
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setAvatarPreview(null);
    setValue("avatar_url", "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Optimistic update submission
  const onSubmit = async (values: UpdateProfileInput) => {
    const previousUser = currentUser;
    const optimisticName = values.name?.trim() || currentUser?.name || "Student";
    const optimisticAvatar = values.avatar_url || undefined;

    // 1. Apply optimistic update to local store immediately
    if (currentUser) {
      updateUser({
        name: optimisticName,
        avatar_url: optimisticAvatar,
      });
    }

    try {
      const updatedUser = await updateProfile({
        name: values.name?.trim(),
        avatar_url: values.avatar_url,
      });

      // 2. Reconcile with verified response
      updateUser(updatedUser);
      reset({
        name: updatedUser.name,
        avatar_url: updatedUser.avatar_url || "",
      });
      setAvatarPreview(updatedUser.avatar_url || null);

      addToast("Profile updated successfully!", "success", "Saved");
      onSuccess?.(updatedUser);
    } catch (err: unknown) {
      // 3. Rollback on failure
      if (previousUser) {
        updateUser(previousUser);
        reset({
          name: previousUser.name,
          avatar_url: previousUser.avatar_url || "",
        });
        setAvatarPreview(previousUser.avatar_url || null);
      }
      const message =
        err instanceof Error ? err.message : "Failed to update profile. Please try again.";
      addToast(message, "error", "Update Failed");
    }
  };

  const userDisplayName = currentUser?.name || "Student";
  const initials = userDisplayName
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "S";

  return (
    <div className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm">
      <div className="mb-6 border-b border-border pb-4">
        <h2 className="text-lg font-semibold text-foreground">Personal Information</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Update your public avatar and display name across Student Life OS.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Hidden File Input for avatar upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Upload profile avatar"
        />

        {/* Avatar Section */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div
            className="relative group cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onMouseEnter={() => setIsPhotoHovered(true)}
            onMouseLeave={() => setIsPhotoHovered(false)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            aria-label="Change avatar photo"
          >
            {/* Avatar circle */}
            <div className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-full border-2 border-border shadow-sm overflow-hidden bg-muted flex items-center justify-center transition-transform group-hover:scale-[1.02]">
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreview}
                  alt={userDisplayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-tr from-primary to-indigo-600 text-primary-foreground font-semibold text-2xl sm:text-3xl flex items-center justify-center">
                  {initials}
                </div>
              )}

              {/* Camera Overlay on hover */}
              <div
                className={cn(
                  "absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center gap-1 transition-opacity duration-200",
                  isPhotoHovered ? "opacity-100" : "opacity-0"
                )}
              >
                <Camera className="h-5 w-5 text-white" />
                <span className="text-[10px] font-medium uppercase tracking-wider">Change</span>
              </div>
            </div>

            {/* Camera badge for mobile or visible hint */}
            <div className="absolute bottom-0 right-0 rounded-full bg-primary p-1.5 text-primary-foreground shadow border-2 border-card sm:hidden">
              <Camera className="h-3.5 w-3.5" />
            </div>
          </div>

          <div className="flex flex-col justify-center text-center sm:text-left space-y-2">
            <div>
              <h3 className="text-sm font-medium text-foreground">Profile Avatar</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                PNG, JPG or WebP. Recommended square size, up to 5MB.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors cursor-pointer"
              >
                <Camera className="h-3.5 w-3.5" />
                Upload New Photo
              </button>
              {avatarPreview && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/30 hover:bg-destructive/10 text-xs font-medium text-destructive transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Name & Email Fields */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 pt-2">
          {/* Name Field */}
          <div className="space-y-1.5">
            <label htmlFor="name-input" className="block text-xs font-semibold text-foreground uppercase tracking-wide">
              Full Name <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                id="name-input"
                type="text"
                placeholder="e.g. Alex Mercer"
                {...register("name")}
                className={cn(
                  "w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                  errors.name ? "border-destructive focus:ring-destructive" : "border-input"
                )}
              />
            </div>
            {errors.name && (
              <p className="text-xs text-destructive font-medium mt-1">
                {errors.name.message}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Your name displayed on your dashboard, study streak, and notes.
            </p>
          </div>

          {/* Email Field (Read-only / disabled) */}
          <div className="space-y-1.5">
            <label htmlFor="email-input" className="block text-xs font-semibold text-foreground uppercase tracking-wide">
              Email Address
            </label>
            <div className="relative">
              <input
                id="email-input"
                type="email"
                disabled
                value={currentUser?.email || "student@slos.edu"}
                className="w-full rounded-lg border border-input bg-muted/60 px-3.5 py-2.5 pr-10 text-sm text-muted-foreground cursor-not-allowed select-none"
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <Lock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Email is managed by your provider and cannot be changed here.
            </p>
          </div>
        </div>

        {/* Member metadata */}
        {currentUser?.created_at && (
          <div className="rounded-lg bg-muted/40 border border-border/60 px-4 py-2.5 flex items-center justify-between text-xs text-muted-foreground">
            <span>Account created</span>
            <span className="font-medium text-foreground">{formatDate(currentUser.created_at)}</span>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <button
            type="button"
            disabled={!isDirty || isSubmitting}
            onClick={() => {
              if (currentUser) {
                reset({
                  name: currentUser.name || "",
                  avatar_url: currentUser.avatar_url || "",
                });
                setAvatarPreview(currentUser.avatar_url || null);
              }
            }}
            className="px-4 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Reset
          </button>

          <button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
