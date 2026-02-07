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
  url.searchParams.set("perPage", "10");
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

  return items.map(transformVault);
}

export async function fetchVault(
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
