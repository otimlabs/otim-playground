import {
  type Chain,
  chains,
  createOtimServerClient,
} from "@otim/sdk-server";
import dotenv from "dotenv";

import { buildRawOrchestrationPayload } from "./config";

dotenv.config();

async function createRawOrchestrationExample() {
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

  console.log("Creating raw orchestration...\n");


  // Build the full orchestration payload
  const payload = buildRawOrchestrationPayload(recipientAddress, true);

  console.log("Orchestration payload:", JSON.stringify(payload, null, 2));

  const result = await client.orchestration.createRaw(payload, {
    settlementChainId: chains.polygon.id,
    activate: true,
  });

  console.log("\n✓ Raw orchestration created successfully!\n");
  console.log("Request ID:", result.requestId);
  console.log("Ephemeral Wallet Address:", result.ephemeralWalletAddress);
}

function handleError(error: unknown): void {
  console.error("\n=== Error Details ===");
  console.error("Full error:", JSON.stringify(error, Object.getOwnPropertyNames(error as object), 2));

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

createRawOrchestrationExample().catch(handleError);
