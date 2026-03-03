# TASKS.md - Globe Protocol MVP

Last updated: 2026-03-03

## Status: G3_END_TO_END_CLI - In Progress

### Completed
- [x] G1_CONTRACT - Escrow contract approved
- [x] G4_UI_GLOBE - 3D Globe UI with Three.js
- [x] G3_CLI_SKELETON - Requester and Provider CLIs created

### In Progress
- [ ] G2_TESTNET_DEPLOY - Needs PRIVATE_KEY
- [ ] G3_END_TO_END_CLI - CLI simulation working

### What's Ready
1. **GlobeEscrow.sol** - Smart contract (Foundry)
2. **API** - Running on :3001 with 10 seeded events
3. **UI** - 3D globe at ui/index.html
4. **CLI** - `npx tsx cli/requester.ts simulate`

### Running the Demo
```bash
# Terminal 1: API
cd api && npm run dev

# Terminal 2: CLI simulation
npx tsx cli/requester.ts simulate

# Browser: Globe UI
open ui/index.html
```

### Milestone Gates

| Gate | Status | Notes |
|------|--------|-------|
| G1_CONTRACT | ✅ Complete | Approved |
| G2_TESTNET_DEPLOY | ⏳ Blocked | Need PRIVATE_KEY |
| G3_END_TO_END_CLI | 🔄 In Progress | CLI demo working |
| G4_UI_GLOBE | ✅ Complete | 10 events showing |
