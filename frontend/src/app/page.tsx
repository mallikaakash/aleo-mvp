import { AppShell } from "@/components/layout/app-shell";
import { MarketDashboard } from "@/components/market/dashboard";

export default function Home() {
  return (
    <AppShell>
      <MarketDashboard />
    </AppShell>
  );
}
