# Buildathon Submission Pack

## Architecture summary

- Frontend (`Next.js`): user interaction, wallet connect, market screens, oracle spot display.
- Contract (`Leo`): round lifecycle, bet records, aggregate result publishing.
- Oracle service (`Node`): trusted resolver for create/close/resolve and void fallback.

## Trust assumptions (explicit)

- Oracle and admin are centralized for MVP.
- Oracle price source is single-provider (Coinbase).
- Lifecycle transitions are admin-gated.

## Risk disclosure

- Oracle outage can delay/void rounds.
- Final settlement depends on credits escrow integration completion.
- Browser wallet support varies by extension readiness and permissions.

## Judge-facing novelty statement

Aleo Flash Markets is a privacy-native micro-horizon prediction primitive where sealed orderflow prevents copy-trading reflexivity during the active window, then reveals only aggregate signal after resolution.

## Demo script (2-3 minutes)

1. Open app and connect Puzzle/Leo wallet.
2. Show active round timer and hidden liquidity state.
3. Select YES or NO and submit a test transaction.
4. Show betting lock at close buffer point.
5. Show round resolution and resulting outcome.
6. Open history and display aggregate pools + sentiment.
7. Open portfolio and show claimable entries.
8. Close with trust assumptions and roadmap to decentralized oracle.

## Submission checklist

- [ ] Program deployed to Aleo testnet.
- [ ] Explorer links added for deploy and execution txs.
- [ ] Frontend live URL included.
- [ ] README completed with setup and assumptions.
- [ ] Demo video uploaded and publicly visible.
- [ ] Repo includes open-source license and clear architecture notes.
