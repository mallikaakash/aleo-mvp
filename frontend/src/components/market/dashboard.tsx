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
    <section className="flex flex-col items-center justify-center px-4 md:px-8 lg:px-12 py-10 min-h-screen pt-28">
      <div className="w-full max-w-6xl mx-auto space-y-8 text-white">
        {/* Header */}
        <div>
          <h1 className="md:text-5xl text-3xl font-sans font-thin uppercase inline-block leading-tight">
            <span className="bg-orange-400 px-2 rounded-md text-black shadow-md">
              Flash Round #{round?.id ?? "--"}
            </span>
          </h1>
          <p className="text-white/70 text-sm mt-2">BTC/USD · sealed pools · private orderflow</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-xl p-4">
            <p className="text-xs uppercase tracking-wide text-white/70">Start Price</p>
            <p className="text-2xl font-semibold">
              {round ? `$${round.startPrice.toLocaleString()}` : "Waiting..."}
            </p>
          </div>
          <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-xl p-4">
            <p className="text-xs uppercase tracking-wide text-white/70">Betting Closes In</p>
            <p className="text-2xl font-semibold">{closeIn !== null ? `${closeIn}s` : "--"}</p>
          </div>
          <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-xl p-4">
            <p className="text-xs uppercase tracking-wide text-white/70">Round Resolves In</p>
            <p className="text-2xl font-semibold">{resolveIn !== null ? `${resolveIn}s` : "--"}</p>
          </div>
          <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-xl p-4">
            <p className="text-xs uppercase tracking-wide text-white/70">Status</p>
            <p className="text-lg font-semibold capitalize">{round?.status ?? "BOOTSTRAP"}</p>
            <p className="text-xs text-white/60 mt-1">
              {runtime?.source ?? "bootstrapping"} · Spot{" "}
              {spot?.ok && spot.amount ? `$${spot.amount.toLocaleString()}` : "--"}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Wallet & Betting Panel */}
          <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-5 md:p-6 space-y-4">
            <h2 className="text-xl font-bold">
              <span className="bg-[#75bfcf] px-2 text-black">Wallet</span>
            </h2>
            <WalletArea />

            <div className="space-y-3 border-t border-white/15 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Pick Side</p>
                <div className="flex gap-2">
                  <button
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${side === "YES"
                        ? "bg-[#75bfcf] text-black"
                        : "border border-white/30 text-white hover:bg-white/10"
                      }`}
                    onClick={() => setSide("YES")}
                  >
                    {side === "YES" ? "✓ YES" : "YES"}
                  </button>
                  <button
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${side === "NO"
                        ? "bg-orange-400 text-black"
                        : "border border-white/30 text-white hover:bg-white/10"
                      }`}
                    onClick={() => setSide("NO")}
                  >
                    {side === "NO" ? "✓ NO" : "NO"}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Bet Amount (credits)</p>
                <input
                  aria-label="bet amount"
                  className="w-28 bg-black/40 border border-white/30 rounded px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#75bfcf]"
                  min={1}
                  type="number"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </div>

              <div className="flex items-center justify-between border-t border-white/15 pt-3">
                <p className="text-sm font-medium">Projected Return</p>
                <p className="text-sm font-mono text-[#75bfcf]">~{projected} credits</p>
              </div>
            </div>

            <button
              className="w-full px-4 py-2 bg-[#75bfcf] text-black rounded font-medium hover:bg-[#75bfcf]/80 transition-colors disabled:opacity-50"
              disabled={!canBet || txBusy}
              onClick={submitBet}
            >
              {txBusy ? "Submitting..." : "Place Bet On-Chain"}
            </button>
          </div>

          {/* Claim Panel */}
          <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-5 md:p-6 space-y-4">
            <h2 className="text-xl font-bold">
              <span className="bg-orange-400 px-2 text-black">Claim Rewards</span>
            </h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Claim Round ID</p>
                <input
                  aria-label="claim round id"
                  className="w-28 bg-black/40 border border-white/30 rounded px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#75bfcf]"
                  type="number"
                  value={claimRoundId}
                  onChange={(event) => setClaimRoundId(event.target.value)}
                  placeholder={round?.id ? String(round.id) : "round id"}
                />
              </div>

              <button
                className="w-full px-4 py-2 border border-white/30 text-white rounded font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
                disabled={txBusy || !walletAddress}
                onClick={claimReward}
              >
                {txBusy ? "Working..." : `Claim ${side} Position`}
              </button>
            </div>

            {txFeedback ? (
              <p className="text-sm text-white/60 bg-black/30 border border-white/10 rounded px-3 py-2">
                {txFeedback}
              </p>
            ) : null}

            <p className="text-xs text-white/50">
              Smooth MVP behavior: betting locks at 27s, oracle resolves at 30s, next round opens
              immediately.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
