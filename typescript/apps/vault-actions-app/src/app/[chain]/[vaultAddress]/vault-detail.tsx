"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  const [paymentOptionId, setPaymentOptionId] = useState(PAYMENT_OPTIONS[0].id);
  const [settlementOptionId, setSettlementOptionId] = useState(PAYMENT_OPTIONS[0].id);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultState | null>(null);
  const router = useRouter();

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
    if (!walletAddress) return;
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
          recipientAddress: walletAddress,
          paymentChainId: paymentOpt.chainId,
          paymentToken: paymentOpt.tokenAddress,
        };
      } else if (actionType === "withdraw") {
        const settlementOpt = PAYMENT_OPTIONS.find((o) => o.id === settlementOptionId) ?? PAYMENT_OPTIONS[0];
        endpoint = "/api/withdraw";
        body = {
          vaultAddress: vault.address,
          vaultChainId: vault.chainId,
          vaultUnderlyingToken: vault.underlyingToken.address,
          recipientAddress: walletAddress,
          settlementToken: settlementOpt.tokenAddress,
          settlementChainId: settlementOpt.chainId,
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
          recipientAddress: walletAddress,
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
        sessionStorage.setItem(
          `request-${data.requestId}`,
          JSON.stringify({
            actionType: actionType,
            vaultName: vault.name,
            vaultNetwork: vault.chainName,
            vaultAddress: vault.address,
          })
        );
        router.push(`/request/${data.requestId}`);
        return;
      }
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    walletAddress &&
    !loading &&
    (actionType !== "migrate" || destVault);

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-700 transition-colors mb-6"
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
            <span className="text-xs px-2 py-0.5 rounded bg-zinc-200 text-zinc-600">
              {vault.chainName}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-500">
              {vault.protocol}
            </span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {vault.name}
            </h1>
            {vault.url && (
              <a
                href={vault.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-zinc-700 transition-colors"
                title="Vault info"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            )}
          </div>
          <p className="text-sm font-mono text-zinc-400 mb-4 break-all">
            {vault.address}
          </p>
          {(vault.apy > 0 || vault.tvlUsd > 0) && (
            <div className="flex gap-4">
              {vault.apy > 0 && (
                <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200">
                  <div className="text-xs text-zinc-400 mb-1">APY (7d)</div>
                  <div className="text-sm font-medium text-emerald-600">{formatApy(vault.apy)}</div>
                </div>
              )}
              {vault.tvlUsd > 0 && (
                <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200">
                  <div className="text-xs text-zinc-400 mb-1">TVL</div>
                  <div className="text-sm font-medium">{formatUsd(vault.tvlUsd)}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Wallet */}
        <div className="mb-6 p-4 rounded-lg border border-zinc-200 bg-zinc-50">
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Wallet Address
          </label>
          {walletAddress ? (
            <div className="flex items-center gap-3">
              <code className="text-sm font-mono text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded break-all">
                {walletAddress}
              </code>
              <button
                onClick={() => {
                  setWalletAddress("");
                  setWalletInput("");
                  localStorage.removeItem("walletAddress");
                }}
                className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors shrink-0"
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
                className="flex-1 bg-white border border-zinc-300 rounded-md px-3 py-2 text-sm font-mono text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
              <button
                onClick={handleSaveWallet}
                disabled={!walletInput.match(/^0x[a-fA-F0-9]{40}$/)}
                className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-md hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Save
              </button>
            </div>
          )}
        </div>

        {/* ERC-4626 warning */}
        {!isErc4626 && (
          <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
            This vault does not implement the ERC-4626 standard and cannot be used for deposits, withdrawals, or migrations.
          </div>
        )}

        {/* Action tabs */}
        <div className={`flex gap-1 mb-4 p-1 rounded-lg bg-zinc-50 border border-zinc-200 ${!isErc4626 ? "opacity-40 pointer-events-none" : ""}`}>
          {(["deposit", "withdraw", "migrate"] as const).map((type) => (
            <button
              key={type}
              onClick={() => {
                setActionType(type);
                setResult(null);
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-md capitalize transition-colors ${
                actionType === type
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Action form */}
        <div className={`p-4 rounded-lg border border-zinc-200 bg-zinc-50 ${!isErc4626 ? "opacity-40 pointer-events-none" : ""}`}>
          {/* Deposit: payment token selector */}
          {actionType === "deposit" && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Pay With
              </label>
              <select
                value={paymentOptionId}
                onChange={(e) => setPaymentOptionId(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              >
                {PAYMENT_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Withdraw: settlement token selector */}
          {actionType === "withdraw" && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Receive As
              </label>
              <select
                value={settlementOptionId}
                onChange={(e) => setSettlementOptionId(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400"
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
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Destination Vault
              </label>
              {migrateLoading ? (
                <div className="text-xs text-zinc-400">Loading vaults...</div>
              ) : (
                <select
                  value={destVault?.address ?? ""}
                  onChange={(e) => {
                    const v = migrateVaults.find(
                      (v) => v.address === e.target.value
                    );
                    setDestVault(v ?? null);
                  }}
                  className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400"
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

          {/* Result */}
          {result && (
            <div
              className={`mb-4 p-3 rounded-lg text-sm ${
                result.error
                  ? "bg-red-50 border border-red-200 text-red-600"
                  : "bg-emerald-50 border border-emerald-200 text-emerald-600"
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
                      <span className="text-zinc-400">Request ID: </span>
                      {result.requestId}
                    </div>
                    <div>
                      <span className="text-zinc-400">Ephemeral Wallet: </span>
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
            className="w-full py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-md hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors capitalize"
          >
            {loading ? "Processing..." : "Start"}
          </button>

          {!walletAddress && (
            <p className="text-center text-zinc-400 text-xs mt-3">
              Set your wallet address above to submit
            </p>
          )}
        </div>
      </div>

      {/* Powered by Otim */}
      <div className="text-center py-6 text-sm text-zinc-400">
        Powered by{" "}
        <a
          href="https://otim.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-600 hover:text-zinc-900 transition-colors"
        >
          Otim
        </a>
      </div>
    </div>
  );
}
