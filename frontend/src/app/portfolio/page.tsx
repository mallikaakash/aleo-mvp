import { AppShell } from "@/components/layout/app-shell";
import { PortfolioLiveEntry } from "@/components/portfolio/portfolio-live-entry";

export default function PortfolioPage() {
  return (
    <AppShell>
      <section className="glass-card stack" style={{ padding: "1.2rem" }}>
        <h1>Portfolio</h1>
        <h6>Live wallet records, no static mock portfolio data.</h6>
        <PortfolioLiveEntry />
      </section>
    </AppShell>
  );
}
