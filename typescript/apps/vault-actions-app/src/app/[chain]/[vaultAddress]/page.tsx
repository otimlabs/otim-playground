import { fetchVault } from "@/lib/vaults";
import { notFound } from "next/navigation";
import VaultDetail from "./vault-detail";

interface PageProps {
  params: Promise<{
    chain: string;
    vaultAddress: string;
  }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { chain, vaultAddress } = await params;
  try {
    const vault = await fetchVault(chain, vaultAddress);
    return {
      title: `${vault.name} | OTIM Vault Actions`,
      description: `${vault.name} on ${vault.chainName}. APY: ${(vault.apy * 100).toFixed(2)}%. TVL: $${Math.round(vault.tvlUsd).toLocaleString()}. Deposit, withdraw, or migrate via OTIM.`,
    };
  } catch {
    return {
      title: "Vault Not Found | OTIM Vault Actions",
    };
  }
}

export default async function VaultPage({ params }: PageProps) {
  const { chain, vaultAddress } = await params;

  let vault;
  try {
    vault = await fetchVault(chain, vaultAddress);
  } catch {
    notFound();
  }

  return <VaultDetail vault={vault} />;
}
