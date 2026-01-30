import type { Address } from "viem";

/**
 * Native ETH address (zero address).
 */
export const NATIVE_ETH_ADDRESS =
  "0x0000000000000000000000000000000000000000" as Address;

/**
 * Token metadata for supported tokens on Base mainnet.
 */
export interface TokenConfig {
  symbol: string;
  name: string;
  address: Address;
  decimals: number;
  isNative?: boolean;
}

/**
 * Supported tokens for transfers on Base mainnet.
 */
export const TOKENS: Record<string, TokenConfig> = {
  ETH: {
    symbol: "ETH",
    name: "Ethereum",
    address: NATIVE_ETH_ADDRESS,
    decimals: 18,
    isNative: true,
  },
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address,
    decimals: 6,
  },
  USDT: {
    symbol: "USDT",
    name: "Tether USD",
    address: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2" as Address,
    decimals: 6,
  },
} as const;

/**
 * Array of token configs for iteration.
 */
export const TOKEN_LIST = Object.values(TOKENS);

/**
 * Check if an address is the native ETH address (zero address).
 */
export function isNativeToken(address: Address): boolean {
  return address.toLowerCase() === NATIVE_ETH_ADDRESS.toLowerCase();
}

/**
 * Get token config by symbol.
 */
export function getTokenBySymbol(symbol: string): TokenConfig | undefined {
  return TOKENS[symbol.toUpperCase()];
}
