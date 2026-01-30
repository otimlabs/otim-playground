"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useDelegation, OTIM_TOKEN_KEY } from "~/hooks";
import { TransactionForm } from "./components/transaction-form";

/**
 * Protected dashboard page.
 *
 * This page requires:
 * 1. Privy authentication (user is connected with Privy)
 * 2. Otim token in localStorage (user has signed SIWE)
 * 3. Delegation status === "Delegated" (user has delegated their account)
 *
 * If any of these conditions are not met, the user is redirected to the home page.
 */
export default function Dashboard() {
  const router = useRouter();
  const { authenticated, logout, user } = usePrivy();
  const { isDelegated, delegationStatus, isCheckingStatus, refreshStatus } =
    useDelegation();

  // Check if we have the Otim token
  const hasOtimToken =
    typeof window !== "undefined" && !!localStorage.getItem(OTIM_TOKEN_KEY);

  // Redirect to home if not fully authenticated
  useEffect(() => {
    // Wait for delegation status check to complete
    if (isCheckingStatus) return;

    // Redirect if missing any auth requirement
    if (!authenticated || !hasOtimToken || !isDelegated) {
      router.push("/");
    }
  }, [authenticated, hasOtimToken, isDelegated, isCheckingStatus, router]);

  // Show loading while checking
  if (isCheckingStatus || !authenticated || !isDelegated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-violet-600 dark:border-zinc-600 dark:border-t-violet-400" />
          <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    // Clear the Otim token
    localStorage.removeItem(OTIM_TOKEN_KEY);
    // Logout from Privy
    await logout();
    // Redirect to home
    router.push("/");
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans dark:bg-black">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <h1 className="text-lg font-semibold text-black dark:text-zinc-50">
            Yumi Dashboard
          </h1>
          <button
            onClick={handleLogout}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Welcome card */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
                  Welcome to Yumi
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Your account is fully set up and ready to use
                </p>
              </div>
            </div>
          </div>

          {/* Status cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Privy Status */}
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Privy Connected
                </span>
              </div>
              <p className="mt-2 truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">
                {user?.email?.address || user?.wallet?.address || "Connected"}
              </p>
            </div>

            {/* Otim Token Status */}
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Otim Authenticated
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                SIWE signature verified
              </p>
            </div>

            {/* Delegation Status */}
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {delegationStatus}
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                EIP-7702 delegation active
              </p>
            </div>
          </div>

          {/* Transaction Form */}
          <TransactionForm />

        </div>
      </main>
    </div>
  );
}
