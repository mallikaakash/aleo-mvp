"use client";

import { useMemo } from "react";
import { useAccount, useRecords } from "aleo-hooks";

type CreditsRecord = {
  id?: string;
  microcredits?: string | number;
  amount?: string | number;
};

function toCredits(value: unknown) {
  if (value === null || value === undefined) return 0;
  const numeric =
    typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(numeric)) return 0;
  return numeric / 1_000_000;
}

export function PortfolioLive() {
  const { connected, publicKey } = useAccount();
  const { records, loading, error } = useRecords({ program: "credits.aleo", enabled: connected });

  const stats = useMemo(() => {
    const list = (records ?? []) as CreditsRecord[];
    const total = list.reduce((sum, record) => {
      return sum + toCredits(record.microcredits ?? record.amount);
    }, 0);
    return { count: list.length, total: Number(total.toFixed(6)), list };
  }, [records]);

  if (!connected) {
    return <h6 className="hint">Connect wallet to load real private record portfolio data.</h6>;
  }

  if (loading) return <h6 className="hint">Loading private records from wallet...</h6>;
  if (error) return <h6 className="hint">Wallet record fetch failed: {error.message}</h6>;

  return (
    <div className="stack">
      <div className="metric-row">
        <h6>Wallet</h6>
        <h6>{publicKey}</h6>
      </div>
      <div className="metric-row">
        <h6>credits.aleo Records</h6>
        <h6>{stats.count}</h6>
      </div>
      <div className="metric-row">
        <h6>Estimated Private Credits</h6>
        <h6>{stats.total}</h6>
      </div>

      <div className="table-list">
        {stats.list.slice(0, 8).map((record, index) => (
          <article className="table-item" key={record.id ?? `record-${index}`}>
            <h6>Record #{index + 1}</h6>
            <h6>Microcredits: {String(record.microcredits ?? record.amount ?? "0")}</h6>
          </article>
        ))}
      </div>
    </div>
  );
}
