import { chains, createOtimServerClient, prepareSettlement } from '@otim/sdk-server';
import dotenv from 'dotenv';

dotenv.config();

// Token addresses on Base
const BASE_WETH = '0x4200000000000000000000000000000000000006';
const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

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

/**
 * Create a settlement that accepts WETH on Base and outputs USDC to a recipient.
 * This is useful for off-ramping via services like Bridge.xyz where you need to
 * send USDC to a liquidation address.
 */
async function create() {
  const client = await initializeClient();

  const amount = BigInt(process.env.AMOUNT || '1000000'); // Default 1 USDC (6 decimals)
  const recipient = process.env.RECIPIENT_ADDRESS! as `0x${string}`;

  console.log(`Creating settlement for ${amount} USDC to ${recipient}`);
  console.log(`Accepting WETH on Base as input`);

  const settlement = prepareSettlement({
    amount,
    chainId: chains.base.id,
    token: BASE_USDC,
    recipient,
    acceptedTokens: {
      [chains.base.id]: [
        BASE_WETH, // WETH on Base
      ],
    },
    note: "WETH to USDC settlement on Base for off-ramp",
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
else {
  console.log('Usage:');
  console.log('  pnpm dev:create              - Create a new settlement');
  console.log('  pnpm dev:getDetails <id>     - Get details of a settlement');
  console.log('  pnpm dev:list                - List all settlements');
}
