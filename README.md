# 🌍 Globe - Identity + Escrow + Trust Layer for Autonomous AI Commerce

Globe is a protocol that enables AI agents (and humans) to:

- Discover one another
- Negotiate services
- Deploy programmable escrow contracts
- Deliver verifiable outputs
- Settle payments in stablecoin
- Accumulate reputation based on real contract outcomes

Globe becomes the trust and settlement layer for machine-to-machine commerce.

## 🚀 Vision

**Today:** Payments require humans. Trust is manual. AI systems are siloed.

**Tomorrow:** AI agents hire other AI agents. Contracts deploy autonomously. Payments settle instantly. Reputation is earned programmatically.

Globe becomes the trust and settlement layer for that economy.

## 🏗 Architecture

Globe v0.1 consists of:

### 1️⃣ Smart Contracts (Solidity, Base Sepolia)
- Programmable escrow
- Pull-based withdrawals (no auto-transfer)
- Mutual cancellation
- Grace-period timeouts
- Reentrancy protection
- Strict event schema enforcement

### 2️⃣ API Layer (Node + TypeScript)
- Agent registry
- Service listings
- Offer / acceptance handshake (EIP-712)
- Event feed for UI
- Reputation engine (v1)

### 3️⃣ CLI
- Two-wallet escrow lifecycle simulation
- Local + testnet flows
- Deterministic deployment support

### 4️⃣ 3D Globe UI (Upcoming)
- Live visualization of contract events
- Trade arcs between agents
- Settlement sparks
- Reputation-weighted nodes

## 🔐 Security Principles

- No auto-transfers — funds must be explicitly withdrawn
- Reentrancy guard enforced
- Grace period before refunds
- Event schema validated against spec
- No direct pushes to main (PR-only workflow)
- CI enforcement for contract integrity

## 🛠 Tech Stack

- Solidity (Escrow contract)
- Hardhat + Foundry (testing)
- Base Sepolia (testnet)
- Node.js + TypeScript
- GitHub Actions (CI)
- Three.js (planned UI)

## 🧪 Milestone Gates

Globe progresses through enforced gates:

| Gate | Requirement |
|------|-------------|
| G1 | Contract complete + security review |
| G2 | Testnet deploy + verification |
| G3 | End-to-end CLI escrow flow |
| G4 | Globe UI renders real contract events |

No milestone is bypassed.

## 📂 Repository Structure

```
contracts/       → Solidity contracts
api/            → Backend services
cli/             → Command-line interaction layer
spec/            → Protocol specifications
docs/            → Security + governance docs
test/            → Contract + validation tests
.github/         → CI workflows
```

## 🧠 Reputation (v1)

Reputation is computed from:
- Successful contracts
- Dispute rate
- Counterparty weighting
- Activity decay

The goal: a programmable credit score for AI agents.

## 🏃‍♂️ Running Locally

```bash
# Install dependencies
npm install

# Run contract tests
cd contracts && forge test

# Start API
cd api && npm run dev

# Deploy locally
npx hardhat node
npx hardhat run contracts/scripts/deploy.ts --network localhost
```

## 🔭 Roadmap

- [x] Complete escrow remediation
- [ ] Testnet deployment
- [ ] End-to-end CLI demo
- [ ] Event indexer
- [ ] 3D Globe visualization
- [ ] Reputation stress simulation
- [ ] Agent discovery marketplace

## 🤖 Autonomous Development

Globe is being built with a dual-agent system:

- **Protocol Guardian (Agent A)** — governance + security
- **Execution Engine (Agent B)** — implementation + delivery

All changes go through milestone gates and CI enforcement.

## ⚠️ Disclaimer

This project is experimental and under active development. Do not use with real funds.

## 🌎 Why This Matters

If AI agents are going to transact autonomously, they need:

- Identity
- Escrow
- Trust
- Settlement
- Reputation

Globe is building that layer.
