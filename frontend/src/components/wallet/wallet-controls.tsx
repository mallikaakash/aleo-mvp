"use client";

import { useState } from "react";
import { SUPPORTED_WALLETS } from "@/lib/wallet/adapters";
import { connectShieldWallet, disconnectShieldWallet, writeWalletSession } from "@/lib/wallet/client";

function formatAddress(address: string) {
  if (address.length < 14) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

type BrowserWallet = {
  connect?: (...args: unknown[]) => Promise<{ address?: string } | string | undefined>;
  disconnect?: () => Promise<void>;
  getAddress?: () => Promise<string | undefined>;
};

function getWallet(id: string): BrowserWallet | undefined {
  if (typeof window === "undefined") return undefined;
  const source = window as unknown as Record<string, BrowserWallet>;
  if (id === "shield") return source.shield ?? source.shieldWallet ?? source.avail;
  if (id === "leo") return source.leoWallet ?? source.leo;
  if (id === "puzzle") return source.puzzle ?? source.puzzleWallet;
  return undefined;
}

export function WalletControls() {
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string>("");
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [feedback, setFeedback] = useState<string>("");
  const [detected, setDetected] = useState<string[]>([]);

  async function connectShield() {
    try {
      const address = await connectShieldWallet();
      setPublicKey(address);
      setConnected(Boolean(address));
      setFeedback(address ? `Connected Shield: ${formatAddress(address)}` : "Connected Shield.");
      return true;
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? `Shield connect failed: ${error.message}`
          : "Shield connect failed. Check extension permissions/network.",
      );
      return false;
    }
  }

  async function connectWithPayloads(wallet: BrowserWallet, id: string) {
    if (!wallet.connect) throw new Error("wallet missing connect()");
    const connect = wallet.connect;

    const payloadObject = {
      appName: "Aleo Flash Markets",
      appDescription: "Private flash prediction rounds on Aleo",
      appIconUrl: `${window.location.origin}/favicon.ico`,
      network: "testnetbeta",
      decryptPermission: "DECRYPT_UPON_REQUEST",
      programs: ["flashmarketsam2.aleo", "credits.aleo"],
      programIdPermissions: {
        testnetbeta: ["flashmarketsam2.aleo", "credits.aleo"],
        mainnetbeta: [],
      },
    };

    const connectAttempts: Array<() => Promise<unknown>> = [
      () => connect(payloadObject),
      () => connect("DECRYPT_UPON_REQUEST", "testnetbeta", ["flashmarketsam2.aleo"]),
      () => connect("DECRYPT_UPON_REQUEST", "testnet3", ["flashmarketsam2.aleo"]),
      () => connect(),
    ];

    let lastError: unknown = null;
    for (const attempt of connectAttempts) {
      try {
        return await attempt();
      } catch (error) {
        lastError = error;
      }
    }
    throw new Error(
      `${id} connect failed after payload retries. Last error: ${
        lastError instanceof Error ? lastError.message : "unknown"
      }`,
    );
  }

  function detectWallets() {
    const available = SUPPORTED_WALLETS.filter((wallet) => {
      const instance = getWallet(wallet.id);
      return Boolean(instance?.connect || instance?.getAddress);
    }).map((wallet) => wallet.label);
    setDetected(available);
    setFeedback(available.length ? `Detected: ${available.join(", ")}` : "No compatible wallet extension detected.");
  }

  async function connectWallet(id: string) {
    setConnecting(true);
    try {
      if (id === "shield") {
        const ok = await connectShield();
        if (ok) return;
      }
      const wallet = getWallet(id);
      if (!wallet?.connect) {
        setFeedback(`${id} wallet extension was not detected in this browser. Click Detect Wallets to inspect support.`);
        return;
      }
      const result = await connectWithPayloads(wallet, id);
      const isObj = typeof result === "object" && result !== null;
      const fromResult =
        typeof result === "string"
          ? result
          : isObj && "address" in result
            ? String((result as { address?: unknown }).address ?? "")
            : "";
      const fromMethod = wallet.getAddress ? await wallet.getAddress() : "";
      const address = fromResult || fromMethod || "";
      setPublicKey(address);
      setConnected(Boolean(address));
      if (address) writeWalletSession({ walletId: "shield", address });
      setFeedback(address ? `Connected: ${formatAddress(address)}` : "Connected.");
    } catch {
      setFeedback("Wallet connection failed. Check extension permissions.");
    } finally {
      setConnecting(false);
    }
  }

  async function disconnectWallet() {
    setDisconnecting(true);
    try {
      const leo = getWallet("leo");
      const puzzle = getWallet("puzzle");
      await disconnectShieldWallet();
      await leo?.disconnect?.();
      await puzzle?.disconnect?.();
    } catch {
      // ignore disconnect errors
    } finally {
      setPublicKey("");
      setConnected(false);
      writeWalletSession(null);
      setDisconnecting(false);
    }
  }

  const connectCtas = SUPPORTED_WALLETS.map((wallet) => (
    <button
      key={wallet.label}
      className="pressable-button"
      disabled={connecting}
      onClick={() => connectWallet(wallet.id)}
    >
      <h6>Connect {wallet.label}</h6>
    </button>
  ));

  if (!connected) {
    return (
      <div className="wallet-panel">
        <div className="wallet-row">{connectCtas}</div>
        <div className="wallet-row">
          <button className="pressable-button muted" onClick={detectWallets}>
            <h6>Detect Wallets</h6>
          </button>
        </div>
        {detected.length ? <h6 className="hint">Detected: {detected.join(", ")}</h6> : null}
        {feedback ? <h6 className="hint">{feedback}</h6> : null}
      </div>
    );
  }

  return (
    <div className="wallet-panel">
      <h6>Connected: {formatAddress(publicKey ?? "")}</h6>
      <div className="wallet-row">
        <button className="pressable-button muted" disabled={disconnecting} onClick={disconnectWallet}>
          <h6>{disconnecting ? "Disconnecting..." : "Disconnect"}</h6>
        </button>
      </div>
      {feedback ? <h6 className="hint">{feedback}</h6> : null}
    </div>
  );
}
