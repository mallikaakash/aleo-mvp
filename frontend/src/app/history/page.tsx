import { AppShell } from "@/components/layout/app-shell";
import { HistoryList } from "@/components/market/history-list";

export default function HistoryPage() {
  return (
    <AppShell>
      <section className="glass-card stack" style={{ padding: "1.2rem" }}>
        <h1>Resolved Rounds</h1>
        <h6>Aggregate pools and sentiment only; individual bets remain private.</h6>
        <HistoryList />
      </section>
    </AppShell>
  );
}
