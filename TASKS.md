# TASKS.md - Globe Protocol MVP

Last updated: 2026-03-03 03:46 AM

## Milestone Gates

| Gate | Status | Notes |
|------|--------|-------|
| G1_CONTRACT | ✅ Complete | Escrow contract approved |
| G2_TESTNET_DEPLOY | ⏳ Blocked | Need PRIVATE_KEY in contracts/.env |
| G3_END_TO_END_CLI | ⏳ Blocked | Waiting on G2 |
| G4_UI_GLOBE | ✅ Complete | Demo at ui/index.html |

## What Works

### Globe UI (G4) — RUNNING
```bash
open ui/index.html
# or npx serve ui
```
- 3D rotating globe
- 5 demo agents: SF, NYC, London, Paris, Tokyo
- Animated trade arcs
- Reputation halos
- Events panel

### API (G3) — Scaffold
```bash
cd api && npm run dev
```
- Routes: /agents, /services, /offers, /escrows, /events, /reputation
- SQLite DB
- Needs contract address

### Contract (G1) — Deployed Ready
```bash
cd contracts
# Add PRIVATE_KEY to .env
forge script script/Deploy.s.sol --rpc-url baseSepolia --broadcast
```

## Blocker: G2 Deployment

**To deploy:**
1. Get Base Sepolia testnet ETH + PRIVATE_KEY
2. Add to `contracts/.env`:
   ```
   PRIVATE_KEY=0x...
   ```
3. Run deploy

## Documentation
- `SPEC.md` - Full spec
- `HANDOFF.md` - Agent handoff
- `OVERNIGHT_PROGRESS.md` - 8-hour report
