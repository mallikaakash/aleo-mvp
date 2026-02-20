"use client";

import { useMemo } from "react";
import { DecryptPermission, WalletProvider } from "aleo-hooks";
import { createWalletAdapters, WALLET_NETWORK } from "@/lib/wallet/adapters";

type Props = {
  children: React.ReactNode;
};

export function AppWalletProvider({ children }: Props) {
  const wallets = useMemo(() => createWalletAdapters(), []);

  return (
    <WalletProvider
      wallets={wallets}
      decryptPermission={DecryptPermission.UponRequest}
      network={WALLET_NETWORK}
      autoConnect
      localStorageKey="aleo-flash-markets-wallet"
    >
      {children}
    </WalletProvider>
  );
}
