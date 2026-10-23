"use client";

import React, { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { isServer, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store/auth-store";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const queryClient = getQueryClient();

  useEffect(() => {
    // Initialize auth state from local persistence / cookies
    useAuthStore.getState().initialize();

    // Initialize MSW in development mode in the browser only when mocks are enabled
    if (
      process.env.NODE_ENV === "development" &&
      process.env.NEXT_PUBLIC_ENABLE_MOCKS === "true" &&
      typeof window !== "undefined"
    ) {
      import("@/mocks/browser")
        .then(({ initMocks }) => {
          initMocks().catch((err) => {
            console.debug("MSW initialization notice:", err);
          });
        })
        .catch((err) => {
          console.debug("MSW import bypassed:", err);
        });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
