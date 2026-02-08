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

  // acceptedTokens: the user's payment token + the vault's underlying token on its chain
  const acceptedTokens: Record<number, `0x${string}`[]> = {};

  if (params.paymentChainId === params.vaultChainId) {
    // Same chain — deduplicate if payment token IS the underlying token
    const tokens = [...new Set([params.paymentToken, params.vaultUnderlyingToken])];
    acceptedTokens[params.vaultChainId] = tokens;
  } else {
    // Cross-chain — payment token on its chain, underlying token on vault chain
    acceptedTokens[params.paymentChainId] = [params.paymentToken];
    acceptedTokens[params.vaultChainId] = [params.vaultUnderlyingToken];
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
