import { NextResponse } from "next/server";

const COINBASE_URL = "https://api.coinbase.com/v2/prices/BTC-USD/spot";

export async function GET() {
  try {
    const response = await fetch(COINBASE_URL, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: `Coinbase failed with ${response.status}` },
        { status: 502 },
      );
    }
    const payload = await response.json();
    const amount = Number(payload?.data?.amount ?? 0);
    return NextResponse.json({
      ok: true,
      symbol: "BTC-USD",
      source: "coinbase",
      amount,
      fetchedAt: Date.now(),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Spot fetch failed" }, { status: 500 });
  }
}
