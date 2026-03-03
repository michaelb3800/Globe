# TASKS.md - Globe Protocol MVP

Last updated: 2026-03-02

## Status: G1_CONTRACT - Remediation PR Open

### Completed
- [x] T1.1 Escrow Contract implementation
- [x] Remediation PR #2 - Fixes applied:
  - Cancelled event
  - cancelMutual() function
  - Pull-based withdrawal (withdraw/withdrawRefund)
  - GRACE_PERIOD (24h)
- [x] 20 tests passing

### In Progress
- [ ] Fix remaining 4 edge case tests
- [ ] Agent A review of PR #2

### Next Steps (after approval)
- [ ] Merge PR #2
- [ ] T1.3 Deploy to Base Sepolia

## Milestone Gates

| Gate | Status | Notes |
|------|--------|-------|
| G1_CONTRACT | 🔄 In Remediation | PR #2 open |
| G2_TESTNET_DEPLOY | ⏳ Blocked | Waiting on G1 |
| G3_END_TO_END_CLI | ⏳ Blocked | Waiting on G2 |
| G4_UI_GLOBE | ⏳ Blocked | Waiting on G3 |

## Non-Negotiables (Frozen)
- ❌ No Phase 3 (Reputation Worker)
- ❌ No UI work
- ❌ No additional API expansion
- ✅ Only contract review + testnet deploy
