import {
  chains,
  createOtimServerClient,
  prepareVaultWithdrawSettlement,
} from "@otim/sdk-server";
import dotenv from "dotenv";

dotenv.config();

// Token addresses on Base
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`;
const USDT_BASE = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2" as `0x${string}`;

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

  // Prepare a vault withdraw settlement
  // This will withdraw funds from a vault and settle them to the recipient
  const payload = prepareVaultWithdrawSettlement({
    // Vault configuration
    vaultAddress,
    vaultUnderlyingToken: USDC_BASE,
    vaultChainId: chains.base.id,

    // Settlement configuration (settle to USDT)
    settlementChainId: chains.base.id,
    settlementToken: USDT_BASE,
    recipientAddress,

    // Withdraw amount: 1 unit of the vault token
    withdrawAmount: BigInt(1),

    // Optional parameters
    note: "Vault withdraw settlement from Otim SDK example",
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
