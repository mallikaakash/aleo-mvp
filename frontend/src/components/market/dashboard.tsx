"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

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

export function MarketDashboard() {
  const [amount, setAmount] = useState("1");
  const [side, setSide] = useState<BetSide>("YES");
  const [runtime, setRuntime] = useState<ActiveResponse | null>(null);

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

    load();
    const interval = setInterval(() => {
      load();
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const round = runtime?.currentRound;
  const closeIn = round ? Math.max(0, round.closeTs - (runtime?.nowSec ?? 0)) : null;
  const resolveIn = round ? Math.max(0, round.endTs - (runtime?.nowSec ?? 0)) : null;

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
        <h6 className="hint">
          Smooth MVP behavior: betting locks at 27s, oracle resolves at 30s, next round opens immediately.
        </h6>
      </section>
    </div>
  );
}
