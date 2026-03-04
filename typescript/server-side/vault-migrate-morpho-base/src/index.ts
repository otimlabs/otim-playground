import {
  chains,
  createOtimServerClient,
  prepareVaultMigrateSettlement,
} from "@otim/sdk-server";
import type { PrepareVaultDepositSettlementParams } from "@otim/sdk-server";
import dotenv from "dotenv";

dotenv.config();

type SupportedChainId =
  PrepareVaultDepositSettlementParams["vaultChainId"];

// USDC token address on Base
const USDC_BASE =
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`;

// Morpho vaults on Base
const SOURCE_VAULT =
  "0xbeeF010f9cb27031ad51e3333f9aF9C6B1228183" as `0x${string}`; // Steakhouse Prime USDC
const DEST_VAULT =
  "0xeE8F4eC5672F09119b96Ab6fB59C27E1b7e44b61" as `0x${string}`; // Gauntlet USDC Prime

async function initializeClient() {
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

async function create() {
  const client = await initializeClient();
  const recipientAddress = process.env.RECIPIENT_ADDRESS as `0x${string}`;

  if (!recipientAddress) {
    throw new Error(
      "Missing required environment variable: RECIPIENT_ADDRESS",
    );
  }

  // Prepare a vault migrate settlement
  // This will withdraw from the source Morpho vault and deposit into the destination Morpho vault
  // The auto-build route handles any token conversions needed between vaults
  const payload = prepareVaultMigrateSettlement({
    // Source vault (Steakhouse Prime USDC on Base)
    sourceVaultAddress: SOURCE_VAULT,
    sourceVaultChainId: chains.base.id as SupportedChainId,
    sourceVaultUnderlyingToken: USDC_BASE,

    // Amount of vault shares to withdraw
    withdrawAmount: BigInt(1),

    // Destination vault (Gauntlet USDC Prime on Base)
    destVaultAddress: DEST_VAULT,
    destVaultChainId: chains.base.id as SupportedChainId,
    destVaultUnderlyingToken: USDC_BASE,

    // Recipient address for the destination vault shares
    recipientAddress,

    // Optional parameters
    note: "Migrate Morpho vaults on Base: Steakhouse Prime USDC → Gauntlet USDC Prime",
    maxRuns: 1,
  });

  const result = await client.orchestration.create(payload);

  console.log(JSON.stringify(result, null, 2));
}

async function getDetails(requestId: string) {
  const client = await initializeClient();
  const details = await client.orchestration.getDetails({ requestId });
  console.log(JSON.stringify(details, null, 2));
}

const command = process.argv[2];
if (command === "create") await create();
else if (command === "getDetails") await getDetails(process.argv[3]);
