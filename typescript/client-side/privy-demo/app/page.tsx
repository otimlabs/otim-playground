"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useDelegation, usePrivyAuth } from "~/hooks";

export default function Home() {
  const router = useRouter();
  const { login, logout, authenticated, user } = usePrivy();
  const { signIn, isLoading, isSuccess, isError, error, reset } =
    usePrivyAuth();
  const {
    isDelegated,
    isDelegating,
    isCheckingStatus,
    delegationStatus,
    delegate,
    error: delegationError,
    clearError: clearDelegationError,
  } = useDelegation();

  const handleSignIn = async () => {
    try {
      const result = await signIn();
      console.log("Authentication successful:", result.user.id);
    } catch (err) {
      console.error("Authentication failed:", err);
    }
  };

  const handleDelegate = async () => {
    try {
      await delegate();
    } catch (err) {
      console.error("Delegation failed:", err);
    }
  };

  // Redirect to dashboard when fully authenticated and delegated
  useEffect(() => {
    if (authenticated && isSuccess && isDelegated) {
      router.push("/dashboard");
    }
  }, [authenticated, isSuccess, isDelegated, router]);

  // Show loading while checking delegation status after authentication
  const showDelegationLoading = isSuccess && isCheckingStatus && !delegationStatus;

  // Show delegation step after authentication but before delegation
  const showDelegationStep =
    isSuccess && !isDelegated && !showDelegationLoading;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-8 px-8">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Privy Demo
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Privy authentication with Otim
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex w-full items-center justify-center gap-2">
          <StepIndicator
            step={1}
            label="Connect"
            isActive={!authenticated}
            isComplete={authenticated}
          />
          <div className="h-px w-8 bg-zinc-300 dark:bg-zinc-700" />
          <StepIndicator
            step={2}
            label="Sign In"
            isActive={authenticated && !isSuccess}
            isComplete={isSuccess}
          />
          <div className="h-px w-8 bg-zinc-300 dark:bg-zinc-700" />
          <StepIndicator
            step={3}
            label="Delegate"
            isActive={isSuccess && !isDelegated}
            isComplete={isDelegated}
          />
        </div>

        <div className="flex w-full flex-col gap-4">
          {/* Step 1: Connect with Privy */}
          {!authenticated ? (
            <button
              onClick={login}
              className="flex h-12 w-full items-center justify-center rounded-full bg-violet-600 px-5 font-medium text-white transition-colors hover:bg-violet-700"
            >
              Connect with Privy
            </button>
          ) : (
            <>
              {/* Connected user info */}
              <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Connected as
                </p>
                <p className="mt-1 font-mono text-sm text-black dark:text-zinc-50">
                  {user?.email?.address || user?.wallet?.address || "Unknown"}
                </p>
              </div>

              {/* Step 2: Sign In with SIWE */}
              {!isSuccess && (
                <button
                  onClick={handleSignIn}
                  disabled={isLoading}
                  className="flex h-12 w-full items-center justify-center rounded-full bg-black px-5 font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                >
                  {isLoading ? "Signing..." : "Sign In with SIWE"}
                </button>
              )}

              {/* Authentication success indicator */}
              {isSuccess && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                  <div className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 text-green-600 dark:text-green-400"
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
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      Authenticated with Otim
                    </p>
                  </div>
                </div>
              )}

              {/* Loading state for delegation status check */}
              {showDelegationLoading && (
                <div className="flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-600 dark:border-t-zinc-300" />
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Checking delegation status...
                  </p>
                </div>
              )}

              {/* Step 3: Delegate Account */}
              {showDelegationStep && (
                <>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      <span className="font-medium">Final step:</span> Delegate
                      your account to enable Otim features. This is a one-time
                      setup.
                    </p>
                    {delegationStatus && delegationStatus !== "Undelegated" && (
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                        Status: {delegationStatus}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleDelegate}
                    disabled={isDelegating}
                    className="flex h-12 w-full items-center justify-center rounded-full bg-violet-600 px-5 font-medium text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isDelegating ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Delegating...
                      </>
                    ) : (
                      "Delegate Account"
                    )}
                  </button>
                </>
              )}

              {/* Delegation success - redirecting */}
              {isDelegated && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-300 border-t-green-600 dark:border-green-600 dark:border-t-green-300" />
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      Delegation complete! Redirecting to dashboard...
                    </p>
                  </div>
                </div>
              )}

              {/* Authentication error */}
              {isError && error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    {error.message}
                  </p>
                  <button
                    onClick={reset}
                    className="mt-2 text-sm font-medium text-red-600 hover:underline dark:text-red-400"
                  >
                    Try again
                  </button>
                </div>
              )}

              {/* Delegation error */}
              {delegationError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    {delegationError}
                  </p>
                  <button
                    onClick={clearDelegationError}
                    className="mt-2 text-sm font-medium text-red-600 hover:underline dark:text-red-400"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Disconnect button */}
              <button
                onClick={logout}
                className="flex h-12 w-full items-center justify-center rounded-full border border-zinc-200 px-5 font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Disconnect
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * Step indicator component for the progress bar.
 */
function StepIndicator({
  step,
  label,
  isActive,
  isComplete,
}: {
  step: number;
  label: string;
  isActive: boolean;
  isComplete: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${isComplete
            ? "bg-green-500 text-white"
            : isActive
              ? "bg-violet-600 text-white"
              : "bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
          }`}
      >
        {isComplete ? (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          step
        )}
      </div>
      <span
        className={`text-xs ${isComplete || isActive
            ? "text-zinc-900 dark:text-zinc-100"
            : "text-zinc-500 dark:text-zinc-400"
          }`}
      >
        {label}
      </span>
    </div>
  );
}
