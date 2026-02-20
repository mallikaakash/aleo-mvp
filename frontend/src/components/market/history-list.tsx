"use client";

import { useEffect, useState } from "react";

type HistoryRound = {
  id: number;
  startPrice: number;
  endPrice?: number;
  yesTotal?: number;
  noTotal?: number;
  sentimentBps?: number;
  outcome?: "YES" | "NO";
  status: "OPEN" | "CLOSED" | "RESOLVED" | "VOID";
};

type HistoryResponse = {
  ok: boolean;
  history: HistoryRound[];
};

export function HistoryList() {
  const [rows, setRows] = useState<HistoryRound[]>([]);

  useEffect(() => {
    let canceled = false;

    async function load() {
      const response = await fetch("/api/market/history", { cache: "no-store" });
      const payload = (await response.json()) as HistoryResponse;
      if (!canceled) setRows(payload.history ?? []);
    }

    load();
    const interval = setInterval(load, 3000);
    return () => {
      canceled = true;
      clearInterval(interval);
    };
  }, []);

  if (!rows.length) {
    return <h6 className="hint">No resolved rounds yet. Start the oracle loop to populate live history.</h6>;
  }

  return (
    <div className="table-list">
      {rows.map((round) => (
        <article className="table-item" key={round.id}>
          <h6>Round #{round.id}</h6>
          <h6>
            Outcome: {round.outcome ?? "-"} (${round.startPrice.toLocaleString()} -&gt; $
            {round.endPrice?.toLocaleString() ?? "-"})
          </h6>
          <h6>YES Pool: {round.yesTotal ?? 0} credits</h6>
          <h6>NO Pool: {round.noTotal ?? 0} credits</h6>
          <h6>Sentiment: {((round.sentimentBps ?? 0) / 100).toFixed(2)}%</h6>
          <h6>Status: {round.status}</h6>
        </article>
      ))}
    </div>
  );
}
