"use client";

import { useEffect, useMemo, useState } from "react";

type HistoryRound = {
  id: number;
  status: "OPEN" | "CLOSED" | "RESOLVED" | "VOID";
  outcome?: "YES" | "NO";
  startPrice: number;
  endPrice?: number;
};

export function PortfolioLive() {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<HistoryRound[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const response = await fetch("/api/market/history", { cache: "no-store" });
      const payload = (await response.json()) as { history?: HistoryRound[] };
      if (!cancelled) {
        setHistory(payload.history ?? []);
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const resolvedCount = useMemo(
    () => history.filter((round) => round.status === "RESOLVED").length,
    [history],
  );
  const yesCount = useMemo(() => history.filter((round) => round.outcome === "YES").length, [history]);
  const noCount = useMemo(() => history.filter((round) => round.outcome === "NO").length, [history]);

  return (
    <div className="space-y-4">
      {loading ? <p className="text-sm text-white/60">Loading portfolio telemetry...</p> : null}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="backdrop-blur-md bg-white/5 border border-white/15 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-white/60">Resolved Rounds</p>
          <p className="text-2xl font-semibold">{resolvedCount}</p>
        </div>
        <div className="backdrop-blur-md bg-white/5 border border-white/15 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-white/60">Bullish Outcomes</p>
          <p className="text-2xl font-semibold text-[#75bfcf]">{yesCount}</p>
        </div>
        <div className="backdrop-blur-md bg-white/5 border border-white/15 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-white/60">Bearish Outcomes</p>
          <p className="text-2xl font-semibold text-orange-400">{noCount}</p>
        </div>
      </div>

      <p className="text-xs text-white/50">
        Wallet record indexing is temporarily disabled in this build due a React/runtime conflict from
        third-party wallet hooks. Market telemetry remains live.
      </p>

      {/* Recent rounds */}
      <div className="space-y-3">
        {history.slice(0, 8).map((round, index) => (
          <div
            key={round.id}
            className="backdrop-blur-md bg-white/5 border border-white/15 rounded-xl p-4 hover:bg-white/10 transition-colors"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-white/50 uppercase tracking-wide">Record</p>
                <p className="font-medium">#{index + 1} · Round #{round.id}</p>
              </div>
              <div>
                <p className="text-xs text-white/50 uppercase tracking-wide">Status</p>
                <p className="font-medium">{round.status}</p>
              </div>
              <div>
                <p className="text-xs text-white/50 uppercase tracking-wide">Outcome</p>
                <p className="font-medium">{round.outcome ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-white/50 uppercase tracking-wide">Price</p>
                <p className="font-mono">
                  ${round.startPrice.toLocaleString()} → ${round.endPrice?.toLocaleString() ?? "-"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
