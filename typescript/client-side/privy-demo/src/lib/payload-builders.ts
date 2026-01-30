import type { TransferBuildPayload } from "@otim/utils/instructions";
import type { Address } from "viem";

import { DEFAULT_INTERVAL_SECONDS } from "@otim/utils/instructions";
import { toHex } from "viem";

import { NATIVE_ETH_ADDRESS } from "~/config/tokens";

/**
 * Fee configuration for instruction execution.
 */
export interface FeePayload {
  token: Address;
  executionFee: string;
  maxBaseFeePerGas: string;
  maxPriorityFeePerGas: string;
}

/**
 * Schedule configuration for instruction timing.
 */
export interface SchedulePayload {
  startAt: number;
  startBy: number;
  interval: number;
  timeout: number;
}

/**
 * Parameters for creating a transfer payload.
 */
export interface TransferPayloadParams {
  /** Account address executing the transfer */
  address: Address;
  /** Chain ID for the transfer */
  chainId: number;
  /** Recipient address */
  recipient: Address;
  /** Amount to transfer in wei (as bigint) */
  value: bigint;
  /** Token address for ERC20 transfers (omit for native ETH) */
  tokenAddress?: Address;
}

/**
 * Creates a default fee payload with zero values.
 * Suitable for simple transfers where gas estimation is handled by the protocol.
 */
export function createDefaultFee(token: Address): FeePayload {
  return {
    token,
    executionFee: toHex(0n),
    maxBaseFeePerGas: toHex(0n),
    maxPriorityFeePerGas: toHex(0n),
  };
}

/**
 * Creates a default schedule payload for immediate one-time execution.
 */
export function createDefaultSchedule(
  interval: number = DEFAULT_INTERVAL_SECONDS,
): SchedulePayload {
  return {
    startAt: 0,
    startBy: 0,
    interval,
    timeout: 0,
  };
}

/**
 * Generates a random salt for instruction uniqueness.
 */
export function generateSalt(): number {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

/**
 * Checks if a token address is the native ETH address.
 */
function isNativeToken(address: Address): boolean {
  return address.toLowerCase() === NATIVE_ETH_ADDRESS.toLowerCase();
}

/**
 * Creates a transfer build payload from parameters.
 *
 * This is the single-purpose function for constructing transfer payloads.
 * It handles both native ETH and ERC20 token transfers.
 *
 * @example
 * ```ts
 * const payload = createTransferPayload({
 *   address: "0x...",
 *   chainId: 8453,
 *   recipient: "0x...",
 *   value: parseEther("1.0"),
 * });
 * ```
 */
export function createTransferPayload(
  params: TransferPayloadParams,
): TransferBuildPayload {
  const { address, chainId, recipient, value, tokenAddress } = params;

  const isNative = !tokenAddress || isNativeToken(tokenAddress);
  const feeToken = isNative ? NATIVE_ETH_ADDRESS : tokenAddress;

  const payload: TransferBuildPayload = {
    address,
    chainId,
    target: recipient,
    value: toHex(value),
    fee: createDefaultFee(feeToken),
    schedule: createDefaultSchedule(),
    maxExecutions: 1,
    salt: generateSalt(),
    gasLimit: 0,
  };

  if (!isNative && tokenAddress) {
    payload.token = tokenAddress;
  }

  return payload;
}
