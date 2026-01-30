"use client";

import type { DelegationStatus } from "@otim/utils/api";
import type { Address } from "viem";

import {
  createDelegation,
  getDelegateAddress,
  getDelegationStatus,
} from "@otim/utils/server";
import { useApiClient } from "@otim/utils/server/react";
import {
  usePrivy,
  useSign7702Authorization,
  useWallets,
} from "@privy-io/react-auth";
import { useSetActiveWallet } from "@privy-io/wagmi";
import { useCallback, useEffect, useState } from "react";
import { toHex, toRlp } from "viem";

import { DEFAULT_CHAIN_ID, publicClient } from "~/providers/wagmi";
import { OTIM_TOKEN_KEY } from "./use-privy-auth";

export type { DelegationStatus };

/**
 * Return type for the useDelegation hook.
 */
export interface UseDelegationReturn {
  /** Current delegation status */
  delegationStatus: DelegationStatus | null;
  /** Whether the account is delegated */
  isDelegated: boolean;
  /** Whether delegation is in progress */
  isDelegating: boolean;
  /** Whether delegation status is being checked */
  isCheckingStatus: boolean;
  /** Error message if any operation failed */
  error: string | null;
  /** Initiates the delegation process */
  delegate: () => Promise<void>;
  /** Refreshes the delegation status */
  refreshStatus: () => Promise<void>;
  /** Clears any error state */
  clearError: () => void;
}

