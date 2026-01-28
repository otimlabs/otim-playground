import {
  type Chain,
  chains,
  createOtimServerClient,
  prepareSettlement,
} from "@otim/sdk-server";
import dotenv from "dotenv";

dotenv.config();

async function initializeClient() {
  const client = createOtimServerClient({
    appId: process.env.OTIM_APP_ID!,
    privateKey: process.env.OTIM_PRIVATE_KEY! as `0x${string}`,
    publicKey: process.env.OTIM_PUBLIC_KEY!,
    apiKey: process.env.OTIM_API_KEY,
    environment: (process.env.OTIM_ENVIRONMENT as 'sandbox' | 'production') || 'production',
    chains: [chains.base as Chain, chains.polygon as Chain],
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

  const result = await client.orchestration.create({
    ...payload,
    metadata: {
      ...payload.metadata,
      type: "PaymentRequest",
      source: "Manual",
    },
  });

  console.log(JSON.stringify(result, null, 2));
}

async function getDetails(requestId: string) {
  const client = await initializeClient();
  const details = await client.orchestration.getDetails({ requestId });
  console.log(JSON.stringify(details, null, 2));
}

const command = process.argv[2];
if (command === 'create') await create();
else if (command === 'getDetails') await getDetails(process.argv[3]);
