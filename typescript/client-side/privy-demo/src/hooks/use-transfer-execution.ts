"use client";

import type { InstructionBuild } from "@otim/utils/api";
import type { InstructionActionCamelCase } from "@otim/utils/instructions";
import type { Address } from "viem";

import {
  createActivationPayload,
  createInstructionTypedData,
  createTransferBuildPayload,
} from "@otim/utils/instructions";
import { useWallets } from "@privy-io/react-auth";
import { useCallback } from "react";
import { parseEther, parseUnits } from "viem";
import { useSignTypedData } from "wagmi";

import { getTokenBySymbol, isNativeToken } from "~/config/tokens";
import { createTransferPayload } from "~/lib/payload-builders";
import { DEFAULT_CHAIN_ID } from "~/providers/wagmi";
import {
  activateInstruction,
  buildInstruction,
  getDelegateAddress,
} from "~/server/actions/instruction";

/**
 * Parameters for executing a transfer.
 */
export interface ExecuteTransferParams {
  /** Token symbol (ETH, USDC, USDT) */
  token: string;
  /** Amount to transfer (human readable) */
  amount: string;
  /** Recipient address */
  recipient: string;
}

/**
 * Result of a successful transfer execution.
 */
export interface TransferExecutionResult {
  instructionId: string;
}

/**
 * Return type for the useTransferExecution hook.
 */
export interface UseTransferExecutionReturn {
  /** Execute a transfer with the given parameters */
  execute: (params: ExecuteTransferParams) => Promise<TransferExecutionResult>;
  /** The connected wallet address, if available */
  walletAddress: Address | null;
}

/**
 * Validates transfer parameters before execution.
 * @throws Error if validation fails
 */
function validateTransferParams(params: ExecuteTransferParams): void {
  const { token, amount, recipient } = params;

  if (!recipient || !/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
    throw new Error("Invalid recipient address");
  }

  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    throw new Error("Invalid amount");
  }

  const tokenConfig = getTokenBySymbol(token);
  if (!tokenConfig) {
    throw new Error(`Unknown token: ${token}`);
  }
}

/**
 * Determines the action name based on token type.
 */
function getActionName(tokenAddress: Address): InstructionActionCamelCase {
  return isNativeToken(tokenAddress) ? "transfer" : "transferERC20";
}

/**
 * Converts a human-readable amount to wei.
 */
function parseAmount(amount: string, tokenSymbol: string): bigint {
  const token = getTokenBySymbol(tokenSymbol);
  if (!token) {
    throw new Error(`Unknown token: ${tokenSymbol}`);
  }

  return isNativeToken(token.address)
    ? parseEther(amount)
    : parseUnits(amount, token.decimals);
}

/**
 * Creates EIP-712 typed data for instruction signing.
 */
async function createTypedData(
  instruction: InstructionBuild,
  walletAddress: Address,
  tokenAddress: Address,
  chainId: number,
) {
  const { otimDelegateAddress } = await getDelegateAddress(chainId);
  const actionName = getActionName(tokenAddress);

  return createInstructionTypedData(
    {
      address: walletAddress,
      chainId,
      salt: instruction.salt,
      maxExecutions: instruction.maxExecutions,
      action: instruction.action,
      actionName,
      arguments: instruction.arguments,
    },
    {
      delegateAddress: otimDelegateAddress as Address,
      chainId,
    },
  );
}

/**
 * Hook for executing token transfers via the Otim instruction system.
 *
 * This hook handles the core execution flow:
 * 1. Build the transfer payload
 * 2. Build the instruction via API
 * 3. Create EIP-712 typed data
 * 4. Sign the typed data
 * 5. Activate the instruction
 *
 * State management (loading, errors) is handled by the parent hook.
 *
 * @example
 * ```ts
 * const { execute, walletAddress } = useTransferExecution();
 *
 * const result = await execute({
 *   token: "USDC",
 *   amount: "100",
 *   recipient: "0x...",
 * });
 * ```
 */
export function useTransferExecution(): UseTransferExecutionReturn {
  const { wallets } = useWallets();
  const { signTypedDataAsync } = useSignTypedData();

  const embeddedWallet = wallets.find(
    (wallet) => wallet.walletClientType === "privy",
  );

  const walletAddress = embeddedWallet?.address as Address | null;

  const execute = useCallback(
    async (params: ExecuteTransferParams): Promise<TransferExecutionResult> => {
      if (!embeddedWallet) {
        throw new Error("No embedded wallet found");
      }

      validateTransferParams(params);

      const token = getTokenBySymbol(params.token)!;
      const address = embeddedWallet.address as Address;
      const valueInWei = parseAmount(params.amount, params.token);

      // Step 1: Create transfer payload
      const transferPayload = createTransferPayload({
        address,
        chainId: DEFAULT_CHAIN_ID,
        recipient: params.recipient as Address,
        value: valueInWei,
        tokenAddress: isNativeToken(token.address) ? undefined : token.address,
      });

      // Step 2: Build instruction
      const buildBody = createTransferBuildPayload(transferPayload);
      const instruction = await buildInstruction(buildBody);

      // Step 3: Create typed data for signing
      const typedData = await createTypedData(
        instruction,
        address,
        token.address,
        DEFAULT_CHAIN_ID,
      );

      // Step 4: Sign the typed data
      const signature = await signTypedDataAsync({
        domain: typedData.domain,
        types: typedData.types,
        primaryType: typedData.primaryType,
        message: typedData.message,
      });

      // Step 5: Create activation payload and submit
      const actionName = getActionName(token.address);
      const activationPayload = createActivationPayload({
        address,
        chainId: DEFAULT_CHAIN_ID,
        salt: instruction.salt,
        maxExecutions: instruction.maxExecutions,
        action: instruction.action,
        actionName,
        arguments: instruction.arguments,
        signature,
      });

      const result = await activateInstruction(activationPayload);

      return { instructionId: result.instructionId };
    },
    [embeddedWallet, signTypedDataAsync],
  );

  return {
    execute,
    walletAddress,
  };
}
