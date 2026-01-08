
import { Address } from "viem";

const DEFAULT_ADDRESS = "0x0000000000000000000000000000000000000000";

export interface EphemeralInstructionSpec {
  chainId: number;
  salt?: number;
  maxExecutions: number;
  actionArguments: Record<string, unknown>;
  setEphemeralTarget?: boolean;
}

export interface BuildPaymentRequestParams {
  payerAddress?: Address | null;
  completionInstructions: EphemeralInstructionSpec[];
  instructions?: EphemeralInstructionSpec[];
  /** Flexible metadata object - matches API schema z.record(z.string(), z.unknown()) */
  metadata?: Record<string, unknown>;
  maxRuns?: number;
}

interface ProcessedInstruction {
  chainId: number;
  salt: number;
  maxExecutions: number;
  actionArguments: Record<string, unknown>;
  setEphemeralTarget: boolean;
}

export interface FeeConfig {
  executionFee: number;
  maxBaseFeePerGas: `0x${string}`;
  maxPriorityFeePerGas: `0x${string}`;
  token: Address;
}

const DEFAULT_SET_EPHEMERAL_TARGET = true;

export function createPaymentRequestBuildPayload(
  params: BuildPaymentRequestParams,
) {
  const {
    payerAddress = null,
    completionInstructions,
    instructions = [],
    metadata = {},
    maxRuns,
  } = params;

  return {
    payerAddress,
    completionInstructions: completionInstructions.map(processInstruction),
    instructions: instructions.map(processInstruction),
    metadata,
    maxRuns,
  };
}

function processInstruction(
  spec: EphemeralInstructionSpec,
): ProcessedInstruction {
  return {
    chainId: spec.chainId,
    salt: spec.salt ?? generateRandomSalt(),
    maxExecutions: spec.maxExecutions,
    actionArguments: spec.actionArguments,
    setEphemeralTarget: spec.setEphemeralTarget ?? DEFAULT_SET_EPHEMERAL_TARGET,
  };
}

function generateRandomSalt(): number {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

export function createDefaultFee(
  executionFee = 0,
  maxBaseFeePerGas: `0x${string}` = "0x0",
  maxPriorityFeePerGas: `0x${string}` = "0x0",
  token: Address = DEFAULT_ADDRESS,
): FeeConfig {
  return {
    token,
    executionFee,
    maxBaseFeePerGas,
    maxPriorityFeePerGas,
  };
}

export function createFeeWithToken(
  token?: Address,
  maxPriorityFeePerGas?: `0x${string}`,
): FeeConfig {
  return createDefaultFee(0, "0x0", maxPriorityFeePerGas ?? "0x0", token);
}
