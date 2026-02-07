export interface VaultConfig {
  address: `0x${string}`;
  name: string;
  symbol: string;
  protocol: string;
  chainId: number;
  chainName: string;
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

interface VaultsFyiResponse {
  data: VaultsFyiVault[];
  itemsOnPage: number;
  nextPage?: number;
}

const NETWORK_DISPLAY_NAMES: Record<string, string> = {
  mainnet: "Ethereum",
  base: "Base",
  arbitrum: "Arbitrum",
  optimism: "Optimism",
  polygon: "Polygon",
};

function transformVault(v: VaultsFyiVault): VaultConfig {
  const apy7d = v.apy["7day"]?.total ?? v.apy["1day"]?.total ?? 0;

  return {
    address: v.address as `0x${string}`,
    name: v.name,
    symbol: v.symbol ?? v.name,
    protocol: v.protocol.name,
    chainId: v.network.chainId,
    chainName: NETWORK_DISPLAY_NAMES[v.network.name] ?? v.network.name,
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

  const params = new URLSearchParams({
    allowedNetworks: "base,mainnet",
    allowedAssets: "USDC,USDT",
    sortBy: "tvl",
    sortOrder: "desc",
    perPage: "10",
    minTvl: "10000000",
  });

  const res = await fetch(
    `https://api.vaults.fyi/v2/detailed-vaults?${params.toString()}`,
    {
      headers: {
        "x-api-key": apiKey,
        Accept: "application/json",
      },
      next: { revalidate: 300 }, // cache for 5 minutes
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`vaults.fyi API error (${res.status}): ${text}`);
  }

  const json: VaultsFyiResponse = await res.json();
  return json.data.map(transformVault);
}
