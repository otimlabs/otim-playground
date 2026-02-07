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

/**
 * Verify a contract implements core ERC-4626 methods on-chain.
 * Calls asset() and convertToAssets(0) — if either reverts, it's not 4626.
 */
async function isErc4626Compliant(
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

export async function fetchVaults(): Promise<VaultConfig[]> {
  const apiKey = process.env.VAULTS_FYI_API_KEY;

  if (!apiKey) {
    throw new Error("VAULTS_FYI_API_KEY environment variable is not set");
  }

  const url = new URL("https://api.vaults.fyi/v2/detailed-vaults");
  url.searchParams.set("sortBy", "tvl");
  url.searchParams.set("sortOrder", "desc");
  url.searchParams.set("perPage", "20");
  url.searchParams.set("minTvl", "10000000");
  // Pass array params individually
  url.searchParams.append("allowedNetworks", "base");
  url.searchParams.append("allowedNetworks", "mainnet");
  url.searchParams.append("allowedAssets", "USDC");
  url.searchParams.append("allowedAssets", "USDT");
  // Only show ERC-4626 compatible vaults
  url.searchParams.set("onlyTransactional", "true");

  const res = await fetch(url.toString(), {
    headers: {
      "x-api-key": apiKey,
      Accept: "application/json",
    },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`vaults.fyi API error (${res.status}): ${text}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json: any = await res.json();

  // Handle possible response shapes: { data: [...] } or direct array
  const items: VaultsFyiVault[] = json.data ?? json.items ?? json;

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(
      `No vaults returned from vaults.fyi. Response keys: ${JSON.stringify(Object.keys(json))}`
    );
  }

  const vaults = items.map(transformVault);

  // Verify ERC-4626 compliance on-chain (asset() + convertToAssets())
  const checks = await Promise.all(
    vaults.map((v) => isErc4626Compliant(v.chainId, v.address))
  );

  return vaults.filter((_, i) => checks[i]);
}

/**
 * Fetch a single vault. Tries vaults.fyi API first, then falls back to
 * on-chain RPC reads to verify it's a valid ERC-4626 vault.
 */
export async function fetchVault(
  network: string,
  address: string
): Promise<VaultConfig> {
  // Try vaults.fyi API first
  try {
    return await fetchVaultFromApi(network, address);
  } catch {
    // Not on vaults.fyi — try reading the contract directly
    return await fetchVaultFromRpc(network, address);
  }
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
