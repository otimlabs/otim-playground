import {
  chains,
  createOtimServerClient,
  prepareVaultDepositSettlement,
} from "@otim/sdk-server";
import dotenv from "dotenv";

dotenv.config();

// USDC token address on Ethereum mainnet
const USDC_MAINNET =
  "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as `0x${string}`;

// MSY vault address on Ethereum mainnet
const MSY_VAULT =
  "0x890A5122Aa1dA30fEC4286DE7904Ff808F0bd74A" as `0x${string}`;

// msUSD token address on Ethereum mainnet (underlying token for MSY vault)
const MSUSD_MAINNET =
  "0x4ba01f22827018b4772CD326C7627FB4956A7C00" as `0x${string}`;

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

  // Prepare a vault deposit settlement
  // This will accept USDC on Ethereum mainnet, auto-build the route to msUSD,
  // and deposit into the MSY vault
  const payload = prepareVaultDepositSettlement({
    // Accepted tokens for payment: USDC on Ethereum mainnet
    acceptedTokens: {
      [chains.mainnet.id]: [USDC_MAINNET],
    },

    // Vault configuration
    vaultChainId: chains.mainnet.id,
    vaultAddress: MSY_VAULT,
    vaultUnderlyingToken: MSUSD_MAINNET,

    // Deposit amount: 1 msUSD (18 decimals)
    depositAmount: BigInt("1000000000000000000"),

    // Recipient address for the vault shares
    recipientAddress,

    // Minimum total shares required (set to 0 to accept any amount)
    vaultMinTotalShares: BigInt(0),

    // Optional parameters
    note: "Settle USDC into MSY vault (msUSD) on Ethereum mainnet",
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
