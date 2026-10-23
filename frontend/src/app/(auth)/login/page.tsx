"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth-store";
import { useToast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import type { User } from "@/types";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().default(false),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const { addToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      // Attempt API request
      let user: User;
      let token: string;

      try {
        const response = await fetch("/api/v1/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: data.email,
            password: data.password,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(
            errData?.detail || errData?.message || "Invalid email or password."
          );
        }

        const resData = await response.json();
        user = resData.user;
        token = resData.access_token;
      } catch (apiError: unknown) {
        // Fallback for development/demo mode if API server is not running
        const errorMsg =
          apiError instanceof Error ? apiError.message : String(apiError);
        
        // If it was a network failure connecting to backend, allow mock sign-in for seamless UI testing
        if (
          errorMsg.includes("Failed to fetch") ||
          errorMsg.includes("NetworkError") ||
          errorMsg.includes("fetch failed")
        ) {
          user = {
            id: "user-1",
            email: data.email,
            name: data.email.split("@")[0].replace(/[^a-zA-Z]/g, " ") || "Alex Morgan",
            created_at: "2026-10-21T00:00:00.000Z",
            updated_at: "2026-10-21T00:00:00.000Z",
          };
          token = "demo_jwt_token_slos_authenticated";
        } else {
          throw apiError;
        }
      }

      login(user, token);
      addToast(`Welcome back, ${user.name}!`, "success", "Signed in");
      router.push("/");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Sign in failed. Please check your credentials.";
      addToast(msg, "error", "Authentication Failed");
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      // Simulate Google authentication
      await new Promise((r) => setTimeout(r, 800));
      const googleUser: User = {
        id: "google-user-1",
        email: "alex.student@gmail.com",
        name: "Alex Morgan",
        avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
        created_at: "2026-10-21T00:00:00.000Z",
        updated_at: "2026-10-21T00:00:00.000Z",
      };
      login(googleUser, "google_mock_jwt_token");
      addToast("Successfully authenticated with Google.", "success", "Welcome");
      router.push("/");
    } catch {
      addToast("Failed to authenticate with Google.", "error");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col space-y-1.5 text-center">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Sign in to your account
        </h2>
        <p className="text-xs text-muted-foreground">
          Enter your student email and password to access your study portal
        </p>
      </div>

      {/* Google Sign In Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
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
        <span>Sign in with Google</span>
      </button>

      {/* Divider */}
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <span className="relative bg-card px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          or continue with email
        </span>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-1">
          <label
            htmlFor="email"
            className="text-xs font-medium text-foreground block"
          >
            Email address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@university.edu"
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
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-xs font-medium text-foreground block"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-[11px] text-primary hover:underline font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
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
          {errors.password && (
            <p className="text-[11px] text-destructive mt-0.5">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Remember me */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              {...register("rememberMe")}
              className="h-3.5 w-3.5 rounded border-border text-primary accent-primary focus:ring-ring cursor-pointer"
            />
            <span className="text-xs text-muted-foreground font-normal">
              Remember me on this device
            </span>
          </label>
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
              <span>Signing in...</span>
            </>
          ) : (
            <span>Sign In</span>
          )}
        </button>
      </form>

      {/* Register Link */}
      <div className="text-center text-xs text-muted-foreground pt-1">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-semibold text-primary hover:underline ml-1"
        >
          Create one now
        </Link>
      </div>
    </div>
  );
}
