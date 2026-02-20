# Oracle Resolver Service (MVP)

This process coordinates continuous rounds:

1. Fetch BTC start price from Coinbase.
2. Create a round.
3. Close betting after the close buffer.
4. Resolve at round end with retry logic.
5. If all retries fail, mark round VOID.
6. Create the next round after a short delay.

## Quick start

```bash
cp .env.example .env
node round-loop.mjs
```

## Current mode

- `leo-cli` mode executes transitions through Leo CLI from `contracts/flash_markets`.
- Runtime state is persisted to `runtime/state.json` for frontend live reads.

## Oracle failure behavior

- Retry count: 3
- Retry spacing: 3 seconds
- Final fallback: `void_round`
