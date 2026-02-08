import { createPublicClient, http } from "viem";
import { mainnet, base, arbitrum, optimism, polygon } from "viem/chains";
import type { Chain } from "viem";

export interface VaultConfig {
  address: `0x${string}`;
  name: string;
  symbol: string;
  protocol: string;
  chainId: number;
  chainName: string;
  network: string;
  underlyingToken: {
    address: `0x${string}`;
    symbol: string;
    decimals: number;
  };
  apy: number;
  tvlUsd: number;
  url?: string;
}

interface VaultsFyiAsset {
  address: string;
  symbol: string;
  decimals?: number;
}

interface VaultsFyiApyTimeframe {
  base?: number;
  reward?: number;
  total?: number;
}

interface VaultsFyiVault {
  address: string;
  name: string;
  symbol?: string;
  network: {
    name: string;
    chainId: number;
  };
  asset: VaultsFyiAsset;
  protocol: {
    name: string;
  };
  apy: {
    "1day"?: VaultsFyiApyTimeframe;
    "7day"?: VaultsFyiApyTimeframe;
    "30day"?: VaultsFyiApyTimeframe;
  };
  tvl: {
    usd: string;
  };
}

const NETWORK_DISPLAY_NAMES: Record<string, string> = {
  mainnet: "Ethereum",
  base: "Base",
  arbitrum: "Arbitrum",
  optimism: "Optimism",
  polygon: "Polygon",
};

const CHAINS: Record<string, Chain> = {
  mainnet,
  base,
  arbitrum,
  optimism,
  polygon,
};

