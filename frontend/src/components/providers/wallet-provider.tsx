"use client";

type Props = {
  children: React.ReactNode;
};

export function AppWalletProvider({ children }: Props) {
  return <>{children}</>;
}
