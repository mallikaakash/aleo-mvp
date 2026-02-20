import { NextRequest, NextResponse } from "next/server";
import { PROGRAM_ID } from "@/lib/wallet/constants";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const EXPLORER = "https://api.explorer.provable.com/v1";
const NETWORK = "testnet";

function parseU64(value: string | null) {
  if (!value) return 0;
  const stripped = value.replace(/^"|"$/g, "").replace("u64", "");
  const parsed = Number(stripped);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseBool(value: string | null) {
  if (!value) return false;
  const stripped = value.replace(/^"|"$/g, "").trim();
  return stripped === "true";
}

function parseStatusU8(value: string | null) {
  if (!value) return 3;
  const stripped = value.replace(/^"|"$/g, "").replace("u8", "");
  const parsed = Number(stripped);
  return Number.isFinite(parsed) ? parsed : 3;
}

function statusName(statusCode: number): "OPEN" | "CLOSED" | "RESOLVED" | "VOID" {
  if (statusCode === 0) return "OPEN";
  if (statusCode === 1) return "CLOSED";
  if (statusCode === 2) return "RESOLVED";
  return "VOID";
}

async function queryMapping(mapping: string, key: string) {
  const url = `${EXPLORER}/${NETWORK}/program/${PROGRAM_ID}/mapping/${mapping}/${encodeURIComponent(key)}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;
  return response.text();
}

export async function GET(request: NextRequest) {
  const marketId = Number(request.nextUrl.searchParams.get("marketId") ?? "0");
  const address = request.nextUrl.searchParams.get("address") ?? "";
  const sideYes = request.nextUrl.searchParams.get("sideYes") === "true";

  if (!Number.isFinite(marketId) || marketId <= 0) {
    return NextResponse.json({ ok: false, error: "Missing/invalid marketId" }, { status: 400 });
  }

  const marketKey = `${marketId}u64`;
  const [yesRaw, noRaw, outcomeRaw, statusRaw] = await Promise.all([
    queryMapping("yes_total_public", marketKey),
    queryMapping("no_total_public", marketKey),
    queryMapping("outcome_yes", marketKey),
    queryMapping("market_status", marketKey),
  ]);

  let userAmount = 0;
  let userClaimed = false;
  if (address) {
    const positionKey = `{ market_id: ${marketId}u64, bettor: ${address}, side_yes: ${sideYes} }`;
    const [amountRaw, claimedRaw] = await Promise.all([
      queryMapping("position_amount", positionKey),
      queryMapping("position_claimed", positionKey),
    ]);
    userAmount = parseU64(amountRaw);
    userClaimed = parseBool(claimedRaw);
  }

  const statusCode = parseStatusU8(statusRaw);
  return NextResponse.json(
    {
      ok: true,
      programId: PROGRAM_ID,
      marketId,
      yesTotal: parseU64(yesRaw),
      noTotal: parseU64(noRaw),
      outcomeYes: parseBool(outcomeRaw),
      statusCode,
      statusName: statusName(statusCode),
      userAmount,
      userClaimed,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    },
  );
}
