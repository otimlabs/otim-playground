import type { Address } from "viem";
import type { VRS } from "@otim/utils/schemas";

import { createSiweMessage } from "viem/siwe";
import { parseSignatureToVRS } from "@otim/utils/helpers";

/**
 * SIWE Configuration
 *
 * Using chain ID 0 as per Otim's auth config to indicate
 * this is an off-chain authentication, not tied to a specific chain.
 */
const SIWE_CONFIG = {
  chainId: 0,
  domain: "otim.com",
  uri: "https://app.otim.com",
  version: "1" as const,
} as const;

/**
 * Creates the default SIWE statement with terms acceptance.
 * Must match exactly what the Otim API expects.
 */
function createDefaultStatement(): string {
  return "Welcome to Otim! By signing in, you accept the Otim Terms and Conditions (https://otim.com/tac). This request will not trigger a blockchain transaction or cost any gas fees.";
}

/**
 * Generates a cryptographically secure nonce for SIWE authentication.
 *
 * Uses the Web Crypto API for secure random generation.
 * Produces a 32-character hex string (16 bytes of entropy).
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

/**
 * Creates a SIWE (Sign-In With Ethereum) message for authentication.
 *
 * @param address - The wallet address to authenticate
 * @param nonce - A unique nonce for replay protection
 * @param statement - Optional custom statement (defaults to Otim's standard)
 * @returns The formatted SIWE message string
 */
export function createAuthMessage(
  address: Address,
  nonce: string,
  statement?: string,
): string {
  return createSiweMessage({
    address,
    chainId: SIWE_CONFIG.chainId,
    domain: SIWE_CONFIG.domain,
    nonce,
    statement: statement ?? createDefaultStatement(),
    uri: SIWE_CONFIG.uri,
    version: SIWE_CONFIG.version,
  });
}

/**
 * Parses a hex signature string into VRS components.
 *
 * @param signature - The hex-encoded signature (0x-prefixed, 132 chars)
 * @returns The VRS signature components
 */
export function parseSignature(signature: string): VRS {
  return parseSignatureToVRS(signature);
}

export { type VRS };