// Minimal ABIs for on-chain ERC-4626 / ERC-20 reads
const erc4626Abi = [
  { name: "name", type: "function", inputs: [], outputs: [{ name: "", type: "string" }], stateMutability: "view" },
  { name: "symbol", type: "function", inputs: [], outputs: [{ name: "", type: "string" }], stateMutability: "view" },
  { name: "asset", type: "function", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { name: "totalAssets", type: "function", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { name: "convertToAssets", type: "function", inputs: [{ name: "shares", type: "uint256" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { name: "convertToShares", type: "function", inputs: [{ name: "assets", type: "uint256" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
] as const;

const erc20Abi = [
  { name: "symbol", type: "function", inputs: [], outputs: [{ name: "", type: "string" }], stateMutability: "view" },
  { name: "decimals", type: "function", inputs: [], outputs: [{ name: "", type: "uint8" }], stateMutability: "view" },
] as const;

const CHAIN_BY_ID: Record<number, Chain> = Object.fromEntries(
  Object.values(CHAINS).map((c) => [c.id, c])
);

interface CuratedVault {
  network: string;
  address: `0x${string}`;
  url: string;
  nameOverride?: string;
}

/**
 * Curated vault list — add or remove entries here.
 * fetchVaults() resolves each via vaults.fyi API (or RPC fallback).
 */
const CURATED_VAULTS: CuratedVault[] = [
  // Ethereum — Morpho
  { network: "mainnet", address: "0xBEEF01735c132Ada46AA9aA9f5990cf29d6145c7", url: "https://app.morpho.org/vault?vault=0xBEEF01735c132Ada46AA9aA9f5990cf29d6145c7&network=mainnet" },
  { network: "mainnet", address: "0xbEef047a543E45807105E51A8BBEFCc5950fcfBa", url: "https://app.morpho.org/vault?vault=0xbEef047a543E45807105E51A8BBEFCc5950fcfBa&network=mainnet" },
  { network: "mainnet", address: "0x8eB67A509616cd6A7c1B3c8C21D48FF57df3d458", url: "https://app.morpho.org/vault?vault=0x8eB67A509616cd6A7c1B3c8C21D48FF57df3d458&network=mainnet" },
  { network: "mainnet", address: "0xd63070114470f685b75B74D60EEc7c1113d33a3D", url: "https://app.morpho.org/vault?vault=0xd63070114470f685b75B74D60EEc7c1113d33a3D&network=mainnet" },
  // Ethereum — Main Street Yield
  { network: "mainnet", address: "0x890A5122Aa1dA30fEC4286DE7904Ff808F0bd74A", url: "https://mainstreet.finance/", nameOverride: "Main Street Yield" },
  // Base — Moonwell
  { network: "base", address: "0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca", url: "https://moonwell.fi/vaults/flagship-usdc" },
  { network: "base", address: "0x23479229e52Ab6aaD312D0B03DF9F33B46753B5e", url: "https://moonwell.fi/vaults/flagship-usdt" },
];

/** Lookup curated metadata by lowercase address */
const CURATED_BY_ADDRESS = new Map<string, CuratedVault>(
  CURATED_VAULTS.map((v) => [v.address.toLowerCase(), v])
);

/** Check if a vault address is in the curated list (trusted as 4626) */
export function isCurated(address: string): boolean {
  return CURATED_BY_ADDRESS.has(address.toLowerCase());
}

/**
 * Verify a contract implements core ERC-4626 methods on-chain.
 * Calls asset() and convertToAssets(1) — if either reverts, it's not 4626.
 */
export async function isErc4626Compliant(
  chainId: number,
  address: `0x${string}`
): Promise<boolean> {
  const chain = CHAIN_BY_ID[chainId];
  if (!chain) return false;

  const client = createPublicClient({ chain, transport: http() });
  try {
    await Promise.all([
      client.readContract({
        address,
        abi: erc4626Abi,
        functionName: "asset",
      }),
      client.readContract({
        address,
        abi: erc4626Abi,
        functionName: "convertToAssets",
        args: [BigInt(1)],
      }),
    ]);
    return true;
  } catch {
    return false;
  }
}

function transformVault(v: VaultsFyiVault): VaultConfig {
  const apy7d = v.apy?.["7day"]?.total ?? v.apy?.["1day"]?.total ?? 0;

  return {
    address: v.address as `0x${string}`,
    name: v.name,
    symbol: v.symbol ?? v.name,
    protocol: v.protocol.name,
    chainId: v.network.chainId,
    chainName: NETWORK_DISPLAY_NAMES[v.network.name] ?? v.network.name,
    network: v.network.name,
    underlyingToken: {
      address: v.asset.address as `0x${string}`,
      symbol: v.asset.symbol,
      decimals: v.asset.decimals ?? 6,
    },
    apy: apy7d,
    tvlUsd: parseFloat(v.tvl.usd) || 0,
  };
}

/** Merge curated metadata (url, name override) into a VaultConfig */
function applyCuratedMetadata(vault: VaultConfig): VaultConfig {
  const curated = CURATED_BY_ADDRESS.get(vault.address.toLowerCase());
  if (!curated) return vault;
  return {
    ...vault,
    name: curated.nameOverride ?? vault.name,
    url: curated.url,
  };
}

/**
 * Load the curated vault list. Each vault is fetched via API/RPC in parallel.
 * Failed lookups are silently skipped. Results sorted by APY descending.
 */
export async function fetchVaults(): Promise<VaultConfig[]> {
  const results = await Promise.allSettled(
    CURATED_VAULTS.map((v) => fetchVault(v.network, v.address))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<VaultConfig> => r.status === "fulfilled")
    .map((r) => r.value)
    .sort((a, b) => b.apy - a.apy);
}

/**
 * Fetch a single vault. Tries vaults.fyi API first, then falls back to
 * on-chain RPC reads to verify it's a valid ERC-4626 vault.
 */
export async function fetchVault(
  network: string,
  address: string
): Promise<VaultConfig> {
  let vault: VaultConfig;
  // Try vaults.fyi API first
  try {
    vault = await fetchVaultFromApi(network, address);
  } catch {
    // Not on vaults.fyi — try reading the contract directly
    vault = await fetchVaultFromRpc(network, address);
  }
  return applyCuratedMetadata(vault);
}

async function fetchVaultFromApi(
  network: string,
  address: string
): Promise<VaultConfig> {
  const apiKey = process.env.VAULTS_FYI_API_KEY;

  if (!apiKey) {
    throw new Error("VAULTS_FYI_API_KEY environment variable is not set");
  }

  const res = await fetch(
    `https://api.vaults.fyi/v2/detailed-vaults/${network}/${address}`,
    {
      headers: {
        "x-api-key": apiKey,
        Accept: "application/json",
      },
      next: { revalidate: 300 },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`vaults.fyi API error (${res.status}): ${text}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json: any = await res.json();
  const vault: VaultsFyiVault = json.data ?? json;
  return transformVault(vault);
}

async function fetchVaultFromRpc(
  network: string,
  address: string
): Promise<VaultConfig> {
  const chain = CHAINS[network];
  if (!chain) {
    throw new Error(`Unsupported network: ${network}`);
  }

  const client = createPublicClient({ chain, transport: http() });
  const vaultAddr = address as `0x${string}`;

  // Read ERC-4626 vault fields — asset() is the defining 4626 method
  let vaultName: string;
  let vaultSymbol: string;
  let assetAddress: `0x${string}`;
  try {
    [vaultName, vaultSymbol, assetAddress] = await Promise.all([
      client.readContract({ address: vaultAddr, abi: erc4626Abi, functionName: "name" }),
      client.readContract({ address: vaultAddr, abi: erc4626Abi, functionName: "symbol" }),
      client.readContract({ address: vaultAddr, abi: erc4626Abi, functionName: "asset" }),
    ]);
  } catch {
    throw new Error(
      "Contract does not implement ERC-4626 (asset() call failed)"
    );
  }

  // Read underlying token info
  const [tokenSymbol, tokenDecimals] = await Promise.all([
    client.readContract({ address: assetAddress, abi: erc20Abi, functionName: "symbol" }),
    client.readContract({ address: assetAddress, abi: erc20Abi, functionName: "decimals" }),
  ]);

  return {
    address: vaultAddr,
    name: vaultName,
    symbol: vaultSymbol,
    protocol: "Unknown",
    chainId: chain.id,
    chainName: NETWORK_DISPLAY_NAMES[network] ?? network,
    network,
    underlyingToken: {
      address: assetAddress,
      symbol: tokenSymbol,
      decimals: tokenDecimals,
    },
    apy: 0,
    tvlUsd: 0,
  };
}
