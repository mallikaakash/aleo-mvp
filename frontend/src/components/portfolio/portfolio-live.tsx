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
    <div className="stack">
      {loading ? <h6 className="hint">Loading portfolio telemetry...</h6> : null}
      <div className="metric-row">
        <h6>Resolved Rounds Seen</h6>
        <h6>{resolvedCount}</h6>
      </div>
      <div className="metric-row">
        <h6>Bullish Outcomes</h6>
        <h6>{yesCount}</h6>
      </div>
      <div className="metric-row">
        <h6>Bearish Outcomes</h6>
        <h6>{noCount}</h6>
      </div>
      <h6 className="hint">
        Wallet record indexing is temporarily disabled in this build due a React/runtime conflict from
        third-party wallet hooks. Market telemetry remains live.
      </h6>

      <div className="table-list">
        {history.slice(0, 8).map((round, index) => (
          <article className="table-item" key={round.id}>
            <h6>Record #{index + 1}</h6>
            <h6>Round #{round.id}</h6>
            <h6>Status: {round.status}</h6>
            <h6>Outcome: {round.outcome ?? "-"}</h6>
            <h6>
              Price: ${round.startPrice.toLocaleString()} -&gt; ${round.endPrice?.toLocaleString() ?? "-"}
            </h6>
          </article>
        ))}
      </div>
    </div>
  );
}
