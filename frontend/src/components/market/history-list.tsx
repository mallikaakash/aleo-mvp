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
    return (
      <p className="text-sm text-white/60">
        No resolved rounds yet. Start the oracle loop to populate live history.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((round) => (
        <div
          key={round.id}
          className="backdrop-blur-md bg-white/5 border border-white/15 rounded-xl p-4 hover:bg-white/10 transition-colors"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            <p className="font-semibold">Round #{round.id}</p>
            <span
              className={`inline-flex items-center rounded-full px-2 py-[2px] text-[0.65rem] ${round.status === "RESOLVED"
                  ? "bg-[#75bfcf]/15 border border-[#75bfcf]/60 text-[#75bfcf]"
                  : "bg-white/10 border border-white/20 text-white/70"
                }`}
            >
              {round.status}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-white/80">
            <div>
              <p className="text-xs text-white/50 uppercase tracking-wide">Outcome</p>
              <p className="font-medium">{round.outcome ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs text-white/50 uppercase tracking-wide">Price Range</p>
              <p className="font-mono">
                ${round.startPrice.toLocaleString()} → ${round.endPrice?.toLocaleString() ?? "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/50 uppercase tracking-wide">YES Pool</p>
              <p className="font-mono">{round.yesTotal ?? 0} credits</p>
            </div>
            <div>
              <p className="text-xs text-white/50 uppercase tracking-wide">Sentiment</p>
              <p className="font-mono">{((round.sentimentBps ?? 0) / 100).toFixed(2)}%</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
