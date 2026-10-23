"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Eye, EyeOff, Lock, Mail, User as UserIcon } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth-store";
import { useToast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import type { User } from "@/types";

const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    terms: z.boolean().refine((val) => val === true, {
      message: "You must accept the terms and privacy policy",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  if (!password) return { score: 0, label: "None", color: "bg-muted" };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: "Weak", color: "bg-rose-500" };
  if (score === 2) return { score: 2, label: "Fair", color: "bg-amber-500" };
  if (score === 3) return { score: 3, label: "Good", color: "bg-emerald-500" };
  return { score: 4, label: "Strong", color: "bg-indigo-600" };
}

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const { addToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  });

  const passwordValue = watch("password") || "";
  const passwordStrength = getPasswordStrength(passwordValue);

  const onSubmit = async (data: RegisterFormData) => {
    try {
      let user: User;
      let token: string;

      try {
        const response = await fetch("/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            password: data.password,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(
            errData?.detail || errData?.message || "Registration failed."
          );
        }

        const resData = await response.json();
        user = resData.user;
        token = resData.access_token;
      } catch (apiError: unknown) {
        const errorMsg =
          apiError instanceof Error ? apiError.message : String(apiError);

        // Demo / offline fallback
        if (
          errorMsg.includes("Failed to fetch") ||
          errorMsg.includes("NetworkError") ||
          errorMsg.includes("fetch failed")
        ) {
          user = {
            id: "user-" + Math.random().toString(36).substring(2, 8),
            name: data.name,
            email: data.email,
            created_at: "2026-10-21T00:00:00.000Z",
            updated_at: "2026-10-21T00:00:00.000Z",
          };
          token = "demo_jwt_token_slos_authenticated";
        } else {
          throw apiError;
        }
      }

      login(user, token);
      addToast(`Welcome to Student Life OS, ${user.name}!`, "success", "Account Created");
      router.push("/");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to create your account.";
      addToast(msg, "error", "Registration Error");
    }
  };

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      const googleUser: User = {
        id: "google-user-2",
        email: "alex.student@gmail.com",
        name: "Alex Morgan",
        avatar_url:
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
        created_at: "2026-10-21T00:00:00.000Z",
        updated_at: "2026-10-21T00:00:00.000Z",
      };
      login(googleUser, "google_mock_jwt_token");
      addToast("Account linked with Google successfully.", "success", "Welcome");
      router.push("/");
    } catch {
      addToast("Failed to sign up with Google.", "error");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-5">
      <div className="flex flex-col space-y-1.5 text-center">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Create your student account
        </h2>
        <p className="text-xs text-muted-foreground">
          Join Student Life OS to organize your notes, syllabus, and study routine
        </p>
      </div>

      {/* Sign up with Google */}
      <button
        type="button"
        onClick={handleGoogleSignUp}
        disabled={isGoogleLoading || isSubmitting}
        className="relative inline-flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground shadow-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 cursor-pointer"
      >
        {isGoogleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              fill="#EA4335"
            />
          </svg>
        )}
        <span>Sign up with Google</span>
      </button>

      {/* Divider */}
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <span className="relative bg-card px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          or register with email
        </span>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
        {/* Name Field */}
        <div className="space-y-1">
          <label
            htmlFor="name"
            className="text-xs font-medium text-foreground block"
          >
            Full Name
          </label>
          <div className="relative">
            <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Alex Morgan"
              {...register("name")}
              className={cn(
                "w-full rounded-lg border bg-background/50 pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-all",
                errors.name ? "border-destructive focus:ring-destructive" : "border-input"
              )}
            />
          </div>
          {errors.name && (
            <p className="text-[11px] text-destructive mt-0.5">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Email Field */}
        <div className="space-y-1">
          <label
            htmlFor="email"
            className="text-xs font-medium text-foreground block"
          >
            Student Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="alex@university.edu"
              {...register("email")}
              className={cn(
                "w-full rounded-lg border bg-background/50 pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-all",
                errors.email ? "border-destructive focus:ring-destructive" : "border-input"
              )}
            />
          </div>
          {errors.email && (
            <p className="text-[11px] text-destructive mt-0.5">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-1">
          <label
            htmlFor="password"
            className="text-xs font-medium text-foreground block"
          >
            Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              {...register("password")}
              className={cn(
                "w-full rounded-lg border bg-background/50 pl-9 pr-9 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-all",
                errors.password ? "border-destructive focus:ring-destructive" : "border-input"
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Password strength indicator */}
          {passwordValue.length > 0 && (
            <div className="space-y-1 pt-1">
              <div className="flex h-1.5 w-full gap-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={cn(
                      "h-full flex-1 rounded-full transition-all duration-300",
                      level <= passwordStrength.score
                        ? passwordStrength.color
                        : "bg-muted"
                    )}
                  />
                ))}
              </div>
              <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                <span>Strength: <strong className="text-foreground">{passwordStrength.label}</strong></span>
                <span>Min. 8 characters</span>
              </div>
            </div>
          )}

          {errors.password && (
            <p className="text-[11px] text-destructive mt-0.5">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-1">
          <label
            htmlFor="confirmPassword"
            className="text-xs font-medium text-foreground block"
          >
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Re-enter password"
              {...register("confirmPassword")}
              className={cn(
                "w-full rounded-lg border bg-background/50 pl-9 pr-9 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-all",
                errors.confirmPassword
                  ? "border-destructive focus:ring-destructive"
                  : "border-input"
              )}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-[11px] text-destructive mt-0.5">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Terms and conditions */}
        <div className="space-y-1 pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              {...register("terms")}
              className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-border text-primary accent-primary focus:ring-ring cursor-pointer"
            />
            <span className="text-[11px] leading-relaxed text-muted-foreground">
              I agree to the{" "}
              <Link href="/terms" className="text-primary hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </span>
          </label>
          {errors.terms && (
            <p className="text-[11px] text-destructive">
              {errors.terms.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 px-4 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all disabled:opacity-60 cursor-pointer mt-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Creating your account...</span>
            </>
          ) : (
            <span>Create Account</span>
          )}
        </button>
      </form>

      {/* Login Link */}
      <div className="text-center text-xs text-muted-foreground pt-1">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-primary hover:underline ml-1"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
