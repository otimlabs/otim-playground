"use client";

import type { User } from "@otim/utils/schemas";
import type { Address } from "viem";

import {
  useCreateWallet,
  usePrivy,
  useWallets,
} from "@privy-io/react-auth";
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";

import { createAuthMessage, generateNonce, parseSignature } from "~/lib/auth";
import { loginWithSiwe } from "~/server/actions/auth";

/**
 * Types
 */

export type AuthStatus =
  | "idle"
  | "preparing"
  | "signing"
  | "authenticating"
  | "success"
  | "error";

export interface PrivyAuthResult {
  /** JWT session token */
  sessionToken: string;
  /** Authenticated user data */
  user: User;
}

interface AuthState {
  status: AuthStatus;
  error: Error | null;
}

type AuthAction =
  | { type: "START_PREPARING" }
  | { type: "START_SIGNING" }
  | { type: "START_AUTHENTICATING" }
  | { type: "SUCCESS" }
  | { type: "ERROR"; error: Error }
  | { type: "RESET" };

export interface UsePrivyAuthReturn {
  /** Initiates the SIWE authentication flow */
  signIn: () => Promise<PrivyAuthResult>;
  /** Current authentication status */
  status: AuthStatus;
  /** Whether authentication is idle (not started) */
  isIdle: boolean;
  /** Whether authentication is in progress (preparing, signing or authenticating) */
  isLoading: boolean;
  /** Whether authentication completed successfully */
  isSuccess: boolean;
  /** Whether authentication failed */
  isError: boolean;
  /** Error instance if authentication failed */
  error: Error | null;
  /** Resets the authentication state to idle */
  reset: () => void;
}

/**
 * Constants
 */

/** Key used to store the Otim authentication token in localStorage */
export const OTIM_TOKEN_KEY = "otimToken";

/**
 * Check if the Otim token exists in localStorage.
 * Returns false during SSR.
 */
function hasStoredToken(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(OTIM_TOKEN_KEY);
}

const INITIAL_STATE: AuthState = {
  status: "idle",
  error: null,
};

/**
 * Reducer
 */

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "START_PREPARING":
      return { status: "preparing", error: null };
    case "START_SIGNING":
      return { status: "signing", error: null };
    case "START_AUTHENTICATING":
      return { status: "authenticating", error: null };
    case "SUCCESS":
      return { status: "success", error: null };
    case "ERROR":
      return { status: "error", error: action.error };
    case "RESET":
      return INITIAL_STATE;
    default:
      return state;
  }
}

/**
 * Helpers
 */

function isUserRejectionError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const rejectionPatterns = [
      "user rejected",
      "user denied",
      "user cancelled",
      "user canceled",
      "rejected the request",
      "denied transaction",
      "action_rejected",
    ];
    return rejectionPatterns.some((pattern) => message.includes(pattern));
  }
  return false;
}

function createAuthError(
  error: unknown,
  step: "wallet" | "signing" | "authenticating",
): Error {
  if (error instanceof Error) {
    if (isUserRejectionError(error)) {
      return new Error("User rejected the signature request");
    }
    return new Error(`Authentication failed at ${step}: ${error.message}`);
  }
  return new Error(`Authentication failed at ${step}: Unknown error`);
}

/**
 * Finds the Privy embedded wallet from the wallets array.
 */
function findEmbeddedWallet(
  wallets: ReturnType<typeof useWallets>["wallets"],
): (typeof wallets)[number] | undefined {
  return wallets.find((wallet) => wallet.walletClientType === "privy");
}

/**
 * Polls until a wallet with the given address appears in the wallets array.
 * Used to wait for a newly created wallet to be registered in Privy's state.
 */
function waitForWalletInArray(
  getWallets: () => ReturnType<typeof useWallets>["wallets"],
  targetAddress: string,
  maxAttempts = 20,
  intervalMs = 100,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      const wallets = getWallets();
      const found = wallets.some(
        (w) => w.address.toLowerCase() === targetAddress.toLowerCase()
      );
      if (found) {
        resolve();
      } else if (attempts >= maxAttempts) {
        reject(new Error("Wallet not found in registry after creation"));
      } else {
        setTimeout(check, intervalMs);
      }
    };
    check();
  });
}

/**
 * Hook
 */

/**
 * usePrivyAuth Hook
 *
 * Provides Privy-based authentication with SIWE (Sign-In With Ethereum).
 * Handles the full flow: wallet detection/creation, message signing, and server verification.
 *
 * @returns Authentication methods and state
 *
 * @example
 * ```tsx
 * function LoginButton() {
 *   const { signIn, isLoading, isError, error } = usePrivyAuth();
 *
 *   const handleLogin = async () => {
 *     try {
 *       const { sessionToken, user } = await signIn();
 *       console.log('Logged in:', user.id);
 *     } catch (err) {
 *       console.error('Login failed:', err);
 *     }
 *   };
 *
 *   return (
 *     <button onClick={handleLogin} disabled={isLoading}>
 *       {isLoading ? 'Signing in...' : 'Sign In'}
 *     </button>
 *   );
 * }
 * ```
 */
