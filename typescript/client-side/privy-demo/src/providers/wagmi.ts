import { createConfig } from "@privy-io/wagmi";
import { http, createPublicClient } from "viem";
import { base } from "viem/chains";

/**
 * Default chain ID for the application (Base Mainnet).
 */
export const DEFAULT_CHAIN_ID = 1;

/**
 * Wagmi configuration for wallet connections.
 *
 * Configures the supported chains and transports for
 * interacting with the Ethereum network.
 * Uses @privy-io/wagmi createConfig for Privy compatibility.
 */
export const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
});

/**
 * Public client for read-only operations.
 * Used for getting transaction counts, reading contract state, etc.
 */
export const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});
