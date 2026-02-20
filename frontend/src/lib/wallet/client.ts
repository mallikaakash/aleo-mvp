"use client";

import { Network, type TransactionStatusResponse } from "@provablehq/aleo-types";
import { ShieldWalletAdapter } from "@provablehq/aleo-wallet-adaptor-shield";
import { WalletDecryptPermission } from "@provablehq/aleo-wallet-standard";
import { PROGRAM_ID } from "@/lib/wallet/constants";
const SESSION_KEY = "aleo_flash_wallet_session";
const SESSION_EVENT = "aleo-flash-wallet-session";

export type WalletSession = {
  walletId: "shield";
  address: string;
};

let shieldAdapter: ShieldWalletAdapter | null = null;

function getShieldAdapter() {
  if (typeof window === "undefined") {
    throw new Error("Wallet APIs are only available in the browser.");
  }
  if (!shieldAdapter) shieldAdapter = new ShieldWalletAdapter();
  return shieldAdapter;
}

export function readWalletSession(): WalletSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as WalletSession;
    if (!parsed.address) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeWalletSession(session: WalletSession | null) {
  if (typeof window === "undefined") return;
  if (!session) window.localStorage.removeItem(SESSION_KEY);
  else window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: session }));
}

export function walletSessionEventName() {
  return SESSION_EVENT;
}

export async function connectShieldWallet() {
  const account = await getShieldAdapter().connect(Network.TESTNET, WalletDecryptPermission.UponRequest, [
    PROGRAM_ID,
    "credits.aleo",
  ]);
  const address = account?.address ?? "";
  if (address) writeWalletSession({ walletId: "shield", address });
  return address;
}

export async function disconnectShieldWallet() {
  await getShieldAdapter().disconnect();
  writeWalletSession(null);
}

export async function executeProgramTransaction(fn: string, inputs: string[]) {
  const result = await getShieldAdapter().executeTransaction({
    program: PROGRAM_ID,
    function: fn,
    inputs,
    fee: 0.3,
  });
  return result.transactionId;
}

export async function getShieldTxStatus(transactionId: string): Promise<TransactionStatusResponse> {
  return getShieldAdapter().transactionStatus(transactionId);
}
