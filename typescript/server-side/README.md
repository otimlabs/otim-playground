# TypeScript Server-Side Examples

A collection of TypeScript server-side examples using the Otim SDK.

**SDK Version:** [`@otim/sdk-server`](https://www.npmjs.com/package/@otim/sdk-server) 0.0.14

## Examples

### basic-settlement

Create, retrieve, and list settlement orchestrations. This example creates a settlement on Base that accepts native ETH, USDC, and USDT from multiple chains (Ethereum, Base, Arbitrum, Optimism, and Polygon), settling to USDC on Base.

**Commands:**
- `pnpm dev:create` - Create a new settlement orchestration
- `pnpm dev:getDetails <request_id>` - Get details for a specific orchestration
- `pnpm dev:list` - List all orchestrations

### settle-polygon-usdce-to-usdc

Create a settlement on Polygon accepting both USDC and USDC.e tokens, settling to USDC.

**Commands:**
- `pnpm dev:create` - Create a new settlement orchestration
- `pnpm dev:getDetails <request_id>` - Get details for a specific orchestration

### settle-to-usdce

Create a settlement orchestration that settles to USDC.e on Polygon, accepting tokens from multiple chains (Base and Polygon).

**Commands:**
- `pnpm dev:create` - Create a new settlement orchestration
- `pnpm dev:getDetails <request_id>` - Get details for a specific orchestration

### settle-usdc-into-vault

Create a vault deposit settlement orchestration that collects USDC on Base and deposits it into an ERC-4626 vault.

**Commands:**
- `pnpm dev:create` - Create a new vault deposit settlement orchestration
- `pnpm dev:getDetails <request_id>` - Get details for a specific orchestration