/**
 * useDelegation Hook
 *
 * Manages EIP-7702 delegation for Otim accounts using Privy embedded wallets.
 * Handles delegation status checking and delegation signing via Privy.
 *
 * @returns Delegation state and methods
 *
 * @example
 * ```tsx
 * function DelegationButton() {
 *   const { isDelegated, isDelegating, delegate, error } = useDelegation();
 *
 *   if (isDelegated) {
 *     return <p>Account is delegated!</p>;
 *   }
 *
 *   return (
 *     <button onClick={delegate} disabled={isDelegating}>
 *       {isDelegating ? 'Delegating...' : 'Delegate Account'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useDelegation(): UseDelegationReturn {
  const { authenticated: privyAuthenticated } = usePrivy();
  const { wallets } = useWallets();
  const { signAuthorization } = useSign7702Authorization();
  const { setActiveWallet } = useSetActiveWallet();
  const apiClient = useApiClient();

  const [delegationStatus, setDelegationStatus] =
    useState<DelegationStatus | null>(null);
  const [isDelegating, setIsDelegating] = useState(false);
  const [isCheckingStatusInternal, setIsCheckingStatusInternal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasOtimToken, setHasOtimToken] = useState(() => {
    // Initialize from localStorage to avoid flash of incorrect state
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem(OTIM_TOKEN_KEY);
  });

  // Check for Otim token and listen for changes
  useEffect(() => {
    const checkToken = () => {
      if (typeof window === "undefined") return;
      const token = localStorage.getItem(OTIM_TOKEN_KEY);
      setHasOtimToken(!!token);
    };

    // Initial check
    checkToken();

    // Listen for token set event (from same window)
    window.addEventListener("otim-token-set", checkToken);
    // Listen for storage changes (from other windows/tabs)
    window.addEventListener("storage", checkToken);

    return () => {
      window.removeEventListener("otim-token-set", checkToken);
      window.removeEventListener("storage", checkToken);
    };
  }, []);

  // Find the Privy embedded wallet
  const embeddedWallet = wallets.find(
    (wallet) => wallet.walletClientType === "privy",
  );

  // Set active wallet when available
  useEffect(() => {
    if (embeddedWallet) {
      setActiveWallet(embeddedWallet);
    }
  }, [embeddedWallet, setActiveWallet]);

  // Check delegation status
  const checkDelegationStatus = useCallback(async () => {
    if (!embeddedWallet) return;

    setIsCheckingStatusInternal(true);
    setError(null);

    try {
      const status = await getDelegationStatus(apiClient, {
        address: embeddedWallet.address,
        chainId: DEFAULT_CHAIN_ID,
      });

      setDelegationStatus(status.delegationStatus);

      if (status.delegationStatus === "Delegated") {
        setIsDelegating(false);
      }
    } catch (err) {
      console.error("Failed to check delegation status:", err);
      setError("Failed to check delegation status");
      setDelegationStatus(null);
    } finally {
      setIsCheckingStatusInternal(false);
    }
  }, [apiClient, embeddedWallet]);

  // Derived isCheckingStatus - true if:
  // 1. Actually checking (API call in progress), OR
  // 2. We have all prerequisites but no status yet (about to check)
  const isCheckingStatus =
    isCheckingStatusInternal ||
    (privyAuthenticated && hasOtimToken && !!embeddedWallet && delegationStatus === null);

  // Check delegation status when wallet is available, authenticated, AND Otim token exists
  useEffect(() => {
    if (embeddedWallet && privyAuthenticated && hasOtimToken) {
      checkDelegationStatus();
    }
  }, [embeddedWallet, privyAuthenticated, hasOtimToken, checkDelegationStatus]);

  // Poll delegation status while delegating
  useEffect(() => {
    if (!isDelegating || !embeddedWallet) return;

    const interval = setInterval(checkDelegationStatus, 5000);
    return () => clearInterval(interval);
  }, [isDelegating, embeddedWallet, checkDelegationStatus]);

  // Reset state when auth state changes
  useEffect(() => {
    if (!privyAuthenticated) {
      setDelegationStatus(null);
      setIsDelegating(false);
      setError(null);
      setHasOtimToken(false);
    }
  }, [privyAuthenticated]);

  /**
   * Initiates the delegation process by signing an EIP-7702 authorization.
   */
  const delegate = useCallback(async () => {
    console.log("[Delegation] Starting delegation process...");

    if (!embeddedWallet) {
      console.error("[Delegation] No embedded wallet found");
      setError("No embedded wallet found");
      return;
    }

    if (isDelegating) {
      console.log("[Delegation] Already delegating, skipping...");
      return;
    }

    setError(null);
    setIsDelegating(true);

    try {
      // Step 1: Get the delegate address from the config API
      console.log("[Delegation] Step 1: Getting delegate address...");
      const delegateResponse = await getDelegateAddress(apiClient, {
        chainId: DEFAULT_CHAIN_ID,
      });

      // Validate the response
      if (!delegateResponse?.otimDelegateAddress) {
        throw new Error(
          "Failed to get delegate address from API - response was empty",
        );
      }

      const otimDelegateAddress = delegateResponse.otimDelegateAddress;
      console.log("[Delegation] Got delegate address:", otimDelegateAddress);

      // Step 2: Get current nonce for the account
      console.log("[Delegation] Step 2: Getting transaction nonce...");
      const nonce = await publicClient.getTransactionCount({
        address: embeddedWallet.address as Address,
      });
      console.log("[Delegation] Got nonce:", nonce);

      // Log all params before signing
      console.log("[Delegation] Step 3: Requesting EIP-7702 signature...", {
        chainId: DEFAULT_CHAIN_ID,
        contractAddress: otimDelegateAddress,
        nonce,
        walletAddress: embeddedWallet.address,
      });

      // Step 3: Sign the EIP-7702 authorization using Privy
      const authorization = await signAuthorization({
        chainId: DEFAULT_CHAIN_ID,
        contractAddress: otimDelegateAddress as Address,
        nonce: nonce,
      });

      console.log("[Delegation] Got authorization signature:", {
        nonce: authorization.nonce,
        yParity: authorization.yParity,
        r: authorization.r,
        s: authorization.s,
      });

      // Step 4: Prepare RLP-encoded authorization
      console.log("[Delegation] Step 4: Encoding authorization...");
      const rlpInput = [
        toHex(DEFAULT_CHAIN_ID),
        otimDelegateAddress as `0x${string}`,
        authorization.nonce === 0 ? "0x" : toHex(authorization.nonce),
        authorization.yParity === 0 ? "0x" : toHex(authorization.yParity),
        authorization.r,
        authorization.s,
      ] as const;

      const rlpEncoded = toRlp(rlpInput);
      console.log("[Delegation] RLP encoded authorization:", rlpEncoded);

      console.log("embeddedWallet.address", embeddedWallet.address);

      // Step 5: Submit delegation to the backend
      console.log("[Delegation] Step 5: Submitting delegation to backend...");
      const delegationResult = await createDelegation(apiClient, {
        signedAuthorization: rlpEncoded,
        signerAddress: embeddedWallet.address,
      });
      console.log("[Delegation] Backend response:", delegationResult);

      // Step 6: Refresh status after 15 seconds delay
      console.log(
        "[Delegation] Step 6: Waiting 15 seconds before checking delegation status...",
      );
      await new Promise((resolve) => setTimeout(resolve, 15000));

      console.log("[Delegation] Refreshing delegation status...");
      await checkDelegationStatus();

      console.log("[Delegation] Delegation process completed successfully!");
    } catch (err) {
      console.error("[Delegation] Error occurred:", err);
      setError(
        err instanceof Error ? err.message : "Failed to complete delegation",
      );
      setIsDelegating(false);
    }
  }, [
    apiClient,
    embeddedWallet,
    isDelegating,
    signAuthorization,
    checkDelegationStatus,
  ]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    delegationStatus,
    isDelegated: delegationStatus === "Delegated",
    isDelegating,
    isCheckingStatus,
    error,
    delegate,
    refreshStatus: checkDelegationStatus,
    clearError,
  };
}
