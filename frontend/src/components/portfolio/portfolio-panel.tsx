"use client";

import { AppWalletProvider } from "@/components/providers/wallet-provider";
import { PortfolioLive } from "@/components/portfolio/portfolio-live";

export function PortfolioPanel() {
  return (
    <AppWalletProvider>
      <PortfolioLive />
    </AppWalletProvider>
  );
}
