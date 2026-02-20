# flash_markets.aleo

MVP Leo program for Aleo Flash Markets.

## Scope

- Admin-gated market lifecycle transitions
- Bet record issuance
- Public market metadata for resolved rounds
- Claim transition skeleton

## Local workflow

```bash
leo clean
leo build
leo test
```

## Next implementation steps

1. Add credits integration for stake transfer and payouts.
2. Replace placeholder claim math with finalized pari-mutuel logic.
3. Add void/refund path tests.
4. Add admin address rotation and pause controls.
