import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";

export default function Home() {
  return (
    <AppShell>
      <section className="glass-card stack" style={{ padding: "1.8rem" }}>
        <h1>Aleo Flash Markets</h1>
        <h6>
          Private 30-second BTC signal rounds on Aleo. Hidden in-round orderflow, trust-minimized
          settlement, and clean signal visibility after resolution.
        </h6>
        <div className="grid-2">
          <div className="stack">
            <h6>Why this is different</h6>
            <h6>- Sealed betting while round is active</h6>
            <h6>- On-chain lifecycle: create, close, resolve</h6>
            <h6>- Live oracle-driven rounds from Coinbase spot feed</h6>
          </div>
          <div className="stack">
            <h6>Round profile</h6>
            <h6>- 30s round length</h6>
            <h6>- 3s close buffer</h6>
            <h6>- Continuous cycle for fast market rhythm</h6>
          </div>
        </div>
        <div className="wallet-row">
          <Link href="/trade" className="pressable-button">
            <h6>Enter Betting Area</h6>
          </Link>
          <Link href="/history" className="pressable-button muted">
            <h6>View Round History</h6>
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