export function usePrivyAuth(): UsePrivyAuthReturn {
  const [state, dispatch] = useReducer(authReducer, INITIAL_STATE);
  const { ready, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();

  // Ref to access current wallets array for polling after wallet creation
  const walletsRef = useRef(wallets);
  useEffect(() => {
    walletsRef.current = wallets;
  }, [wallets]);

  // Refs to store data between async operations
  const siweMessageRef = useRef<string | null>(null);
  const resolveRef = useRef<((result: PrivyAuthResult) => void) | null>(null);
  const rejectRef = useRef<((error: Error) => void) | null>(null);

  // Restore success state from localStorage on mount
  // This ensures that if user already authenticated, we don't require re-signing
  useEffect(() => {
    if (authenticated && hasStoredToken() && state.status === "idle") {
      dispatch({ type: "SUCCESS" });
    }
  }, [authenticated, state.status]);

  // Clear success state if user logs out of Privy
  useEffect(() => {
    if (!authenticated && state.status === "success") {
      dispatch({ type: "RESET" });
      localStorage.removeItem(OTIM_TOKEN_KEY);
    }
  }, [authenticated, state.status]);

  // Derived state for better DX
  const derivedState = useMemo(
    () => ({
      isIdle: state.status === "idle",
      isLoading:
        state.status === "preparing" ||
        state.status === "signing" ||
        state.status === "authenticating",
      isSuccess: state.status === "success",
      isError: state.status === "error",
    }),
    [state.status],
  );

  // Handle successful signature
  const handleSignatureSuccess = useCallback(async (signature: string) => {
    const message = siweMessageRef.current;
    if (!message) {
      const error = new Error("SIWE message not found");
      dispatch({ type: "ERROR", error });
      rejectRef.current?.(error);
      return;
    }

    dispatch({ type: "START_AUTHENTICATING" });

    try {
      const vrs = parseSignature(signature);
      const result = await loginWithSiwe(message, vrs);

      // Store the token in localStorage for subsequent API calls
      localStorage.setItem(OTIM_TOKEN_KEY, result.authorization);
      // Dispatch custom event to notify other components of token availability
      window.dispatchEvent(new Event("otim-token-set"));

      dispatch({ type: "SUCCESS" });
      resolveRef.current?.({
        sessionToken: result.authorization,
        user: result.user,
      });
    } catch (err) {
      const error = createAuthError(err, "authenticating");
      dispatch({ type: "ERROR", error });
      rejectRef.current?.(error);
    }
  }, []);

  // Handle signature error
  const handleSignatureError = useCallback((err: unknown) => {
    const error = createAuthError(err, "signing");
    dispatch({ type: "ERROR", error });
    rejectRef.current?.(error);
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
    siweMessageRef.current = null;
    resolveRef.current = null;
    rejectRef.current = null;
    // Clear token from localStorage on reset
    localStorage.removeItem(OTIM_TOKEN_KEY);
  }, []);

  type ConnectedWallet = ReturnType<typeof useWallets>["wallets"][number];

  /**
   * Gets or creates the embedded wallet.
   * If no embedded wallet exists, creates one using Privy's createWallet.
   * Returns the wallet object from the wallets array.
   */
  const getOrCreateEmbeddedWallet = useCallback(async (): Promise<ConnectedWallet> => {
    // First check if we already have an embedded wallet
    const existingWallet = findEmbeddedWallet(wallets);
    if (existingWallet) {
      return existingWallet;
    }

    // Create a new embedded wallet
    const newWallet = await createWallet();

    // Wait for the wallet to appear in Privy's internal registry
    await waitForWalletInArray(() => walletsRef.current, newWallet.address);
    
    // Get the wallet object from the updated wallets array
    const walletFromArray = walletsRef.current.find(
      (w) => w.address.toLowerCase() === newWallet.address.toLowerCase()
    );
    
    if (!walletFromArray) {
      throw new Error("Wallet not found in registry after waiting");
    }

    return walletFromArray;
  }, [wallets, createWallet]);

  const signIn = useCallback((): Promise<PrivyAuthResult> => {
    return new Promise((resolve, reject) => {
      // Store promise handlers for async callback resolution
      resolveRef.current = resolve;
      rejectRef.current = reject;

      // Check Privy readiness
      if (!ready) {
        const error = new Error(
          "Privy is not ready. Please wait and try again.",
        );
        dispatch({ type: "ERROR", error });
        reject(error);
        return;
      }

      if (!authenticated) {
        const error = new Error(
          "Not authenticated with Privy. Please log in first.",
        );
        dispatch({ type: "ERROR", error });
        reject(error);
        return;
      }

      dispatch({ type: "START_PREPARING" });

      // Get or create embedded wallet, then sign
      getOrCreateEmbeddedWallet()
        .then(async (wallet) => {
          dispatch({ type: "START_SIGNING" });

          // Generate SIWE message
          const nonce = generateNonce();
          const message = createAuthMessage(wallet.address as Address, nonce);
          siweMessageRef.current = message;

          // Sign directly using the wallet object from the array
          try {
            const signature = await wallet.sign(message);
            handleSignatureSuccess(signature);
          } catch (signErr) {
            handleSignatureError(signErr);
          }
        })
        .catch((err) => {
          const error = createAuthError(err, "wallet");
          dispatch({ type: "ERROR", error });
          reject(error);
        });
    });
  }, [ready, authenticated, getOrCreateEmbeddedWallet, handleSignatureSuccess, handleSignatureError]);

  return {
    signIn,
    status: state.status,
    error: state.error,
    reset,
    ...derivedState,
  };
}
