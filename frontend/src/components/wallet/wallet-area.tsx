"use client";

import { AppWalletProvider } from "@/components/providers/wallet-provider";
import { WalletControls } from "@/components/wallet/wallet-controls";

export function WalletArea() {
  return (
    <AppWalletProvider>
      <WalletControls />
    </AppWalletProvider>
  );
}
