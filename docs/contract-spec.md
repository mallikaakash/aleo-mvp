# Flash Markets Contract Spec (MVP Freeze)

## Program

- Program ID target: `flash_markets.aleo` (update if taken on deploy).
- Contract root: `contracts/flash_markets`.
- Network target: Aleo testnet.

## Market Parameters (Frozen for MVP)

- Round length: `30s`
- Close buffer: `3s`
- Betting window: `t=0` to `t=27`
- Resolve point: `t=30`
- Min bet: `1` credit
- Max bet: unlimited
- Fee: configurable, default `0 bps` for demo simplicity
- Price source: Coinbase spot BTC/USD

## Privacy Model

- Private during `OPEN`:
  - individual bet size
  - individual side
  - running side totals
- Public after `RESOLVED`:
  - yes total
  - no total
  - winning side
  - sentiment index
- Permanently private:
  - user bet records
  - user payout records

## Trusted MVP Assumptions

- Admin/deployer wallet controls:
  - `create_round`
  - `close_round`
  - `resolve_round`
  - `void_round`
- Oracle is centralized for MVP and must be disclosed in submission.
- Continuous rounds are driven by backend oracle script, not on-chain cron.

## State Model

### Public mappings

- `active_market_id: u64` (singleton-style mapping via fixed key)
- `market_status: u64 => u8` (0 OPEN, 1 CLOSED, 2 RESOLVED, 3 VOID)
- `start_ts: u64 => u64`
- `end_ts: u64 => u64`
- `close_ts: u64 => u64`
- `start_price_e8: u64 => u64`
- `end_price_e8: u64 => u64`
- `outcome_yes: u64 => bool`
- `yes_total_public: u64 => u64`
- `no_total_public: u64 => u64`
- `sentiment_bps: u64 => i32` (-10000..10000)

### Private records

- `Bet`:
  - `owner: address`
  - `market_id: u64`
  - `side_yes: bool`
  - `amount: u64`
  - `claimed: bool`

## Transition Interface (Frozen)

- `initialize_admin(admin: address) -> Future`
- `create_round(start_ts: u64, end_ts: u64, close_ts: u64, start_price_e8: u64) -> Future`
- `place_bet(market_id: u64, side_yes: bool, amount: u64) -> Bet`
- `close_round(market_id: u64) -> Future`
- `resolve_round(market_id: u64, end_price_e8: u64) -> Future`
- `void_round(market_id: u64) -> Future`
- `claim_reward(bet: Bet) -> (u64, Bet)` (payout amount + claimed record)

## Resolution Rules

- If `end_price_e8 > start_price_e8` => YES wins.
- Else => NO wins (including equal price).
- Sentiment:
  - `((yes - no) * 10000) / (yes + no)`, bounded to `[-10000, 10000]`.

## Void/Failure Rules

- Oracle retries up to 3 times over 10 seconds.
- If all retries fail, set market `VOID`.
- In `VOID`, users reclaim principal using `claim_reward` path that returns full stake.

## Security Invariants

- No betting after `close_ts`.
- Single active round at a time.
- Cannot resolve before `end_ts`.
- Bet can be claimed once only.
- Only admin may mutate market lifecycle states.

