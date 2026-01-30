"use client";

import { useCallback, useState } from "react";

import {
  useTransferExecution,
  type ExecuteTransferParams,
  type TransferExecutionResult,
} from "./use-transfer-execution";

/**
 * Transfer form values accepted by the hook.
 */
export interface TransferFormValues {
  /** Token symbol (ETH, USDC, USDT) */
  token: string;
  /** Amount to transfer (human readable) */
  amount: string;
  /** Recipient address */
  recipient: string;
}

/**
 * Transfer result returned on success.
 */
export interface TransferResult {
  instructionId: string;
}

/**
 * Transfer state machine states.
 */
type TransferStatus = "idle" | "pending" | "success" | "error";

/**
 * Internal state for the transfer hook.
 */
interface TransferState {
  status: TransferStatus;
  error: string | null;
  result: TransferResult | null;
}

/**
 * Return type for the useTransfer hook.
 */
export interface UseTransferReturn {
  /** Execute a transfer */
  executeTransfer: (values: TransferFormValues) => Promise<TransferResult>;
  /** Whether a transfer is in progress */
  isTransferring: boolean;
  /** Error message if transfer failed */
  error: string | null;
  /** Clear error state */
  clearError: () => void;
  /** Last successful transfer result */
  lastResult: TransferResult | null;
}

/**
 * Initial state for the transfer hook.
 */
const INITIAL_STATE: TransferState = {
  status: "idle",
  error: null,
  result: null,
};

/**
 * Extracts a user-friendly error message from an error.
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Transfer failed";
}

/**
 * Hook for executing token transfers via the Otim instruction system.
 *
 * This hook provides a clean interface for executing transfers with
 * proper state management. It delegates the execution flow to
 * `useTransferExecution` and handles UI state (loading, errors).
 *
 * Supports:
 * - ETH (native) transfers via `transfer` action
 * - ERC20 (USDC, USDT) transfers via `transferERC20` action
 *
 * @example
 * ```tsx
 * const { executeTransfer, isTransferring, error, clearError } = useTransfer();
 *
 * const handleSubmit = async () => {
 *   try {
 *     const result = await executeTransfer({
 *       token: "USDC",
 *       amount: "100",
 *       recipient: "0x...",
 *     });
 *     console.log("Transfer successful:", result.instructionId);
 *   } catch (error) {
 *     // Error is automatically captured in hook state
 *   }
 * };
 * ```
 */
export function useTransfer(): UseTransferReturn {
  const { execute } = useTransferExecution();
  const [state, setState] = useState<TransferState>(INITIAL_STATE);

  const executeTransfer = useCallback(
    async (values: TransferFormValues): Promise<TransferResult> => {
      setState({ status: "pending", error: null, result: null });

      try {
        const params: ExecuteTransferParams = {
          token: values.token,
          amount: values.amount,
          recipient: values.recipient,
        };

        const result: TransferExecutionResult = await execute(params);

        const transferResult: TransferResult = {
          instructionId: result.instructionId,
        };

        setState({ status: "success", error: null, result: transferResult });

        return transferResult;
      } catch (error) {
        const message = getErrorMessage(error);
        setState({ status: "error", error: message, result: null });
        throw error;
      }
    },
    [execute],
  );

  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      status: prev.status === "error" ? "idle" : prev.status,
      error: null,
    }));
  }, []);

  return {
    executeTransfer,
    isTransferring: state.status === "pending",
    error: state.error,
    clearError,
    lastResult: state.result,
  };
}
