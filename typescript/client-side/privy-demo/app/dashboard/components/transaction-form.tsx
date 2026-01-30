"use client";

import type { TransferFormValues } from "~/hooks";

import { useState, useCallback } from "react";

import { useTransfer } from "~/hooks";
import { TOKEN_LIST, type TokenConfig } from "~/config/tokens";

/**
 * Token selector button component.
 */
function TokenButton({
  token,
  isSelected,
  onClick,
}: {
  token: TokenConfig;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-all
        ${
          isSelected
            ? "bg-violet-600 text-white shadow-md"
            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        }
      `}
    >
      <span className="block text-base font-semibold">{token.symbol}</span>
      <span
        className={`block text-xs ${isSelected ? "text-violet-200" : "text-zinc-500 dark:text-zinc-400"}`}
      >
        {token.name}
      </span>
    </button>
  );
}

/**
 * Success message component.
 */
function SuccessMessage({
  instructionId,
  onDismiss,
}: {
  instructionId: string;
  onDismiss: () => void;
}) {
  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-500">
          <svg
            className="h-4 w-4 text-white"
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
        <div className="flex-1">
          <h4 className="font-medium text-green-800 dark:text-green-200">
            Transfer Submitted
          </h4>
          <p className="mt-1 text-sm text-green-700 dark:text-green-300">
            Your transaction has been submitted and is being processed.
          </p>
          <p className="mt-2 font-mono text-xs text-green-600 dark:text-green-400">
            ID: {instructionId.slice(0, 10)}...{instructionId.slice(-8)}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * Transaction form for sending ETH, USDC, or USDT.
 */
export function TransactionForm() {
  const { executeTransfer, isTransferring, error, clearError } = useTransfer();

  const [selectedToken, setSelectedToken] = useState<string>("USDC");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [successId, setSuccessId] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      clearError();
      setSuccessId(null);

      const values: TransferFormValues = {
        token: selectedToken,
        amount,
        recipient,
      };

      try {
        const result = await executeTransfer(values);
        setSuccessId(result.instructionId);
        // Reset form on success
        setAmount("");
        setRecipient("");
      } catch {
        // Error is handled by the hook
      }
    },
    [selectedToken, amount, recipient, executeTransfer, clearError],
  );

  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(recipient);
  const isValidAmount = !isNaN(parseFloat(amount)) && parseFloat(amount) > 0;
  const canSubmit = isValidAddress && isValidAmount && !isTransferring;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="text-lg font-semibold text-black dark:text-zinc-50">
        Send Transaction
      </h3>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Transfer tokens to any address using your delegated account
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {/* Token Selector */}
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Select Token
          </label>
          <div className="flex gap-2">
            {TOKEN_LIST.map((token) => (
              <TokenButton
                key={token.symbol}
                token={token}
                isSelected={selectedToken === token.symbol}
                onClick={() => setSelectedToken(token.symbol)}
              />
            ))}
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label
            htmlFor="amount"
            className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Amount
          </label>
          <div className="relative">
            <input
              id="amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={`
                w-full rounded-lg border bg-white px-4 py-3 pr-16 text-black
                placeholder:text-zinc-400
                focus:outline-none focus:ring-2 focus:ring-violet-500
                dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500
                ${
                  amount && !isValidAmount
                    ? "border-red-300 dark:border-red-700"
                    : "border-zinc-200 dark:border-zinc-700"
                }
              `}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {selectedToken}
            </span>
          </div>
          {amount && !isValidAmount && (
            <p className="mt-1 text-xs text-red-500">
              Please enter a valid amount
            </p>
          )}
        </div>

        {/* Recipient Input */}
        <div>
          <label
            htmlFor="recipient"
            className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Recipient Address
          </label>
          <input
            id="recipient"
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x..."
            className={`
              w-full rounded-lg border bg-white px-4 py-3 font-mono text-sm text-black
              placeholder:text-zinc-400
              focus:outline-none focus:ring-2 focus:ring-violet-500
              dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500
              ${
                recipient && !isValidAddress
                  ? "border-red-300 dark:border-red-700"
                  : "border-zinc-200 dark:border-zinc-700"
              }
            `}
          />
          {recipient && !isValidAddress && (
            <p className="mt-1 text-xs text-red-500">
              Please enter a valid Ethereum address
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {successId && (
          <SuccessMessage
            instructionId={successId}
            onDismiss={() => setSuccessId(null)}
          />
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!canSubmit}
          className={`
            w-full rounded-lg px-4 py-3 text-sm font-semibold transition-all
            ${
              canSubmit
                ? "bg-violet-600 text-white hover:bg-violet-700 active:bg-violet-800"
                : "cursor-not-allowed bg-zinc-200 text-zinc-400 dark:bg-zinc-700 dark:text-zinc-500"
            }
          `}
        >
          {isTransferring ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Processing...
            </span>
          ) : (
            `Send ${selectedToken}`
          )}
        </button>
      </form>
    </div>
  );
}
