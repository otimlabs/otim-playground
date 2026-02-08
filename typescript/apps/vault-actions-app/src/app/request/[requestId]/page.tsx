"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface OrchestrationDetails {
  requestId: string;
  ephemeralWalletAddress: string;
  status: "pending" | "paid" | "inProgress" | "cancelled" | "draft";
  metadata: Record<string, unknown>;
  numRuns: number;
  maxRuns?: number | null;
}

const STATUS_CONFIG: Record<
  OrchestrationDetails["status"],
  { label: string; color: string; bg: string; border: string }
> = {
  draft: { label: "Draft", color: "text-zinc-500", bg: "bg-zinc-100", border: "border-zinc-200" },
  pending: { label: "Awaiting Deposit", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  inProgress: { label: "In Progress", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  paid: { label: "Completed", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  cancelled: { label: "Cancelled", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
};

function StatusBadge({ status }: { status: OrchestrationDetails["status"] }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full ${config.bg} ${config.color} ${config.border} border`}>
      {(status === "pending" || status === "inProgress") && (
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status === "pending" ? "bg-amber-400" : "bg-blue-400"}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${status === "pending" ? "bg-amber-500" : "bg-blue-500"}`} />
        </span>
      )}
      {config.label}
    </span>
  );
}

export default function RequestPage() {
  const params = useParams();
  const requestId = params.requestId as string;

  const [details, setDetails] = useState<OrchestrationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Read action context from sessionStorage
  const [actionContext, setActionContext] = useState<{
    actionType: string;
    vaultName: string;
    vaultNetwork: string;
    vaultAddress: string;
  } | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(`request-${requestId}`);
    if (stored) {
      try {
        setActionContext(JSON.parse(stored));
      } catch {}
    }
  }, [requestId]);

  const fetchDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/orchestration/${requestId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to fetch details");
        return null;
      }
      setDetails(data.data ?? data);
      setError(null);
      return data.data ?? data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch details");
      return null;
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  // Initial fetch
  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Poll every 5s while status is pending or inProgress
  useEffect(() => {
    if (!details) return;
    if (details.status !== "pending" && details.status !== "inProgress") return;

    const interval = setInterval(async () => {
      const result = await fetchDetails();
      if (result && result.status !== "pending" && result.status !== "inProgress") {
        clearInterval(interval);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [details, fetchDetails]);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isTerminal = details?.status === "paid" || details?.status === "cancelled";

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

        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          {actionContext ? `${actionContext.actionType.charAt(0).toUpperCase() + actionContext.actionType.slice(1)} Request` : "Request Details"}
        </h1>

        {actionContext && (
          <p className="text-sm text-zinc-500 mb-6">
            {actionContext.vaultName} on {actionContext.vaultNetwork}
          </p>
        )}

        {loading && !details ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-zinc-400 text-sm">Loading...</div>
          </div>
        ) : error && !details ? (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        ) : details ? (
          <div className="space-y-6">
            {/* Status */}
            <div className="p-4 rounded-lg border border-zinc-200 bg-zinc-50">
              <div className="text-xs text-zinc-400 mb-2">Status</div>
              <StatusBadge status={details.status} />
            </div>

            {/* Steps */}
            <div className="p-4 rounded-lg border border-zinc-200 bg-zinc-50">
              <div className="text-xs text-zinc-400 mb-3">Progress</div>
              <div className="space-y-3">
                <Step
                  number={1}
                  label="Orchestration created"
                  done={true}
                />
                <Step
                  number={2}
                  label={details.status === "pending"
                    ? "Send funds to the ephemeral wallet below"
                    : "Funds received"
                  }
                  done={details.status !== "pending" && details.status !== "draft"}
                  active={details.status === "pending"}
                />
                <Step
                  number={3}
                  label={actionContext?.actionType === "withdraw"
                    ? "Executing withdrawal"
                    : actionContext?.actionType === "migrate"
                    ? "Executing migration"
                    : "Executing deposit into vault"
                  }
                  done={details.status === "paid"}
                  active={details.status === "inProgress"}
                />
                <Step
                  number={4}
                  label={details.status === "cancelled" ? "Cancelled" : "Complete"}
                  done={details.status === "paid"}
                  active={false}
                  error={details.status === "cancelled"}
                />
              </div>
            </div>

            {/* Ephemeral Wallet */}
            {!isTerminal && (
              <div className="p-4 rounded-lg border border-zinc-200 bg-zinc-50">
                <div className="text-xs text-zinc-400 mb-1">
                  {details.status === "pending" ? "Send funds to this address" : "Ephemeral Wallet"}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm font-mono text-zinc-900 break-all">
                    {details.ephemeralWalletAddress}
                  </code>
                  <button
                    onClick={() => handleCopy(details.ephemeralWalletAddress)}
                    className="shrink-0 p-1.5 rounded-md hover:bg-zinc-200 transition-colors"
                    title="Copy address"
                  >
                    {copied ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-600">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </button>
                </div>
                {details.status === "pending" && (
                  <p className="text-xs text-zinc-400 mt-2">
                    Deposit the tokens you want to {actionContext?.actionType ?? "deposit"} into this ephemeral wallet. The orchestration will proceed automatically once funds are detected.
                  </p>
                )}
              </div>
            )}

            {/* Request ID */}
            <div className="p-4 rounded-lg border border-zinc-200 bg-zinc-50">
              <div className="text-xs text-zinc-400 mb-1">Request ID</div>
              <code className="text-xs font-mono text-zinc-600 break-all">
                {details.requestId}
              </code>
            </div>
          </div>
        ) : null}
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

function Step({
  number,
  label,
  done,
  active,
  error,
}: {
  number: number;
  label: string;
  done: boolean;
  active?: boolean;
  error?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium shrink-0 ${
          error
            ? "bg-red-100 text-red-600 border border-red-200"
            : done
            ? "bg-emerald-100 text-emerald-600 border border-emerald-200"
            : active
            ? "bg-blue-100 text-blue-600 border border-blue-200"
            : "bg-zinc-100 text-zinc-400 border border-zinc-200"
        }`}
      >
        {done ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : error ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          number
        )}
      </div>
      <span
        className={`text-sm ${
          error
            ? "text-red-600"
            : done
            ? "text-zinc-900"
            : active
            ? "text-zinc-900 font-medium"
            : "text-zinc-400"
        }`}
      >
        {label}
        {active && (
          <span className="inline-flex ml-1">
            <span className="animate-pulse">...</span>
          </span>
        )}
      </span>
    </div>
  );
}
