import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const rows = fs.readFileSync(envPath, "utf8").split("\n");
  for (const row of rows) {
    const trimmed = row.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [k, ...v] = trimmed.split("=");
    if (!process.env[k]) process.env[k] = v.join("=");
  }
}

const config = {
  mode: process.env.ORACLE_MODE ?? "leo-cli",
  spotUrl: process.env.COINBASE_SPOT_URL ?? "https://api.coinbase.com/v2/prices/BTC-USD/spot",
  roundLengthSec: Number(process.env.ROUND_LENGTH_SEC ?? "30"),
  closeBufferSec: Number(process.env.CLOSE_BUFFER_SEC ?? "3"),
  retryCount: Number(process.env.ORACLE_RETRY_COUNT ?? "3"),
  retryDelayMs: Number(process.env.ORACLE_RETRY_DELAY_MS ?? "3000"),
  deployerAddress: process.env.DEPLOYER_ADDRESS ?? "",
  privateKey: process.env.PRIVATE_KEY ?? "",
  programId: process.env.PROGRAM_ID ?? "flashmarketsam2.aleo",
  network: process.env.NETWORK ?? "testnet",
  endpoint: process.env.ENDPOINT ?? "https://api.explorer.provable.com/v1",
  nextRoundDelaySec: Number(process.env.NEXT_ROUND_DELAY_SEC ?? "1"),
  stateFile:
    process.env.ORACLE_STATE_FILE ??
    path.resolve(process.cwd(), "runtime", "state.json"),
};

let currentRound = null;
const history = [];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function persistState() {
  const dir = path.dirname(config.stateFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const payload = {
    source: "coinbase",
    lastUpdated: Date.now(),
    currentRound,
    history: history.slice(-100),
  };
  fs.writeFileSync(config.stateFile, JSON.stringify(payload, null, 2));
}

async function fetchBtcPrice() {
  const response = await fetch(config.spotUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`Coinbase request failed: ${response.status}`);
  const payload = await response.json();
  const amount = Number(payload?.data?.amount);
  if (!Number.isFinite(amount)) throw new Error("Unexpected Coinbase payload");
  return amount;
}

async function withOracleRetry() {
  let attempt = 0;
  while (attempt < config.retryCount) {
    try {
      return await fetchBtcPrice();
    } catch (error) {
      attempt += 1;
      if (attempt >= config.retryCount) throw error;
      await sleep(config.retryDelayMs);
    }
  }
  throw new Error("unreachable");
}

async function executeTransition(name, inputs) {
  if (config.mode === "leo-cli") {
    if (!config.privateKey) throw new Error("Missing PRIVATE_KEY for leo-cli mode");

    const args = [
      "execute",
      `${config.programId}/${name}`,
      ...inputs,
      "--broadcast",
      "--yes",
      "--private-key",
      config.privateKey,
      "--network",
      config.network,
      "--endpoint",
      config.endpoint,
      "--no-local",
    ];
    console.log(`[leo-cli] ${name}`, inputs);

    await new Promise((resolve, reject) => {
      const proc = spawn(path.resolve(process.env.HOME ?? "~", ".cargo", "bin", "leo"), args, {
        cwd: process.cwd(),
        stdio: "inherit",
      });
      proc.on("error", reject);
      proc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`leo execute failed: ${code}`));
      });
    });
    return;
  }

  throw new Error(`Unsupported ORACLE_MODE: ${config.mode}`);
}

async function createRound(startPrice) {
  const now = Math.floor(Date.now() / 1000);
  const round = {
    id: now,
    startTs: now,
    closeTs: now + config.roundLengthSec - config.closeBufferSec,
    endTs: now + config.roundLengthSec,
    startPrice,
    yesTotal: 0,
    noTotal: 0,
    sentimentBps: 0,
    status: "OPEN",
  };
  currentRound = round;
  await executeTransition("create_round", [
    `${round.id}u64`,
    `${round.startTs}u64`,
    `${round.endTs}u64`,
    `${round.closeTs}u64`,
    `${Math.round(round.startPrice * 1e8)}u64`,
  ]);
  persistState();
}

async function closeRound() {
  if (!currentRound || currentRound.status !== "OPEN") return;
  currentRound.status = "CLOSED";
  await executeTransition("close_round", [`${currentRound.id}u64`]);
  persistState();
}

async function resolveRound(price) {
  if (!currentRound) return;
  currentRound.status = "RESOLVED";
  currentRound.endPrice = price;
  currentRound.outcome = price > currentRound.startPrice ? "YES" : "NO";
  await executeTransition("resolve_round", [
    `${currentRound.id}u64`,
    `${Math.round(price * 1e8)}u64`,
  ]);
  history.unshift({ ...currentRound });
  persistState();
}

async function voidRound() {
  if (!currentRound) return;
  currentRound.status = "VOID";
  await executeTransition("void_round", [`${currentRound.id}u64`]);
  history.unshift({ ...currentRound });
  persistState();
}

async function tick() {
  const now = Math.floor(Date.now() / 1000);

  if (!currentRound) {
    const startPrice = await withOracleRetry();
    await createRound(startPrice);
    return;
  }

  if (currentRound.status === "OPEN" && now >= currentRound.closeTs) {
    await closeRound();
  }

  if (
    (currentRound.status === "CLOSED" || currentRound.status === "OPEN") &&
    now >= currentRound.endTs
  ) {
    try {
      const endPrice = await withOracleRetry();
      await resolveRound(endPrice);
      await sleep(config.nextRoundDelaySec * 1000);
      currentRound = null;
    } catch {
      await voidRound();
      await sleep(config.nextRoundDelaySec * 1000);
      currentRound = null;
    }
  }
}

async function run() {
  console.log("Aleo Flash Markets oracle loop started", config);
  persistState();
  while (true) {
    await tick();
    await sleep(1000);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
