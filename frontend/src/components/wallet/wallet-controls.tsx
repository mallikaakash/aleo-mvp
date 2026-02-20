"use client";

import { useMemo, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useTransaction,
  WalletAdapterNetwork,
  Transaction,
} from "aleo-hooks";
import { SUPPORTED_WALLETS } from "@/lib/wallet/adapters";

function formatAddress(address: string) {
  if (address.length < 14) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

export function WalletControls() {
  const { connected, publicKey } = useAccount();
  const { connect, connecting } = useConnect();
  const { disconnect, disconnecting } = useDisconnect();
  const { executeTransaction, loading } = useTransaction();
  const [feedback, setFeedback] = useState<string>("");

  const connectCtas = useMemo(
    () =>
      SUPPORTED_WALLETS.map((wallet) => (
        <button
          key={wallet.label}
          className="pressable-button"
          disabled={connecting}
          onClick={() => connect(wallet.name)}
        >
          <h6>Connect {wallet.label}</h6>
        </button>
      )),
    [connect, connecting],
  );

  async function sendHealthcheckTx() {
    if (!publicKey) return;

    try {
      setFeedback("Requesting wallet signature...");
      const tx = Transaction.createTransaction(
        publicKey,
        WalletAdapterNetwork.Testnet,
        "credits.aleo",
        "transfer_public",
        [publicKey, "1u64"],
        25_000,
      );
      const txId = await executeTransaction(tx);
      setFeedback(txId ? `Submitted tx: ${txId}` : "Transaction was not submitted.");
    } catch {
      setFeedback("Transaction request failed. Confirm wallet permissions and balance.");
    }
  }

  if (!connected) {
    return <div className="wallet-row">{connectCtas}</div>;
  }

  return (
    <div className="wallet-panel">
      <h6>Connected: {formatAddress(publicKey ?? "")}</h6>
      <div className="wallet-row">
        <button className="pressable-button" disabled={loading} onClick={sendHealthcheckTx}>
          <h6>{loading ? "Sending..." : "Send Wallet Test Tx"}</h6>
        </button>
        <button className="pressable-button muted" disabled={disconnecting} onClick={disconnect}>
          <h6>{disconnecting ? "Disconnecting..." : "Disconnect"}</h6>
        </button>
      </div>
      {feedback ? <h6 className="hint">{feedback}</h6> : null}
    </div>
  );
}
