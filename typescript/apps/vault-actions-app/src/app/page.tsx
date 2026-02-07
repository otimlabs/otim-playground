"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { VaultConfig } from "@/lib/vaults";

type ActionType = "deposit" | "withdraw" | "migrate" | null;

interface ActionState {
  type: ActionType;
  vault: VaultConfig | null;
}

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

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function Home() {
  const [vaults, setVaults] = useState<VaultConfig[]>([]);
  const [vaultsLoading, setVaultsLoading] = useState(true);
  const [vaultsError, setVaultsError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [walletInput, setWalletInput] = useState("");
  const [action, setAction] = useState<ActionState>({ type: null, vault: null });
  const [amount, setAmount] = useState("");
  const [destVault, setDestVault] = useState<VaultConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultState | null>(null);

  useEffect(() => {
    async function loadVaults() {
      try {
        const res = await fetch("/api/vaults");
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch vaults");
        }
        if (data.error) {
          throw new Error(data.error);
        }
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error("No vaults returned");
        }
        setVaults(data);
      } catch (err) {
        setVaultsError(err instanceof Error ? err.message : "Failed to load vaults");
      } finally {
        setVaultsLoading(false);
      }
    }
    loadVaults();
  }, []);

  const handleSaveWallet = () => {
    if (walletInput.match(/^0x[a-fA-F0-9]{40}$/)) {
      setWalletAddress(walletInput);
    }
  };

  const openAction = (type: ActionType, vault: VaultConfig) => {
    setAction({ type, vault });
    setAmount("");
    setDestVault(null);
    setResult(null);
  };

  const closeAction = () => {
    setAction({ type: null, vault: null });
    setAmount("");
    setDestVault(null);
    setResult(null);
  };

  const handleSubmit = async () => {
    if (!action.vault || !walletAddress || !amount) return;
    setLoading(true);
    setResult(null);

    try {
      let endpoint = "";
      let body: Record<string, unknown> = {};

      if (action.type === "deposit") {
        endpoint = "/api/deposit";
        body = {
          vaultAddress: action.vault.address,
          vaultChainId: action.vault.chainId,
          vaultUnderlyingToken: action.vault.underlyingToken.address,
          depositAmount: amount,
          recipientAddress: walletAddress,
          decimals: action.vault.underlyingToken.decimals,
        };
      } else if (action.type === "withdraw") {
        endpoint = "/api/withdraw";
        body = {
          vaultAddress: action.vault.address,
          vaultChainId: action.vault.chainId,
          vaultUnderlyingToken: action.vault.underlyingToken.address,
          withdrawAmount: amount,
          recipientAddress: walletAddress,
          settlementToken: action.vault.underlyingToken.address,
          settlementChainId: action.vault.chainId,
          decimals: action.vault.underlyingToken.decimals,
        };
      } else if (action.type === "migrate" && destVault) {
        endpoint = "/api/migrate";
        body = {
          sourceVaultAddress: action.vault.address,
          sourceVaultChainId: action.vault.chainId,
          sourceVaultUnderlyingToken: action.vault.underlyingToken.address,
          destVaultAddress: destVault.address,
          destVaultChainId: destVault.chainId,
          destVaultUnderlyingToken: destVault.underlyingToken.address,
          withdrawAmount: amount,
          recipientAddress: walletAddress,
          decimals: action.vault.underlyingToken.decimals,
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

  const migrateTargets = action.vault
    ? vaults.filter((v) => v.address !== action.vault!.address)
    : [];

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans">
      <div className="max-w-4xl mx-auto px-4 py-8 overflow-hidden">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            OTIM Vault Actions
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">
            Deposit, withdraw, and migrate between yield vaults
          </p>
        </div>

        {/* Wallet Config */}
        <div className="mb-8 p-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Wallet Address
          </label>
          {walletAddress ? (
            <div className="flex items-center gap-3 min-w-0">
              <code className="text-sm font-mono text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded truncate min-w-0" title={walletAddress}>
                {walletAddress}
              </code>
              <button
                onClick={() => {
                  setWalletAddress("");
                  setWalletInput("");
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

        {/* Vault List */}
        {vaultsLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-zinc-500 text-sm">Loading vaults...</div>
          </div>
        ) : vaultsError ? (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {vaultsError}
          </div>
        ) : (
          <div className="space-y-3">
            {vaults.map((vault) => (
              <div
                key={`${vault.chainId}-${vault.address}`}
                className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-colors"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Link
                        href={`/${vault.network}/${vault.address}`}
                        className="font-medium text-zinc-100 hover:text-white transition-colors"
                      >
                        {vault.name}
                      </Link>
                      <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        {vault.chainName}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-zinc-800/50 text-zinc-500">
                        {vault.protocol}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-400">
                      <span>
                        {vault.underlyingToken.symbol}
                      </span>
                      <span>
                        APY: <span className="text-emerald-400">{formatApy(vault.apy)}</span>
                      </span>
                      <span>
                        TVL: {formatUsd(vault.tvlUsd)}
                      </span>
                      <span className="font-mono text-xs text-zinc-600 hidden sm:inline">
                        {truncateAddress(vault.address)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openAction("deposit", vault)}
                      disabled={!walletAddress}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Deposit
                    </button>
                    <button
                      onClick={() => openAction("withdraw", vault)}
                      disabled={!walletAddress}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Withdraw
                    </button>
                    <button
                      onClick={() => openAction("migrate", vault)}
                      disabled={!walletAddress}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Migrate
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!walletAddress && !vaultsLoading && !vaultsError && (
          <p className="text-center text-zinc-600 text-sm mt-6">
            Set your wallet address above to enable vault actions
          </p>
        )}
      </div>

      {/* Action Modal */}
      {action.type && action.vault && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold capitalize">
                {action.type}
              </h2>
              <button
                onClick={closeAction}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Source vault info */}
            <div className="mb-4 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
              <div className="text-xs text-zinc-500 mb-1">
                {action.type === "migrate" ? "Source Vault" : "Vault"}
              </div>
              <div className="font-medium text-sm">{action.vault.name}</div>
              <div className="text-xs text-zinc-400 mt-0.5">
                {action.vault.chainName} &middot; {action.vault.protocol} &middot; {action.vault.underlyingToken.symbol} &middot; {formatApy(action.vault.apy)} APY
              </div>
            </div>

            {/* Migrate: destination vault selector */}
            {action.type === "migrate" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Destination Vault
                </label>
                <select
                  value={destVault?.address ?? ""}
                  onChange={(e) => {
                    const v = vaults.find((v) => v.address === e.target.value);
                    setDestVault(v ?? null);
                  }}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                >
                  <option value="">Select a vault...</option>
                  {migrateTargets.map((v) => (
                    <option
                      key={`${v.chainId}-${v.address}`}
                      value={v.address}
                    >
                      {v.name} ({v.chainName}) - {formatApy(v.apy)} APY
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Amount input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Amount ({action.vault.underlyingToken.symbol})
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

            {/* Recipient */}
            <div className="mb-6 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
              <div className="text-xs text-zinc-500 mb-1">Recipient</div>
              <code className="text-xs font-mono text-zinc-300">
                {walletAddress}
              </code>
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
              disabled={
                loading ||
                !amount ||
                (action.type === "migrate" && !destVault)
              }
              className="w-full py-2.5 bg-zinc-100 text-zinc-900 text-sm font-medium rounded-md hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Processing..." : `Submit ${action.type}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
