# Otim SDK Server-Side Example

This example demonstrates how to use the Otim SDK in a server-side environment to create and manage settlement orchestrations.

## Overview

This example shows how to:

- Initialize the Otim server client with API credentials
- Prepare a settlement orchestration with specific parameters
- Create a settlement orchestration using the orchestration client
- Handle the response with request ID and ephemeral wallet address

## Prerequisites

Before running this example, you need:

1. An Otim organization account
2. API credentials (API key, public key, private key, organization ID)
3. A recipient wallet address for testing

## Setup

1. Copy the `.env.example` file to `.env`:

```bash
cp env.example .env
```

2. Fill in your credentials in the `.env` file:

```env
OTIM_API_KEY=your-api-key-here
OTIM_PUBLIC_KEY=your-public-key-here
OTIM_PRIVATE_KEY=0x...
OTIM_ORGANIZATION_ID=your-organization-id-here
OTIM_RECIPIENT_ADDRESS=0x...
```

## Environment Variables

| Variable                 | Required | Description                                          |
| ------------------------ | -------- | ---------------------------------------------------- |
| `OTIM_API_KEY`           | Yes      | Your Otim API key for authentication                 |
| `OTIM_PUBLIC_KEY`        | Yes      | Your organization's public key                       |
| `OTIM_PRIVATE_KEY`       | Yes      | Your organization's private key (must start with 0x) |
| `OTIM_ORGANIZATION_ID`   | Yes      | Your Otim organization ID                            |
| `OTIM_RECIPIENT_ADDRESS` | Yes      | The wallet address that will receive the settlement  |

## Running the Example

Install dependencies and run the example:

```bash
pnpm install
pnpm start
```

## How It Works

### 1. Client Initialization

The example creates a server client with your API credentials:

```typescript
const client = createOtimServerClient({
  appId,
  privateKey,
  publicKey,
  apiKey,
  environment: "sandbox",
  chains: [chains.base],
});
```

### 2. Account Initialization

Before making any API calls, initialize the account:

```typescript
await client.init();
```

This sets up the signing infrastructure needed for secure operations.

### 3. Prepare Settlement Orchestration

Use the helper function to prepare a settlement orchestration:

```typescript
const settlement = prepareSettlement({
  amount: 10,
  chainId: chains.base.id,
  token: "USDC",
  recipient: recipientAddress,
  note: "Settlement orchestration from Otim SDK example",
});
```

### 4. Create Settlement Orchestration

Submit the prepared settlement to create it:

```typescript
const result = await client.orchestration.create(settlement);
```

The response includes:

- `requestId`: Unique identifier for the orchestration
- `ephemeralWalletAddress`: Temporary wallet address for this settlement

## Key Concepts

### Server Client

The `OtimServerClient` is designed for backend applications and supports:

- API key authentication
- Private key signing
- Access to all Otim services (orchestration, activity, config, delegation, auth)

### Settlement Orchestrations

Settlement orchestrations are prepared with:

- **Amount**: USD amount (automatically converted to token amounts)
- **Chain**: Target blockchain (e.g., Base, Ethereum)
- **Token**: Token to use (USDC, USDT)
- **Recipient**: Wallet address to receive settlement
- **Note**: Optional description
- **maxRuns**: Optional limit on how many times the orchestration can be executed (useful for preventing repeated settlements)

### Orchestration Client

The orchestration client handles the complete lifecycle of orchestrations:

- Building orchestrations with proper token configurations
- Signing authorizations
- Activating orchestrations on-chain

## Next Steps

After creating a settlement orchestration, you can:

1. **Get orchestration details**:

```typescript
const details = await client.orchestration.getDetails({ requestId });
```

2. **List all orchestrations**:

```typescript
const requests = await client.orchestration.list({
  page: 1,
  pageSize: 10,
});
```

3. **Track orchestration activity**:

```typescript
const activity = await client.activity.getActivities({
  requestId,
});
```

## Error Handling

The example includes comprehensive error handling:

- Environment variable validation
- SDK initialization errors
- API call failures

All errors are caught and displayed with helpful messages.

## Additional Resources

- [Otim Documentation](https://docs.otim.xyz)
- [SDK API Reference](https://github.com/otim/otim-ts-sdk)
- [Support](https://otim.xyz/support)
