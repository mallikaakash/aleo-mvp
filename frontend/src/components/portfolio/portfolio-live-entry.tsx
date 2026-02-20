"use client";

import dynamic from "next/dynamic";

const PortfolioPanel = dynamic(
  () => import("@/components/portfolio/portfolio-panel").then((m) => m.PortfolioPanel),
  { ssr: false },
);

export function PortfolioLiveEntry() {
  return <PortfolioPanel />;
}
