import {
  type Chain,
  chains,
  createOtimServerClient,
  prepareSettlement,
} from "@otim/sdk-server";
import dotenv from "dotenv";

dotenv.config();

async function createOrchestrationExample() {
  const apiKey = process.env.OTIM_API_KEY;
  const publicKey = process.env.OTIM_PUBLIC_KEY;
  const privateKey = process.env.OTIM_PRIVATE_KEY as `0x${string}`;
  const appId = process.env.OTIM_ORGANIZATION_ID;
  const recipientAddress = process.env.OTIM_RECIPIENT_ADDRESS as `0x${string}`;

  if (!apiKey || !publicKey || !privateKey || !appId) {
    throw new Error(
      "Missing required environment variables: OTIM_API_KEY, OTIM_PUBLIC_KEY, OTIM_PRIVATE_KEY, or OTIM_ORGANIZATION_ID",
    );
  }

  if (!recipientAddress) {
    throw new Error(
      "Missing required environment variable: OTIM_RECIPIENT_ADDRESS",
    );
  }

  const client = createOtimServerClient({
    appId,
    privateKey,
    publicKey,
    apiKey,
    environment: "production",
    chains: [chains.base as Chain, chains.polygon as Chain],
  });

  await client.init();

  console.log("Creating orchestration...\n");

  const payload = prepareSettlement({
    chainId: chains.polygon.id,
    token: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    recipient: recipientAddress,
    acceptedTokens: {
      [chains.base.id]: [
        "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
      ],
      [chains.polygon.id]: [
        "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
        "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
        "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      ],
    },
    amount: 10,
  });

  console.log("Orchestration payload:", JSON.stringify(payload, null, 2));

  const result = await client.orchestration.create({
    ...payload,
    metadata: {
      ...payload.metadata,
      type: "PaymentRequest",
      source: "Manual",
    },
  });

  console.log("\n✓ Orchestration created successfully!\n");
  console.log("Request ID:", result.requestId);
  console.log("Ephemeral Wallet Address:", result.ephemeralWalletAddress);
}

function handleError(error: unknown): void {
  console.error("\n=== Error Details ===");
  console.error(
    "Full error:",
    JSON.stringify(error, Object.getOwnPropertyNames(error as object), 2),
  );

  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    if ('response' in err) console.error("Response:", err.response);
    if ('cause' in err) console.error("Cause:", err.cause);
    if ('data' in err) console.error("Data:", err.data);
    if ('status' in err) console.error("Status:", err.status);
    if ('body' in err) console.error("Body:", err.body);
  }

  const message = error instanceof Error ? error.message : String(error);
  console.error("Error message:", message);
  process.exit(1);
}

createOrchestrationExample().catch(handleError);
