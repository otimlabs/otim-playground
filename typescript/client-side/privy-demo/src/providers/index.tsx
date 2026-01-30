"use client";

import type { ApiClientConfig } from "@otim/utils/server";
import type { ReactNode } from "react";

import { ApiClientProvider } from "@otim/utils/server/react";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { env } from "~/env";
import { OTIM_TOKEN_KEY } from "~/hooks";
import { wagmiConfig } from "./wagmi";

/**
 * Privy configuration for authentication.
 */
const privyConfig = {
  appearance: {
    theme: "light" as const,
    accentColor: "#8B5CF6",
  },
  embeddedWallets: {
    createOnLogin: "users-without-wallets" as const,
  },
};

/**
 * Root providers for the application.
 *
 * Wraps the application with:
 * - PrivyProvider: Authentication and embedded wallet management
 * - WagmiProvider: Ethereum wallet connections
 * - QueryClientProvider: Server state management
 * - ApiClientProvider: API client for Otim backend
 *
 * @param children - Child components to render
 */
export function Providers({ children }: { children: ReactNode }) {
  // Create QueryClient instance per render to avoid shared state between requests
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
          },
        },
      }),
  );

  // API client configuration with auth token getter
  const apiClientConfig: ApiClientConfig = useMemo(
    () => ({
      environment: env.NEXT_PUBLIC_ENVIRONMENT,
      authTokenGetter: async () => {
        if (typeof window === "undefined") return undefined;
        return localStorage.getItem(OTIM_TOKEN_KEY) ?? undefined;
      },
    }),
    [],
  );

  return (
    <PrivyProvider appId={env.NEXT_PUBLIC_PRIVY_APP_ID} config={privyConfig}>
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider config={apiClientConfig}>
          <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
        </ApiClientProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
