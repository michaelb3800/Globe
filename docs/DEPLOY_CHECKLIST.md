# DEPLOY_CHECKLIST.md - Globe Protocol Deployment Readiness

**Last Updated:** 2026-03-03

## Pre-Deployment Gates

- [ ] **G1_CONTRACT** - Contract approved and tests passing
- [ ] **G2_TESTNET_DEPLOY** - Private key available, testnet ETH confirmed
- [ ] **G3_END_TO_END_CLI** - API running, contract address configured
- [ ] **G4_UI_GLOBE** - UI functional with real data

---

## Deployment Checklist

### 1. Environment Setup

- [ ] `PRIVATE_KEY` set in `contracts/.env`
- [ ] `BASE_SEPOLIA_RPC_URL` configured (optional, uses default)
- [ ] `ETHERSCAN_API_KEY` set for verification (optional)
- [ ] Testnet ETH balance confirmed (>0.01 ETH)

### 2. Contract Deployment (G2)

- [ ] Run: `cd contracts && forge install`
- [ ] Run: `forge build`
- [ ] Run: `forge test`
- [ ] Run: `forge script script/Deploy.s.sol --rpc-url baseSepolia --broadcast --verify`
- [ ] **Capture output:**
  - [ ] Contract address
  - [ ] Transaction hash
  - [ ] Block number

### 3. API Configuration (G3)

- [ ] Update `api/.env` with `CONTRACT_ADDRESS`
- [ ] Update `api/.env` with `PRIVATE_KEY` (for signing transactions)
- [ ] Run: `cd api && npm install`
- [ ] Run: `npm run dev`
- [ ] Verify API health: `curl http://localhost:3000/health`

### 4. UI Integration (G4)

- [ ] Update `ui/index.html` or config with `API_URL`
- [ ] Run: `cd ui && npm install`
- [ ] Run: `npm run dev`
- [ ] Verify globe loads and connects to API

### 5. End-to-End Verification

- [ ] Register Agent A (Alice) via API
- [ ] Register Agent B (Bob) via API
- [ ] Create service listing
- [ ] Create escrow (initiated by Agent A)
- [ ] Fund escrow (simulated)
- [ ] Deliver artifact (simulated)
- [ ] Verify and release
- [ ] Withdraw funds (simulated)
- [ ] **Verify globe shows trade arc**

---

## Demo Proof Requirements (DEMO_PROOF.md)

After successful E2E test, document:

1. **Transaction Log**
   - Escrow creation tx hash
   - Fund tx hash
   - Release tx hash
   - Withdraw tx hash

2. **Screenshots**
   - Globe with trade arc visible
   - Events panel showing lifecycle
   - API response payloads

3. **Timestamps**
   - Start time
   - End time
   - Total duration

4. **Network**
   - RPC endpoint used
   - Block explorer links

---

## Rollback Plan

If deployment fails:

1. **Contract Issue:**
   - Do NOT retry immediately
   - Analyze failure in local testing
   - Fix and redeploy (new address)

2. **API Issue:**
   - Check logs: `npm run dev` output
   - Verify CONTRACT_ADDRESS in .env
   - Restart API

3. **UI Issue:**
   - Check browser console for CORS/API errors
   - Verify API_URL points to correct endpoint

---

## Security Checklist

- [ ] Private key has limited funds (testnet only)
- [ ] No mainnet keys in .env
- [ ] .env is in .gitignore
- [ ] Contract verified on Block Explorer (recommended)

---

## Approval Template

```
## Deploy Approval

**Date:** YYYY-MM-DD
**Gate:** G2_TESTNET_DEPLOY
**Contract:** 0x...
**Deployer:** [Agent Name]

### Sign-off
- [ ] Tests passing locally
- [ ] Private key confirmed secure
- [ ] Rollback plan reviewed

**APPROVED:** YES / NO
```
