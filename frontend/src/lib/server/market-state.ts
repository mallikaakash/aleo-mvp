import fs from "node:fs";
import path from "node:path";

export type RuntimeRound = {
  id: number;
  startTs: number;
  closeTs: number;
  endTs: number;
  startPrice: number;
  endPrice?: number;
  yesTotal?: number;
  noTotal?: number;
  sentimentBps?: number;
  outcome?: "YES" | "NO";
  status: "OPEN" | "CLOSED" | "RESOLVED" | "VOID";
};

export type RuntimeState = {
  source: string;
  lastUpdated: number;
  currentRound: RuntimeRound | null;
  history: RuntimeRound[];
};

function runtimePath() {
  return path.resolve(process.cwd(), "..", "oracle", "runtime", "state.json");
}

export function readRuntimeState(): RuntimeState {
  const file = runtimePath();
  if (!fs.existsSync(file)) {
    return {
      source: "bootstrap",
      lastUpdated: Date.now(),
      currentRound: null,
      history: [],
    };
  }

  const payload = JSON.parse(fs.readFileSync(file, "utf8")) as RuntimeState;
  return {
    source: payload.source ?? "unknown",
    lastUpdated: payload.lastUpdated ?? Date.now(),
    currentRound: payload.currentRound ?? null,
    history: payload.history ?? [],
  };
}
