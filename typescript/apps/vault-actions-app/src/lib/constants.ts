export interface PaymentOption {
  id: string;
  label: string;
  chainId: number;
  chainName: string;
  tokenAddress: string;
  tokenSymbol: string;
  decimals: number;
}

export const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: "usdc-ethereum",
    label: "USDC on Ethereum",
    chainId: 1,
    chainName: "Ethereum",
    tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    tokenSymbol: "USDC",
    decimals: 6,
  },
  {
    id: "usdt-ethereum",
    label: "USDT on Ethereum",
    chainId: 1,
    chainName: "Ethereum",
    tokenAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    tokenSymbol: "USDT",
    decimals: 6,
  },
  {
    id: "usdc-base",
    label: "USDC on Base",
    chainId: 8453,
    chainName: "Base",
    tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    tokenSymbol: "USDC",
    decimals: 6,
  },
  {
    id: "usdt-base",
    label: "USDT on Base",
    chainId: 8453,
    chainName: "Base",
    tokenAddress: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
    tokenSymbol: "USDT",
    decimals: 6,
  },
];
