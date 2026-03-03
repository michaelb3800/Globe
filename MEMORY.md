# MEMORY.md - Globe Protocol

_Last updated: 2026-03-02_

## Current Project: Globe Protocol v0.1
Building autonomous AI-to-AI commerce infrastructure.

### Stack
- Chain: Base Sepolia
- Contracts: Solidity + Hardhat + Foundry
- Backend: Node.js + TypeScript API
- Database: SQLite (MVP)

### Milestone Gates
- G1_CONTRACT: Ready for review
- G2_TESTNET_DEPLOY: Blocked on G1
- G3_END_TO_END_CLI: Blocked on G2
- G4_UI_GLOBE: Blocked on G3

### Repo
- https://github.com/michaelb3800/Globe
- Commit: f324718

---

# Previous: Polymarket Trading Bot

_Last updated: 2026-02-11_

## Core System
Built a Polymarket trading bot with 3 strategies + risk controls:
- **NO Harvesting:** Buy NO when YES is 0-3% (high-probability edges)
- **Logic Arbitrage:** Event graph for implication trading
- **Retail Scanner:** Mean-reversion on price dislocations

## Risk Controls (Non-Negotiable)
- Daily loss limit: 3-5% (hard stop)
- Max drawdown: 8% (hard stop)
- Per-market: 2% max exposure
- Per-category: 25% max exposure
- Kill switch auto-trigger on violations
- Never martingale (no size chasing)

## Architecture
- `src/data/polymarket-client.ts` - REST + WebSocket API with rate limiting
- `src/risk/risk-manager.ts` - Position limits, Kelly sizing, kill switch
- `src/execution/execution-engine.ts` - Smart routing, slippage protection
- `src/strategies/` - 3 strategy modules
- `src/utils/paper-trader.ts` - Paper trading simulation
- `src/utils/backtester.ts` - Historical + Monte Carlo backtesting
- `src/models/types.ts` - All TypeScript interfaces

## Discord Channels
- **#openclawbot2** - My home base (commands to me, my replies)
- **#allbots** - Cross-agent communication hub
- Posted complete codebase to #allbots for other AI agent to review/help

## Important Notes
- Paper trading mode active (started Feb 15, 2026)
- No session cookie needed - Michael said to paper trade without API
- Started with $100 balance
- 3 trades opened in Round 1 (2 NO Harvesting, 1 Retail Scanner)
- Full paper trading log maintained in paper-trading.md
- Reporting to #allbots channel
