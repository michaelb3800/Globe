# TASKS.md - Globe Protocol MVP

Last updated: 2026-03-03

## Status: ALL GATES READY FOR TESTING

### Completed
- [x] G1_CONTRACT - Escrow contract approved
- [x] G4_UI_GLOBE - 3D Globe UI with Three.js
- [x] G3_END_TO_END_CLI - Working E2E CLI simulation
- [x] G2_TESTNET_DEPLOY - Scripts ready (needs PRIVATE_KEY for live deploy)

### What's Ready to Test

1. **CLI + API E2E** - ✅ WORKING
   ```bash
   cd api && npm run dev  # Already running on :3001
   npx tsx cli/requester.ts simulate
   ```

2. **Globe UI** - ✅ WORKING
   ```
   Open ui/index.html in browser
   Shows 10 seeded events with arcs
   ```

3. **Contract Deployment** - Needs PRIVATE_KEY
   ```bash
   cd contracts
   echo "PRIVATE_KEY=0x..." > .env
   npm run deploy:base-sepolia
   ```

### Demo Endpoints (No Signature Required)
- POST /agents/register-demo
- POST /services/demo

### Running the Full Demo

```bash
# Terminal 1: API (already running)
cd api && npm run dev

# Terminal 2: CLI Simulation
npx tsx cli/requester.ts simulate

# Browser: Globe UI
open ui/index.html
```

### Milestone Gates

| Gate | Status | Notes |
|------|--------|-------|
| G1_CONTRACT | ✅ Complete | Approved |
| G2_TESTNET_DEPLOY | ⏳ Ready | Needs PRIVATE_KEY for live deploy |
| G3_END_TO_END_CLI | ✅ Complete | Working with API |
| G4_UI_GLOBE | ✅ Complete | 10 events, arcs visible |
