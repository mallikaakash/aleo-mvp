import { NextResponse } from "next/server";
import { readRuntimeState } from "@/lib/server/market-state";

export async function GET() {
  const runtime = readRuntimeState();
  return NextResponse.json({
    ok: true,
    source: runtime.source,
    lastUpdated: runtime.lastUpdated,
    history: runtime.history,
  });
}
