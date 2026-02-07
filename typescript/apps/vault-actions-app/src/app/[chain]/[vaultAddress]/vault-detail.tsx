"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { VaultConfig } from "@/lib/vaults";
import { PAYMENT_OPTIONS } from "@/lib/constants";

type ActionType = "deposit" | "withdraw" | "migrate";

interface ResultState {
  requestId?: string;
  ephemeralWalletAddress?: string;
  error?: string;
}

function formatUsd(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  return `$${amount.toLocaleString()}`;
}

function formatApy(apy: number): string {
  return `${(apy * 100).toFixed(2)}%`;
}

export default function VaultDetail({ vault, isErc4626 }: { vault: VaultConfig; isErc4626: boolean }) {
  const [walletAddress, setWalletAddress] = useState("");
  const [walletInput, setWalletInput] = useState("");
  const [actionType, setActionType] = useState<ActionType>("deposit");
  const [amount, setAmount] = useState("");
  const [paymentOptionId, setPaymentOptionId] = useState(PAYMENT_OPTIONS[0].id);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultState | null>(null);

  // Migrate state
  const [migrateVaults, setMigrateVaults] = useState<VaultConfig[]>([]);
  const [destVault, setDestVault] = useState<VaultConfig | null>(null);
  const [migrateLoading, setMigrateLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("walletAddress");
    if (saved) {
      setWalletAddress(saved);
      setWalletInput(saved);
    }
  }, []);

  useEffect(() => {
    if (actionType === "migrate" && migrateVaults.length === 0) {
      setMigrateLoading(true);
      fetch("/api/vaults")
        .then((res) => res.json())
        .then((data) => {
          const vaults: VaultConfig[] = Array.isArray(data) ? data : [];
          setMigrateVaults(
            vaults.filter((v) => v.address !== vault.address)
          );
        })
        .catch(() => {})
        .finally(() => setMigrateLoading(false));
    }
  }, [actionType, migrateVaults.length, vault.address]);

  const handleSaveWallet = () => {
    if (walletInput.match(/^0x[a-fA-F0-9]{40}$/)) {
      setWalletAddress(walletInput);
      localStorage.setItem("walletAddress", walletInput);
    }
  };

  const handleSubmit = async () => {
    if (!walletAddress || !amount) return;
    setLoading(true);
    setResult(null);

    try {
      let endpoint = "";
      let body: Record<string, unknown> = {};

      if (actionType === "deposit") {
        const paymentOpt = PAYMENT_OPTIONS.find((o) => o.id === paymentOptionId) ?? PAYMENT_OPTIONS[0];
        endpoint = "/api/deposit";
        body = {
          vaultAddress: vault.address,
          vaultChainId: vault.chainId,
          vaultUnderlyingToken: vault.underlyingToken.address,
          depositAmount: amount,
          recipientAddress: walletAddress,
          decimals: vault.underlyingToken.decimals,
          paymentChainId: paymentOpt.chainId,
          paymentToken: paymentOpt.tokenAddress,
        };
      } else if (actionType === "withdraw") {
        endpoint = "/api/withdraw";
        body = {
          vaultAddress: vault.address,
          vaultChainId: vault.chainId,
          vaultUnderlyingToken: vault.underlyingToken.address,
          withdrawAmount: amount,
          recipientAddress: walletAddress,
          settlementToken: vault.underlyingToken.address,
          settlementChainId: vault.chainId,
          decimals: vault.underlyingToken.decimals,
        };
      } else if (actionType === "migrate" && destVault) {
        endpoint = "/api/migrate";
        body = {
          sourceVaultAddress: vault.address,
          sourceVaultChainId: vault.chainId,
          sourceVaultUnderlyingToken: vault.underlyingToken.address,
          destVaultAddress: destVault.address,
          destVaultChainId: destVault.chainId,
          destVaultUnderlyingToken: destVault.underlyingToken.address,
          withdrawAmount: amount,
          recipientAddress: walletAddress,
          decimals: vault.underlyingToken.decimals,
        };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setResult({ error: data.error || "Request failed" });
      } else {
        setResult({
          requestId: data.requestId,
          ephemeralWalletAddress: data.ephemeralWalletAddress,
        });
      }
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    walletAddress &&
    amount &&
    !loading &&
    (actionType !== "migrate" || destVault);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          All vaults
        </Link>

        {/* Vault hero */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
              {vault.chainName}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-zinc-800/50 text-zinc-500">
              {vault.protocol}
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">
            {vault.name}
          </h1>
          <p className="text-sm font-mono text-zinc-600 mb-4 break-all">
            {vault.address}
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
              <div className="text-xs text-zinc-500 mb-1">Token</div>
              <div className="text-sm font-medium">{vault.underlyingToken.symbol}</div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
              <div className="text-xs text-zinc-500 mb-1">APY (7d)</div>
              <div className="text-sm font-medium text-emerald-400">{formatApy(vault.apy)}</div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
              <div className="text-xs text-zinc-500 mb-1">TVL</div>
              <div className="text-sm font-medium">{formatUsd(vault.tvlUsd)}</div>
            </div>
          </div>
        </div>

        {/* Wallet */}
        <div className="mb-6 p-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Wallet Address
          </label>
          {walletAddress ? (
            <div className="flex items-center gap-3">
              <code className="text-sm font-mono text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded break-all">
                {walletAddress}
              </code>
              <button
                onClick={() => {
                  setWalletAddress("");
                  setWalletInput("");
                  localStorage.removeItem("walletAddress");
                }}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={walletInput}
                onChange={(e) => setWalletInput(e.target.value)}
                placeholder="0x..."
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
              />
              <button
                onClick={handleSaveWallet}
                disabled={!walletInput.match(/^0x[a-fA-F0-9]{40}$/)}
                className="px-4 py-2 bg-zinc-100 text-zinc-900 text-sm font-medium rounded-md hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Save
              </button>
            </div>
          )}
        </div>

        {/* ERC-4626 warning */}
        {!isErc4626 && (
          <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
            This vault does not implement the ERC-4626 standard and cannot be used for deposits, withdrawals, or migrations.
          </div>
        )}

        {/* Action tabs */}
        <div className={`flex gap-1 mb-4 p-1 rounded-lg bg-zinc-900/50 border border-zinc-800 ${!isErc4626 ? "opacity-40 pointer-events-none" : ""}`}>
          {(["deposit", "withdraw", "migrate"] as const).map((type) => (
            <button
              key={type}
              onClick={() => {
                setActionType(type);
                setResult(null);
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-md capitalize transition-colors ${
                actionType === type
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Action form */}
        <div className={`p-4 rounded-lg border border-zinc-800 bg-zinc-900/50 ${!isErc4626 ? "opacity-40 pointer-events-none" : ""}`}>
          {/* Deposit: payment token selector */}
          {actionType === "deposit" && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Pay With
              </label>
              <select
                value={paymentOptionId}
                onChange={(e) => setPaymentOptionId(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
              >
                {PAYMENT_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Migrate: destination vault */}
          {actionType === "migrate" && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Destination Vault
              </label>
              {migrateLoading ? (
                <div className="text-xs text-zinc-500">Loading vaults...</div>
              ) : (
                <select
                  value={destVault?.address ?? ""}
                  onChange={(e) => {
                    const v = migrateVaults.find(
                      (v) => v.address === e.target.value
                    );
                    setDestVault(v ?? null);
                  }}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                >
                  <option value="">Select a vault...</option>
                  {migrateVaults.map((v) => (
                    <option
                      key={`${v.chainId}-${v.address}`}
                      value={v.address}
                    >
                      {v.name} ({v.chainName}) - {formatApy(v.apy)} APY
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Amount */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Amount ({actionType === "deposit"
                ? (PAYMENT_OPTIONS.find((o) => o.id === paymentOptionId) ?? PAYMENT_OPTIONS[0]).tokenSymbol
                : vault.underlyingToken.symbol})
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="any"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
            />
          </div>

          {/* Result */}
          {result && (
            <div
              className={`mb-4 p-3 rounded-lg text-sm ${
                result.error
                  ? "bg-red-500/10 border border-red-500/20 text-red-400"
                  : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
              }`}
            >
              {result.error ? (
                <div>
                  <div className="font-medium mb-1">Error</div>
                  <div className="text-xs">{result.error}</div>
                </div>
              ) : (
                <div>
                  <div className="font-medium mb-1">Orchestration Created</div>
                  <div className="text-xs font-mono space-y-1">
                    <div>
                      <span className="text-zinc-500">Request ID: </span>
                      {result.requestId}
                    </div>
                    <div>
                      <span className="text-zinc-500">Ephemeral Wallet: </span>
                      {result.ephemeralWalletAddress}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full py-2.5 bg-zinc-100 text-zinc-900 text-sm font-medium rounded-md hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors capitalize"
          >
            {loading ? "Processing..." : `Submit ${actionType}`}
          </button>

          {!walletAddress && (
            <p className="text-center text-zinc-600 text-xs mt-3">
              Set your wallet address above to submit
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
