# Aleo Flash Markets

Private 30-second BTC signal auctions on Aleo, with hidden in-round orderflow and post-resolution aggregate reveal.

## Why this is competitive

- Uses Aleo where privacy is product-critical, not optional.
- Solves public prediction market copy-trading leakage for short windows.
- Shows full lifecycle: connect wallet, place bet, resolve, claim, sentiment output.
- Keeps MVP trust assumptions explicit (centralized oracle/admin controls).

## Repository map

- `contracts/flash_markets`: Leo program skeleton and transition interface.
- `frontend`: Next.js app with dashboard/history/portfolio and wallet flow.
- `oracle`: round orchestrator script with Coinbase price source and retry/void fallback.
- `docs/contract-spec.md`: frozen MVP primitives and invariants.
- `docs/submission-pack.md`: buildathon checklist, risks, and demo narrative.

## Requirements for local execution

- Node.js 20+ (22 recommended).
- Leo CLI installed for contract compilation/deploy.
- Aleo testnet wallet address.
- Faucet credits from `https://faucet.aleo.org/`.

## What is already implemented

- Monochrome glass UI system (black/white/silver, no color gradients).
- Responsive pages:
  - `/` dashboard
  - `/history`
  - `/portfolio`
- Wallet adapter integration path (Puzzle + Leo).
- Transaction request wiring in UI for wallet signing flow.
- Spot endpoint proxy in frontend (`/api/spot`) using Coinbase.
- Live market runtime feed:
  - oracle writes `oracle/runtime/state.json`
  - frontend reads live state via `/api/market/active` and `/api/market/history`
- Oracle loop script with:
  - round create/close/resolve cycle
  - 3 retries, then void round fallback
  - immediate next round handoff
- Leo contract bootstrap with core transitions and state mappings.

## What you still need to add before final deploy

- Live transition execution in `oracle/round-loop.mjs` (`executeTransition` placeholder).
- Final escrow/payout integration with Aleo credits transfer primitives.
- End-to-end tests on a local devnet/testnet.
- Explorer links after deployment for submission.

## Core parameters (from inputs)

- Admin wallet: `aleo1774u9274sm7h95nr4dwpsgn2l27amjldntkustcav2xf0jx6evrqxmtzdt`
- Round length: `30s`
- Close buffer: `3s`
- Min bet: `1 credit`
- Oracle source: Coinbase spot BTC/USD
- Retry model: 3 retries over 10s total, else `VOID`

## Run quickstart

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Oracle loop (dry run)

```bash
cd oracle
cp .env.example .env
npm start
```

### Leo contract

```bash
cd contracts/flash_markets
leo build
```

## References

- Aleo quickstart: `https://developer.aleo.org/guides/introduction/quick_start/`
- Leo program model: `https://docs.leo-lang.org/language/programs`
- Provable SDK: `https://developer.aleo.org/sdk/overview`
- Program execution: `https://developer.aleo.org/sdk/guides/execute_programs`
- Wallet adapter docs: `https://docs.leo.app/`
