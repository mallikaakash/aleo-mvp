# Frontend - Aleo Flash Markets

## Stack

- Next.js App Router
- Tailwind CSS 4
- Aleo wallet adapters (`aleo-hooks`, `aleo-adapters`)

## Routes

- `/`: dashboard (active round + wallet + bet UX)
- `/history`: resolved rounds and sentiment
- `/portfolio`: claimable history summary
- `/api/spot`: Coinbase spot BTC/USD proxy

## Design system

- Monochrome palette (black, white, silver only)
- Tight glassmorphism panels
- White inset shadow buttons
- Typography: Josefin Sans (H1) and Roboto (H6/body)

## Wallet flow

- Adapter list: Puzzle + Leo
- Connect/disconnect controls
- Test transaction request path for signature + submission

## Run

```bash
npm install
npm run dev
```
