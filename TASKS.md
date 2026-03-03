# TASKS.md - Globe Protocol MVP

Last updated: 2026-03-03

## Status: G4_UI_GLOBE - Complete

### Completed
- [x] G1_CONTRACT - Escrow contract approved
- [x] G4_UI_GLOBE - Globe UI created with demo data
- [x] API seeded with 5 demo events (SF↔NYC, London↔Paris)

### In Progress
- [ ] G2_TESTNET_DEPLOY - Awaiting PRIVATE_KEY

### What We Have
1. **GlobeEscrow.sol** - Smart contract with pull-based withdrawal
2. **API** - Running on http://localhost:3001 with events
3. **UI** - 3D globe at ui/index.html

### What We Need
1. **PRIVATE_KEY** - For G2 deployment to Base Sepolia
2. **Testnet ETH + USDC** - To fund deployment

## Running the Globe

```bash
# Terminal 1: Start API
cd api && npm run dev

# Terminal 2: Serve UI  
npx serve ui

# Or open ui/index.html directly in browser
```

## Current Demo Data
- 5 transactions showing SF↔NYC and London↔Paris routes
- Arcs animate between agent locations
- Transaction feed in sidebar

## Milestone Gates

| Gate | Status | Notes |
|------|--------|-------|
| G1_CONTRACT | ✅ Complete | Approved |
| G2_TESTNET_DEPLOY | ⏳ Blocked | Need PRIVATE_KEY |
| G3_END_TO_END_CLI | ⏳ Blocked | Waiting on G2 |
| G4_UI_GLOBE | ✅ Complete | UI ready with demo |
