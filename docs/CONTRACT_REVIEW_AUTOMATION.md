# Contract Review Automation

## Overview

This document defines the formal checklist and approval steps required before deploying any GlobeEscrow contract to mainnet or testnet.

---

## Pre-Deploy Checklist

### G1_CONTRACT Validation

| # | Check | Required | Automated |
|---|-------|----------|-----------|
| 1 | State enum matches spec: `Created, Funded, Delivered, Verified, Released, Disputed, Refunded, Cancelled` | ✅ | ❌ |
| 2 | All 8 events emit with correct params (see below) | ✅ | ✅ |
| 3 | ReentrancyGuard on all state-changing functions | ✅ | ❌ |
| 4 | Pull-based withdrawal (no `transfer()` in happy path) | ✅ | ❌ |
| 5 | Timeout refund: deadline + grace period logic | ✅ | ✅ |
| 6 | Mutual cancel: before funding | ✅ | ✅ |
| 7 | Access control: payer functions | ✅ | ✅ |
| 8 | Access control: payee functions | ✅ | ✅ |
| 9 | Double-withdraw protection | ✅ | ✅ |
| 10 | No `.call()` with unspecified gas | ✅ | ❌ |
| 11 | Solidity 0.8+ (overflow safe) | ✅ | ✅ |
| 12 | All tests pass | ✅ | ✅ |

### Event Validation (Exact Match Required)

| Event | Parameters |
|-------|------------|
| EscrowCreated | `bytes32 indexed id, address payer, address payee, uint256 amount, uint256 deadline` |
| Funded | `bytes32 indexed id, uint256 amount` |
| Delivered | `bytes32 indexed id, bytes32 artifactHash` |
| Verified | `bytes32 indexed id` |
| Released | `bytes32 indexed id, uint256 amount` |
| Disputed | `bytes32 indexed id, string reason` |
| Refunded | `bytes32 indexed id, uint256 amount` |
| Cancelled | `bytes32 indexed id` |

---

## Approval Workflow

```
┌─────────────┐
│  Developer  │
│  opens PR   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  CI Checks  │ ──▶ lint, test, coverage
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Agent A     │ ──▶ Contract Review
│ (Reviewer)  │     - Check against spec
└──────┬──────┘     - Validate events
       │          - Security checklist
       ▼
┌─────────────┐
│  PASS/FAIL  │
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
   ▼       ▼
 FAIL    APPROVE
         │
         ▼
    ┌────────┐
    │ Deploy │
    │ to     │
    │ testnet│
    └────────┘
```

---

## Required Artifacts in PR

1. **Contract Source** - All `.sol` files
2. **Test Results** - Output showing all tests pass
3. **Coverage Report** - If available
4. **Event Diff** - Comparing emitted events to spec
5. **Security Notes** - Any security considerations

---

## Reviewer (Agent A) Actions

### On PR Received

1. **Run Event Validator**
   ```bash
   npx hardhat test test/GlobeEscrow.ts
   npm run validate:events
   ```

2. **Apply Checklist**
   - Mark each item ✅ or ❌
   - Add comments for any issues

3. **Check Security**
   - Reentrancy guard present?
   - Access control correct?
   - No unsafe transfers?

4. **Decision**
   - **APPROVE:** All checks pass → Merge allowed
   - **REQUEST CHANGES:** Issues found → Return to developer
   - **BLOCK:** Critical security issue → Require fix before further work

---

## Automated Validation Commands

### Run Full Validation
```bash
# Compile
npx hardhat compile

# Run tests
npx hardhat test

# Validate events against spec
npm run validate:events
```

### Manual Event Check
```bash
# Deploy to local
npx hardhat node

# Run test that emits all events
npx hardhat test test/GlobeEscrow.ts --grep "emits all events"
```

---

## CI Integration

Update `.github/workflows/ci.yml` to include:

```yaml
- name: Validate Event Schema
  run: |
    npx hardhat compile
    npx hardhat test test/GlobeEscrow.ts
    # Custom validation script
    node scripts/validateEvents.js
```

---

## Deployment Approval

| Network | Approver | Required Sign-offs |
|---------|----------|-------------------|
| Local/Fork | Developer | None |
| Base Sepolia (Testnet) | Agent A | 1 |
| Base (Mainnet) | Agent A + Founder | 2 |

---

## Post-Deploy Verification

After deployment, verify:

1. ✅ Contract verified on explorer
2. ✅ Constructor args correct
3. ✅ Events indexed correctly
4. ✅ Can create escrow
5. ✅ Can fund escrow
6. ✅ Can complete full flow

---

## Rollback Plan

If deploy fails or vulnerability found:

1. Do NOT verify source on explorer yet
2. If verified and vulnerable:
   - Alert community
   - Document in `docs/INCIDENTS.md`
   - Deploy fixed version to new address
3. Never upgrade to vulnerable version

---

## Approval Template

```
## Contract Review - [PR #X]

### Checklist
- [ ] State enum correct
- [ ] All 8 events present
- [ ] Reentrancy guard
- [ ] Pull withdrawal
- [ ] Tests pass
- [ ] No security issues

### Security Assessment
[Notes on security posture]

### Decision
[ ] APPROVE - Merge allowed
[ ] REQUEST CHANGES - Issues found
[ ] BLOCK - Critical issue

### Comments
[Reviewer notes]
```
