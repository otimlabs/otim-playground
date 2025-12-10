import { chains, createOtimServerClient, prepareSettlement } from '@otim/sdk-server';
import dotenv from 'dotenv';

dotenv.config();

async function initializeClient() {
  const client = createOtimServerClient({
    appId: process.env.OTIM_APP_ID!,
    privateKey: process.env.OTIM_PRIVATE_KEY! as `0x${string}`,
    publicKey: process.env.OTIM_PUBLIC_KEY!,
    apiKey: process.env.OTIM_API_KEY,
    environment: process.env.OTIM_ENVIRONMENT as 'sandbox' | 'production',
    chains: [chains.polygon] as any
  });

  await client.init();
  return client;
}

async function create() {
  const client = await initializeClient();
  const settlement = prepareSettlement({
    amount: 1,
    chainId: chains.polygon.id,
    token: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // usdc on polygon
    recipient: process.env.RECIPIENT_ADDRESS! as `0x${string}`,
    acceptedTokens: {
      [chains.polygon.id]: [
        '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', 
        '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' // usdc.e on polygon
      ]
    },
    note: "Settlement from USDC.e to USDC on Polygon from Otim SDK example",
    maxRuns: 1
  });
  const result = await client.orchestration.create(settlement);
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
