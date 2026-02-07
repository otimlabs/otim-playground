import {
  createOtimServerClient,
  prepareVaultDepositSettlement,
  prepareVaultWithdrawSettlement,
  prepareVaultMigrateSettlement,
} from "@otim/sdk-server";
import type {
  PrepareVaultDepositSettlementParams,
} from "@otim/sdk-server";

type SupportedChainId =
  PrepareVaultDepositSettlementParams["vaultChainId"];

// Stablecoins per chain — used to populate acceptedTokens so the SDK
// can route through the vault's chain even when paying from a different chain.
const STABLECOINS_BY_CHAIN: Record<number, `0x${string}`[]> = {
  [1]: [
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
    "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT
  ],
  [8453]: [
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
    "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2", // USDT
  ],
};

async function getClient() {
  const client = createOtimServerClient({
    appId: process.env.OTIM_APP_ID!,
    privateKey: process.env.OTIM_PRIVATE_KEY! as `0x${string}`,
    publicKey: process.env.OTIM_PUBLIC_KEY!,
    apiKey: process.env.OTIM_API_KEY,
    environment: "production",
  });
  await client.init();
  return client;
}

export async function deposit(params: {
  vaultAddress: `0x${string}`;
  vaultChainId: number;
  vaultUnderlyingToken: `0x${string}`;
  recipientAddress: `0x${string}`;
  paymentChainId: number;
  paymentToken: `0x${string}`;
}) {
  const client = await getClient();

  // Build acceptedTokens: must include the payment chain AND the vault chain
  const acceptedTokens: Record<number, `0x${string}`[]> = {
    [params.paymentChainId]: [params.paymentToken],
  };
  // SDK requires the vault's chain in acceptedTokens for routing
  if (params.vaultChainId !== params.paymentChainId) {
    acceptedTokens[params.vaultChainId] =
      STABLECOINS_BY_CHAIN[params.vaultChainId] ?? [params.vaultUnderlyingToken];
  } else {
    // Same chain — merge stablecoins with the selected payment token
    const chainStables = STABLECOINS_BY_CHAIN[params.vaultChainId] ?? [];
    const merged = [...new Set([params.paymentToken, ...chainStables])];
    acceptedTokens[params.vaultChainId] = merged;
  }

  const payload = prepareVaultDepositSettlement({
    acceptedTokens,
    vaultChainId: params.vaultChainId as SupportedChainId,
    vaultAddress: params.vaultAddress,
    vaultUnderlyingToken: params.vaultUnderlyingToken,
    depositAmount: BigInt(1),
    recipientAddress: params.recipientAddress,
    vaultMinTotalShares: BigInt(1),
    note: "Deposit into vault via OTIM Playground",
    maxRuns: 1,
  });

  return client.orchestration.create(payload);
}

export async function withdraw(params: {
  vaultAddress: `0x${string}`;
  vaultChainId: number;
  vaultUnderlyingToken: `0x${string}`;
  recipientAddress: `0x${string}`;
  settlementToken: `0x${string}`;
  settlementChainId: number;
}) {
  const client = await getClient();

  const payload = prepareVaultWithdrawSettlement({
    vaultAddress: params.vaultAddress,
    vaultUnderlyingToken: params.vaultUnderlyingToken,
    vaultChainId: params.vaultChainId as SupportedChainId,
    settlementChainId: params.settlementChainId as SupportedChainId,
    settlementToken: params.settlementToken,
    recipientAddress: params.recipientAddress,
    withdrawAmount: BigInt(1),
    note: "Withdraw from vault via OTIM Playground",
    maxRuns: 1,
  });

  return client.orchestration.create(payload);
}

export async function migrate(params: {
  sourceVaultAddress: `0x${string}`;
  sourceVaultChainId: number;
  sourceVaultUnderlyingToken: `0x${string}`;
  destVaultAddress: `0x${string}`;
  destVaultChainId: number;
  destVaultUnderlyingToken: `0x${string}`;
  recipientAddress: `0x${string}`;
}) {
  const client = await getClient();

  const payload = prepareVaultMigrateSettlement({
    sourceVaultAddress: params.sourceVaultAddress,
    sourceVaultUnderlyingToken: params.sourceVaultUnderlyingToken,
    sourceVaultChainId: params.sourceVaultChainId as SupportedChainId,
    withdrawAmount: BigInt(1),
    destVaultAddress: params.destVaultAddress,
    destVaultUnderlyingToken: params.destVaultUnderlyingToken,
    destVaultChainId: params.destVaultChainId as SupportedChainId,
    destVaultMinTotalShares: BigInt(1),
    recipientAddress: params.recipientAddress,
    note: "Migrate between vaults via OTIM Playground",
    maxRuns: 1,
  });

  return client.orchestration.create(payload);
}
