# GLOBE_PROTOCOL_MVP Specification

**Agent:** Agent B — Builder/DevOps  
**Version:** 0.2  
**North Star:** Implement a working end-to-end MVP of Globe that proves AI-to-AI discovery, negotiation, escrowed settlement, delivery verification, and reputation updates — and expose it through a minimal but iconic 3D Globe UI that visualizes real transaction events in near real-time.

## Non-Negotiables

1. NO native token. Stablecoin rails only (USDC or testnet equivalent).
2. Backend-first. UI only visualizes real data from API + chain.
3. One-command reproducibility from clean checkout.
4. No private keys in logs, commits, or plaintext.
5. Follow Agent A spec strictly. If unclear, propose 2 interpretations and choose simpler one.

## Mission Objective

- **Primary:** Deliver runnable demo where two agents autonomously transact using escrow + reputation, with visible globe viz.
- **Secondary:** Verifiable proof (tx hashes, logs, demo instructions)
- **Tertiary:** Keep code minimal, modular, auditable

## Repo Structure

```
/contracts - Smart contracts
/api       - REST API
/cli       - Autonomous agent CLIs
/ui        - 3D Globe visualization
/spec      - Specifications
/docs      - Documentation
README.md
TASKS.md
CHANGELOG.md
DEMO_PROOF.md
```

## Implementation Phases

### Phase 1 — Contracts Layer
- State machine: Created → Delivered → Verified → Released OR Disputed/Refunded
- Events: EscrowCreated, Delivered, Verified, Released, Disputed, Refunded
- Security: reentrancy guard, deadline timeout, role restrictions
- Unit tests

### Phase 2 — API + Registry Layer
- AgentProfile with signature verification
- Service listing + search by capability tag
- Offer + Acceptance with signed messages
- Escrow creation endpoint

### Phase 3 — Reputation Worker
- Consume on-chain + API events
- Compute reputation (Agent A formula)
- Persist rolling score + history

### Phase 4 — CLI Autonomous Agents
- Requester CLI: discover → create offer → fund escrow → verify
- Provider CLI: listen → accept → deliver → submit proof

### Phase 5 — Globe UI
- Three.js 3D globe
- Poll API for events
- Render arcs between coordinates
- Agent nodes with reputation halos
- Modal cards, feed panel, leaderboard

## Demo Scenario

1. Agent A registers as requester
2. Agent B registers as provider (capability: ad_copy)
3. Requester searches and selects provider
4. Offer created (4 USDC)
5. Provider accepts
6. Escrow deployed + funded
7. Provider submits JSON artifact
8. Requester verifies hash
9. Funds released
10. Reputation updates
11. Globe renders trade arc

## Quality Bar

- Readable, modular code
- No unused abstractions
- No commented-out legacy
- Minimal dependencies
- All env vars in .env.example
