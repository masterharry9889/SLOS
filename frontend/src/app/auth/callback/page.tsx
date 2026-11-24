"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { completeGoogleLogin } from "@/lib/api/endpoints";
import { useAuthStore } from "@/lib/store/auth-store";

export default function GoogleCallbackPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    completeGoogleLogin()
      .then((session) => {
        if (!active) return;
        login(session.user, session.access_token);
        router.replace("/");
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Google sign-in could not be completed.",
        );
      });

    return () => {
      active = false;
    };
  }, [login, router]);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        {error ? (
          <>
            <h1 className="text-xl font-bold text-foreground">Sign-in failed</h1>
            <p role="alert" className="text-sm text-destructive">{error}</p>
            <Link className="text-sm font-medium text-primary underline" href="/login">
              Return to sign in
            </Link>
          </>
        ) : (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Completing Google sign-in…</p>
          </>
        )}
      </div>
    </main>
  );
}
