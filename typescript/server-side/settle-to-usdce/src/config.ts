/**
 * Raw Orchestration Example
 *
 * Example orchestration payload for cross-chain USDC bridging with token swaps.
 *
 * Flow:
 * - Non-completion (Base): CCTP bridge USDC to Polygon, Swap USDT→USDC
 * - Completion (Polygon): Swap USDC→USDC.e, Swap USDT→USDC.e, Transfer USDC.e
 */


import { Address, pad } from "viem";
import { createPaymentRequestBuildPayload } from "./build";

// =============================================================================
// Constants
// =============================================================================

/** Chain IDs */
const CHAIN_ID = {
  BASE: 8453,
  POLYGON: 137,
} as const;

/**
 * CCTP Domain IDs
 * @see https://developers.circle.com/stablecoins/docs/supported-domains
 */
const CCTP_DOMAIN = {
  POLYGON: 7,
} as const;

/** Token addresses - Base (8453) */
const BASE_TOKENS = {
  USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address,
  USDT: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2" as Address,
} as const;

/** Token addresses - Polygon (137) */
const POLYGON_TOKENS = {
  USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" as Address,
  USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F" as Address,
  USDC_E: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" as Address,
} as const;

/** Uniswap V3 fee tiers */
const FEE_TIER = {
  /** 0.01% - Best for stable pairs */
  LOWEST: "100",
  /** 0.05% - Good for stable pairs */
  LOW: "500",
  /** 0.3% - Standard */
  MEDIUM: "3000",
} as const;

// =============================================================================
// Types
// =============================================================================

interface FeeConfig {
  token: Address;
  maxBaseFeePerGas: `0x${string}`;
  maxPriorityFeePerGas: `0x${string}`;
  executionFee: `0x${string}`;
}

interface EphemeralInstruction {
  chainId: number;
  maxExecutions: number;
  setEphemeralTarget: boolean;
  actionArguments: Record<string, unknown>;
}

// =============================================================================
// Fee Configuration
// =============================================================================

function createDefaultFee(): FeeConfig {
  return {
    token: "0x0000000000000000000000000000000000000000",
    maxBaseFeePerGas: "0x0",
    maxPriorityFeePerGas: "0x0",
    executionFee: "0x0",
  };
}

// =============================================================================
// Action Argument Builders
// =============================================================================

/**
 * Creates SweepCCTP action arguments for cross-chain USDC bridging.
 */
function createSweepCCTPArguments(params: {
  token: Address;
  destinationDomain: number;
  destinationMintRecipient: `0x${string}`;
  fee: FeeConfig;
}): Record<string, unknown> {
  return {
    sweepCCTP: {
      token: params.token,
      destinationDomain: params.destinationDomain,
      destinationMintRecipient: params.destinationMintRecipient,
      threshold: "0x0",
      endBalance: "0x0",
      fee: params.fee,
    },
  };
}

/**
 * Creates SweepUniswapV3 action arguments for token swaps.
 */
function createSweepUniswapV3Arguments(params: {
  recipient: Address;
  tokenIn: Address;
  tokenOut: Address;
  feeTier: string;
  fee: FeeConfig;
}): Record<string, unknown> {
  return {
    sweepUniswapV3: {
      recipient: params.recipient,
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      feeTier: params.feeTier,
      threshold: "0x0",
      endBalance: "0x0",
      floorAmountOut: "0x0",
      meanPriceLookBack: 600,
      maxPriceDeviationBps: 100,
      fee: params.fee,
    },
  };
}

/**
 * Creates SweepERC20 action arguments for token transfers.
 */
function createSweepERC20Arguments(params: {
  token: Address;
  target: Address;
  fee: FeeConfig;
}): Record<string, unknown> {
  return {
    sweepERC20: {
      token: params.token,
      target: params.target,
      threshold: "0x0",
      endBalance: "0x0",
      fee: params.fee,
    },
  };
}

// =============================================================================
// Instruction Builders
// =============================================================================

/**
 * Creates CCTP bridge instruction (Base → Polygon).
 * Uses setEphemeralTarget: true so the SDK handles the destination address.
 */
function createCCTPBridgeInstruction(
  destinationRecipient: Address,
  fee: FeeConfig,
): EphemeralInstruction {
  return {
    chainId: CHAIN_ID.BASE,
    maxExecutions: 0,
    setEphemeralTarget: true,
    actionArguments: createSweepCCTPArguments({
      token: BASE_TOKENS.USDC,
      destinationDomain: CCTP_DOMAIN.POLYGON,
      destinationMintRecipient: pad(destinationRecipient, { size: 32 }),
      fee,
    }),
  };
}

/**
 * Creates USDT→USDC swap instruction on Base.
 * Uses 0.05% fee tier - reliable liquidity for stablecoin pairs.
 */
