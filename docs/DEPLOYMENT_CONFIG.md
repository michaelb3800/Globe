# Globe Protocol — Deployment Config

## Base Sepolia

### USDC Token
**Address:** `0x4Cc2a5B4Dd4C3181f2F6FC949aE1d3B4B1d3b4B1`

*Note: Verify this address on https://sepolia.basescan.org before deploying.*

### Deployment Steps

```bash
# 1. Configure environment
cd contracts
cp .env.example .env

# 2. Edit .env with:
# - PRIVATE_KEY=your_test_wallet_private_key
# - BASESEPOLIA_RPC_URL=https://sepolia.base.org

# 3. Get testnet ETH (faucet)
# https://bridge.base.org/deposit

# 4. Get testnet USDC
# https://app.uniswap.org (Bridge from Ethereum Sepolia)

# 5. Deploy
forge script scripts/deploy.ts --broadcast --verify --network baseSepolia
```

### Verify Deployment

After deployment, verify on BaseScan:
1. Go to https://sepolia.basescan.org/address/YOUR_CONTRACT
2. Click "Contract" → "Verify"
3. Select "Solidity (Forge)"
4. Fill in compiler version and settings

### Record Deployment

Update `DEMO_PROOF.md`:
```markdown
## Deployment
| Contract | Network | Address | TX Hash |
|----------|---------|---------|---------|
| GlobeEscrow | Base Sepolia | 0x... | 0x... |
```
