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
    amount: 1,
    chainId: chains.base.id,
    token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // usdc on base
    recipient: process.env.RECIPIENT_ADDRESS! as `0x${string}`,
    acceptedTokens: {
      [chains.mainnet.id]: [
        '0x0000000000000000000000000000000000000000', // native eth
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // usdc on ethereum
        '0xdAC17F958D2ee523a2206206994597C13D831ec7' // usdt on ethereum
      ],
      [chains.base.id]: [
        '0x0000000000000000000000000000000000000000', // native eth
        '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // usdc on base
        '0xfde4c96c8593536e31f229ea8f37b2ada2699bb2' // usdt on base
      ],
      [chains.arbitrum.id]: [
        '0x0000000000000000000000000000000000000000', // native eth
        '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // usdc on arbitrum
        '0xfd086BC7CD5C481DCC9C85EBe478A1C0b69FCBb9' // usdt on arbitrum
      ],
      [chains.optimism.id]: [
        '0x0000000000000000000000000000000000000000', // native eth
        '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // usdc on optimism
        '0x94b008aA00579c1307B0EF2C499aD98A8ce58e58' // usdt on optimism
      ],
      [chains.polygon.id]: [
        '0x0000000000000000000000000000000000000000', // native eth
        '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // usdc on polygon
        '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' // usdt on polygon
      ]
    },
    note: "Settlement orchestration from Otim SDK example",
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
