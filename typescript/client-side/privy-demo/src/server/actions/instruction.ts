"use server";

import type {
  InstructionActivateRequest,
  InstructionActivateResponse,
  InstructionBuild,
  InstructionBuildRequest,
  GetDelegateAddressResponse,
} from "@otim/utils/api";

import { createServerAPIClient } from "../api";

/**
 * Builds an instruction on the Otim protocol.
 *
 * Takes a build request with action arguments and returns the built instruction
 * ready for signing and activation.
 *
 * @param request - The instruction build request
 * @returns The built instruction with action hash and encoded arguments
 * @throws Error if the build fails
 */
export async function buildInstruction(
  request: InstructionBuildRequest,
): Promise<InstructionBuild> {
  const api = await createServerAPIClient();
  const response = await api.instruction.build(request);

  if (!response.data) {
    throw new Error("Failed to build instruction");
  }

  return response.data;
}

/**
 * Activates a signed instruction on the Otim protocol.
 *
 * After an instruction is built and signed, this submits it for activation.
 * Once activated, the instruction can be executed by the protocol.
 *
 * @param request - The instruction activation request with signature
 * @returns The activation response with instruction ID
 * @throws Error if activation fails
 */
export async function activateInstruction(
  request: InstructionActivateRequest,
): Promise<InstructionActivateResponse> {
  const api = await createServerAPIClient();
  const response = await api.instruction.activate(request);

  if (!response.data) {
    throw new Error("Failed to activate instruction");
  }

  return response.data;
}

/**
 * Retrieves the delegate address for a specific chain.
 *
 * The delegate address is required for EIP-712 signature domain construction.
 * This is the contract address that verifies instruction signatures.
 *
 * @param chainId - The chain ID to get the delegate address for
 * @returns The delegate address configuration
 * @throws Error if the request fails
 */
export async function getDelegateAddress(
  chainId: number,
): Promise<GetDelegateAddressResponse> {
  const api = await createServerAPIClient();
  const response = await api.config.getDelegateAddress({ chainId });

  if (!response.data) {
    throw new Error("Failed to get delegate address");
  }

  return response.data;
}
