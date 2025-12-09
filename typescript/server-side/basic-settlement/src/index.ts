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
    chains: [chains.base] as any
  });

  await client.init();
  return client;
}

async function create() {
  const client = await initializeClient();
  const settlement = prepareSettlement({
    amount: 10,
    chainId: chains.base.id,
    token: "USDC",
    recipient: process.env.RECIPIENT_ADDRESS! as `0x${string}`,
    note: "Settlement orchestration from Otim SDK example",
    maxRuns: 1,
  });
  const result = await client.orchestration.create(settlement);
  console.log(JSON.stringify(result, null, 2));
}

async function getDetails(requestId: string) {
  const client = await initializeClient();
  const details = await client.orchestration.getDetails({ requestId });
  console.log(JSON.stringify(details, null, 2));
}

async function list() {
  const client = await initializeClient();
  const requests = await client.orchestration.list({
    direction: 'from',
    statuses: ['pending', 'inProgress', 'paid'],
    perPage: 10,
    page: 0
  });
  console.log(JSON.stringify(requests, null, 2));
}

const command = process.argv[2];
if (command === 'create') await create();
else if (command === 'getDetails') await getDetails(process.argv[3]);
else if (command === 'list') await list();