function createBaseSwapInstruction(
  recipient: Address,
  fee: FeeConfig,
): EphemeralInstruction {
  return {
    chainId: CHAIN_ID.BASE,
    maxExecutions: 0,
    setEphemeralTarget: true,
    actionArguments: createSweepUniswapV3Arguments({
      recipient,
      tokenIn: BASE_TOKENS.USDT,
      tokenOut: BASE_TOKENS.USDC,
      feeTier: FEE_TIER.LOW, // 0.05% - good liquidity for stablecoins
      fee,
    }),
  };
}

/**
 * Creates USDC→USDC.e swap instruction on Polygon.
 * Uses 0.05% fee tier - reliable liquidity for USDC pairs.
 */
function createPolygonUSDCSwapInstruction(
  recipient: Address,
  fee: FeeConfig,
): EphemeralInstruction {
  return {
    chainId: CHAIN_ID.POLYGON,
    maxExecutions: 0,
    setEphemeralTarget: false,
    actionArguments: createSweepUniswapV3Arguments({
      recipient,
      tokenIn: POLYGON_TOKENS.USDC,
      tokenOut: POLYGON_TOKENS.USDC_E,
      feeTier: FEE_TIER.LOW, // 0.05% - good liquidity for USDC pairs
      fee,
    }),
  };
}

/**
 * Creates USDT→USDC.e swap instruction on Polygon.
 * Uses 0.05% fee tier - reliable liquidity for stablecoin pairs.
 */
function createPolygonUSDTSwapInstruction(
  recipient: Address,
  fee: FeeConfig,
): EphemeralInstruction {
  return {
    chainId: CHAIN_ID.POLYGON,
    maxExecutions: 0,
    setEphemeralTarget: false,
    actionArguments: createSweepUniswapV3Arguments({
      recipient,
      tokenIn: POLYGON_TOKENS.USDT,
      tokenOut: POLYGON_TOKENS.USDC_E,
      feeTier: FEE_TIER.LOW, // 0.05% - good liquidity for stablecoins
      fee,
    }),
  };
}

/**
 * Creates USDC.e transfer instruction on Polygon.
 */
function createPolygonTransferInstruction(
  recipient: Address,
  fee: FeeConfig,
): EphemeralInstruction {
  return {
    chainId: CHAIN_ID.POLYGON,
    maxExecutions: 0,
    setEphemeralTarget: false,
    actionArguments: createSweepERC20Arguments({
      token: POLYGON_TOKENS.USDC_E,
      target: recipient,
      fee,
    }),
  };
}

// =============================================================================
// Main Builder
// =============================================================================

/**
 * Builds a raw orchestration payload for cross-chain USDC settlement.
 *
 * Non-completion instructions (executed on Base):
 * 1. CCTP: Bridge USDC from Base → Polygon
 * 2. Swap: USDT (Base) → USDC (Base)
 *
 * Completion instructions (executed on Polygon):
 * 1. Swap: USDC (Polygon) → USDC.e (Polygon)
 * 2. Swap: USDT (Polygon) → USDC.e (Polygon)
 * 3. Transfer: USDC.e (Polygon) → recipient
 *
 * @param recipientAddress - Final recipient for USDC.e on Polygon
 * @returns PaymentRequestBuildRequest ready for API submission
 */
export function buildRawOrchestrationPayload(
  recipientAddress: Address,
  includeNonCompletion = true,
) {
  const fee = createDefaultFee();

  // Non-completion: Execute on source chain (Base) before bridging
  const instructions: EphemeralInstruction[] = includeNonCompletion
    ? [
        createCCTPBridgeInstruction(recipientAddress, fee),
        createBaseSwapInstruction(recipientAddress, fee),
      ]
    : [];

  // Completion: Execute on destination chain (Polygon) after funds arrive
  const completionInstructions: EphemeralInstruction[] = [
    createPolygonUSDCSwapInstruction(recipientAddress, fee),
    createPolygonUSDTSwapInstruction(recipientAddress, fee),
    createPolygonTransferInstruction(recipientAddress, fee),
  ];

  return createPaymentRequestBuildPayload({
    payerAddress: null,
    instructions,
    completionInstructions,
    metadata: {
      type: "CrossChainSettlement",
      description: includeNonCompletion
        ? "CCTP bridge with multi-token swap to USDC.e"
        : "Single-chain swap to USDC.e (test)",
      sourceChain: includeNonCompletion ? "Base" : "Polygon",
      destinationChain: "Polygon",
      settlementToken: "USDC.e",
    },
    maxRuns: 1,
  });
}

// =============================================================================
// Usage Example
// =============================================================================

/**
 * Example usage:
 *
 * ```ts
 * import { buildRawOrchestrationPayload } from "./raw-orchestration-example";
 *
 * const payload = buildRawOrchestrationPayload(
 *   "0x1234567890123456789012345678901234567890"
 * );
 *
 * // Submit to API
 * const response = await buildPaymentRequest(payload);
 * ```
 */
