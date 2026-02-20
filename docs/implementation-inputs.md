# Implementation Inputs Tracker

## Provided in context

- Admin/deployer wallet address provided.
- Oracle provider chosen: Coinbase spot BTC/USD.
- Round params provided:
  - 30s round length
  - 3s close buffer
  - 1 credit minimum bet
- Wallet preference provided: Puzzle + Leo.

## Still required for full live deployment

- Admin private key handling strategy (local secure env, not in repo).
- Final contract program ID after deploy (if `flash_markets.aleo` is unavailable).
- Fee policy lock (`0 bps` or `100 bps`) for production launch.
- Public frontend deployment URL.
- Buildathon submission deadline and final media assets URL.

## Operational resources you need

- Faucet credits: `https://faucet.aleo.org/`
- Explorer checks:
  - `https://testnet.aleoscan.io/`
  - `https://testnet.explorer.provable.com/`
- Aleo docs:
  - `https://developer.aleo.org/`
  - `https://docs.leo-lang.org/`
