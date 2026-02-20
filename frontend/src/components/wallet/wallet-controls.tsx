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
      appName: "Pulse",
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
      `${id} connect failed after payload retries. Last error: ${lastError instanceof Error ? lastError.message : "unknown"
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
      className="px-4 py-2 bg-[#75bfcf] text-black rounded font-medium text-sm hover:bg-[#75bfcf]/80 transition-colors disabled:opacity-50"
      disabled={connecting}
      onClick={() => connectWallet(wallet.id)}
    >
      Connect {wallet.label}
    </button>
  ));

  if (!connected) {
    return (
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">{connectCtas}</div>
        <div className="flex gap-2 flex-wrap">
          <button
            className="px-4 py-2 border border-white/30 text-white rounded text-sm font-medium hover:bg-white/10 transition-colors"
            onClick={detectWallets}
          >
            Detect Wallets
          </button>
        </div>
        {detected.length ? <p className="text-xs text-white/60">Detected: {detected.join(", ")}</p> : null}
        {feedback ? <p className="text-xs text-white/60">{feedback}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center rounded-full bg-[#75bfcf]/15 border border-[#75bfcf]/60 px-2 py-[2px] text-[0.7rem] text-[#75bfcf]">
          Connected
        </span>
        <p className="text-sm font-mono text-white/80">{formatAddress(publicKey ?? "")}</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button
          className="px-4 py-2 border border-white/30 text-white rounded text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
          disabled={disconnecting}
          onClick={disconnectWallet}
        >
          {disconnecting ? "Disconnecting..." : "Disconnect"}
        </button>
      </div>
      {feedback ? <p className="text-xs text-white/60">{feedback}</p> : null}
    </div>
  );
}
