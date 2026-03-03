# TASKS.md - Globe Protocol MVP

Last updated: 2026-03-03 09:21 AM

## Milestone Gates

| Gate | Status | Notes |
|------|--------|-------|
| G1_CONTRACT | ✅ Complete | Escrow contract approved |
| G2_TESTNET_DEPLOY | ⏳ Blocked | Need PRIVATE_KEY in contracts/.env |
| G3_END_TO_END_CLI | ⏳ Blocked | Waiting on G2 |
| G4_UI_GLOBE | ✅ Complete | Demo at ui/index.html |

## Agent A Tasks (Assigned 2026-03-03)

| Task | Status | Notes |
|------|--------|-------|
| A-T1: Review PR #2 and issue Gate decision | ✅ Complete | PR #2 already merged |
| A-T2: Add no-auto-transfer regression tests | ✅ Complete | PullWithdrawalRegression.t.sol exists |
| A-T3: Lock event schema in CI | ✅ Complete | EventSchemaValidator runs in CI |
| A-T4: State machine invariant suite | ✅ Complete | Invariant tests updated with boundary tests |
| A-T5: Deployment readiness checklist | ✅ Complete | docs/DEPLOY_CHECKLIST.md created |

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
