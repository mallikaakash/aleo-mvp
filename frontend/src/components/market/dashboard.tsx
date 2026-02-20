"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  executeProgramTransaction,
  getShieldTxStatus,
  readWalletSession,
  walletSessionEventName,
} from "@/lib/wallet/client";

const WalletArea = dynamic(
  () => import("@/components/wallet/wallet-area").then((m) => m.WalletArea),
  { ssr: false },
);

type BetSide = "YES" | "NO";
type ActiveResponse = {
  ok: boolean;
  source: string;
  lastUpdated: number;
  nowSec: number;
  currentRound: {
    id: number;
    startTs: number;
    closeTs: number;
    endTs: number;
    startPrice: number;
    status: "OPEN" | "CLOSED" | "RESOLVED" | "VOID";
  } | null;
};
type SpotResponse = {
  ok: boolean;
  amount?: number;
  source?: string;
  fetchedAt?: number;
};
type OnchainMarketResponse = {
  ok: boolean;
  marketId: number;
  yesTotal: number;
  noTotal: number;
  outcomeYes: boolean;
  statusCode: number;
  statusName: "OPEN" | "CLOSED" | "RESOLVED" | "VOID";
  userAmount: number;
  userClaimed: boolean;
  error?: string;
};

export function MarketDashboard() {
  const [amount, setAmount] = useState("1");
  const [side, setSide] = useState<BetSide>("YES");
  const [runtime, setRuntime] = useState<ActiveResponse | null>(null);
  const [spot, setSpot] = useState<SpotResponse | null>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [txFeedback, setTxFeedback] = useState("");
  const [txBusy, setTxBusy] = useState(false);
  const [claimRoundId, setClaimRoundId] = useState("");

  const projected = useMemo(() => {
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) return 0;
    return Math.max(1, Math.floor(num * 1.8));
  }, [amount]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const response = await fetch("/api/market/active", { cache: "no-store" });
      const payload = (await response.json()) as ActiveResponse;
      if (!cancelled) setRuntime(payload);
    }

    async function loadSpot() {
      const response = await fetch("/api/spot", { cache: "no-store" });
      const payload = (await response.json()) as SpotResponse;
      if (!cancelled) setSpot(payload);
    }

    load();
    loadSpot();
    const interval = setInterval(() => {
      load();
      loadSpot();
    }, 500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const hydrate = () => {
      const session = readWalletSession();
      setWalletAddress(session?.address ?? "");
    };
    hydrate();
    const eventName = walletSessionEventName();
    window.addEventListener(eventName, hydrate as EventListener);
    return () => window.removeEventListener(eventName, hydrate as EventListener);
  }, []);

  const round = runtime?.currentRound;
  const closeIn = round ? Math.max(0, round.closeTs - (runtime?.nowSec ?? 0)) : null;
  const resolveIn = round ? Math.max(0, round.endTs - (runtime?.nowSec ?? 0)) : null;
  const canBet = Boolean(round && round.status === "OPEN" && (closeIn ?? 0) > 0 && walletAddress);

  async function waitForTxFinalState(transactionId: string) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        const status = await getShieldTxStatus(transactionId);
        const normalized = (status.status ?? "").toLowerCase();
        if (normalized.includes("accept")) return "accepted";
        if (normalized.includes("reject")) return `rejected: ${status.error ?? "unknown error"}`;
        if (normalized.includes("fail")) return `failed: ${status.error ?? "unknown error"}`;
      } catch {
        // ignore intermittent status fetch failures
      }
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
    return "pending";
  }

  async function submitBet() {
    if (!round) {
      setTxFeedback("No active round.");
      return;
    }
    const num = Number(amount);
    if (!Number.isFinite(num) || num < 1) {
      setTxFeedback("Enter a valid amount (>= 1).");
      return;
    }
    if (!walletAddress) {
      setTxFeedback("Connect Shield wallet before placing a bet.");
      return;
    }

    setTxBusy(true);
    setTxFeedback("Submitting place_bet transaction...");
    try {
      const txId = await executeProgramTransaction("place_bet", [
        `${round.id}u64`,
        side === "YES" ? "true" : "false",
        `${Math.floor(num)}u64`,
      ]);
      const finalState = await waitForTxFinalState(txId);
      setTxFeedback(`Bet tx: ${txId} (${finalState})`);
    } catch (error) {
      setTxFeedback(`Bet failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setTxBusy(false);
    }
  }

  async function claimReward() {
    const marketId = Number(claimRoundId || round?.id || 0);
    if (!Number.isFinite(marketId) || marketId <= 0) {
      setTxFeedback("Enter a valid round id for claim.");
      return;
    }
    if (!walletAddress) {
      setTxFeedback("Connect Shield wallet before claiming.");
      return;
    }

    setTxBusy(true);
    setTxFeedback("Loading on-chain claim parameters...");
    try {
      const response = await fetch(
        `/api/market/onchain?marketId=${marketId}&address=${walletAddress}&sideYes=${side === "YES"}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as OnchainMarketResponse;
      if (!payload.ok) throw new Error(payload.error ?? "on-chain lookup failed");
      if (payload.userAmount <= 0) {
        throw new Error(`No ${side} position found for this wallet in round ${marketId}.`);
      }
      if (payload.userClaimed) {
        throw new Error("This position is already claimed.");
      }
      const txId = await executeProgramTransaction("claim_reward", [
        `${marketId}u64`,
        side === "YES" ? "true" : "false",
        `${payload.userAmount}u64`,
        `${payload.yesTotal}u64`,
        `${payload.noTotal}u64`,
        payload.outcomeYes ? "true" : "false",
        `${payload.statusCode}u8`,
      ]);
      const finalState = await waitForTxFinalState(txId);
      setTxFeedback(`Claim tx: ${txId} (${finalState})`);
    } catch (error) {
      setTxFeedback(`Claim failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setTxBusy(false);
    }
  }

  return (
    <div className="grid-2">
      <section className="glass-card stack" style={{ padding: "1.2rem" }}>
        <h1>Flash Round #{round?.id ?? "--"}</h1>
        <h6>BTC/USD · sealed pools · private orderflow</h6>
        <div className="metric-row">
          <h6>Start Price</h6>
          <h6>{round ? `$${round.startPrice.toLocaleString()}` : "Waiting for oracle..."}</h6>
        </div>
        <div className="metric-row">
          <h6>Betting Closes In</h6>
          <h6>{closeIn !== null ? `${closeIn}s` : "--"}</h6>
        </div>
        <div className="metric-row">
          <h6>Round Resolves In</h6>
          <h6>{resolveIn !== null ? `${resolveIn}s` : "--"}</h6>
        </div>
        <div className="metric-row">
          <h6>Status</h6>
          <h6>{round?.status ?? "BOOTSTRAP"}</h6>
        </div>
        <div className="metric-row">
          <h6>Oracle Feed</h6>
          <h6>{runtime?.source ?? "bootstrapping"}</h6>
        </div>
        <div className="metric-row">
          <h6>Live Spot</h6>
          <h6>{spot?.ok && spot.amount ? `$${spot.amount.toLocaleString()}` : "--"}</h6>
        </div>
      </section>

      <section className="glass-card stack" style={{ padding: "1.2rem" }}>
        <h6>Wallet</h6>
        <WalletArea />
        <div className="metric-row">
          <h6>Pick Side</h6>
          <div className="cta-row">
            <button className="pressable-button" onClick={() => setSide("YES")}>
              <h6>{side === "YES" ? "YES Selected" : "YES"}</h6>
            </button>
            <button className="pressable-button muted" onClick={() => setSide("NO")}>
              <h6>{side === "NO" ? "NO Selected" : "NO"}</h6>
            </button>
          </div>
        </div>
        <div className="metric-row">
          <h6>Bet Amount (credits)</h6>
          <input
            aria-label="bet amount"
            className="pressable-button"
            min={1}
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>
        <div className="metric-row">
          <h6>Projected Return</h6>
          <h6>~{projected} credits</h6>
        </div>
        <div className="wallet-row">
          <button className="pressable-button" disabled={!canBet || txBusy} onClick={submitBet}>
            <h6>{txBusy ? "Submitting..." : "Place Bet On-Chain"}</h6>
          </button>
        </div>
        <div className="metric-row">
          <h6>Claim Round ID</h6>
          <input
            aria-label="claim round id"
            className="pressable-button"
            type="number"
            value={claimRoundId}
            onChange={(event) => setClaimRoundId(event.target.value)}
            placeholder={round?.id ? String(round.id) : "round id"}
          />
        </div>
        <div className="wallet-row">
          <button className="pressable-button muted" disabled={txBusy || !walletAddress} onClick={claimReward}>
            <h6>{txBusy ? "Working..." : `Claim ${side} Position`}</h6>
          </button>
        </div>
        {txFeedback ? <h6 className="hint">{txFeedback}</h6> : null}
        <h6 className="hint">
          Smooth MVP behavior: betting locks at 27s, oracle resolves at 30s, next round opens immediately.
        </h6>
      </section>
    </div>
  );
}
