import {
  chains,
  createOtimServerClient,
  prepareVaultDepositSettlement,
} from "@otim/sdk-server";
import dotenv from "dotenv";

dotenv.config();

// USDC token address on Base
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`;

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
  const vaultAddress = process.env.VAULT_ADDRESS as `0x${string}`;

  if (!recipientAddress) {
    throw new Error(
      "Missing required environment variable: RECIPIENT_ADDRESS",
    );
  }

  if (!vaultAddress) {
    throw new Error("Missing required environment variable: VAULT_ADDRESS");
  }

  // Prepare a vault deposit settlement
  // This will collect funds and deposit them into a vault
  const payload = prepareVaultDepositSettlement({
    // Accepted tokens for payment
    acceptedTokens: {
      [chains.base.id]: [USDC_BASE],
    },

    // Vault configuration
    vaultChainId: chains.base.id,
    vaultAddress,
    vaultUnderlyingToken: USDC_BASE,

    // Deposit amount: 1 USDC (6 decimals)
    depositAmount: BigInt(1_000_000),

    // Recipient address for the vault shares
    recipientAddress,

    // Minimum total shares required (set to 0 to accept any amount)
    vaultMinTotalShares: BigInt(10),

    // Optional parameters
    note: "Vault deposit settlement from Otim SDK example",
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
