# GlobeEscrow Security Notes

## Overview

This document enumerates all attack surfaces in the GlobeEscrow contract and the mitigations in place.

---

## Attack Surfaces

### 1. Reentrancy

**Risk:** External calls could allow attacker to re-enter contract and drain funds.

**Mitigation:**
- `ReentrancyGuard` from OpenZeppelin on all state-changing functions
- Checks-Effects-Interactions pattern
- No `call()` with unspecified gas

**Functions Protected:**
- `fund()`
- `deliver()`
- `verify()`
- `withdraw()`
- `refund()`

---

### 2. Double-Withdrawal

**Risk:** Payee calls `withdraw()` twice, draining escrow twice.

**Mitigation:**
- State check: only withdraw if `state == Released`
- After withdrawal, set state to prevent replay

**Code Pattern:**
```solidity
function withdraw(bytes32 id) external nonReentrant {
    Escrow storage e = escrows[id];
    require(e.state == EscrowState.Released, "Not released");
    require(e.amount > 0, "Nothing to withdraw");
    
    uint256 amount = e.amount;
    e.amount = 0;  // Prevent double-withdraw
    
    IERC20(token).transfer(e.payee, amount);
    emit Withdrawn(id, amount);
}
```

---

### 3. Timestamp Manipulation

**Risk:** Miner could manipulate block timestamp to trigger early refund.

**Mitigation:**
- Use `block.timestamp` but with grace period buffer
- For MVP: grace period of 24 hours makes manipulation impractical
- Future: Consider using oracle-based timestamps

**Code:**
```solidity
function refund(bytes32 id) external nonReentrant {
    Escrow storage e = escrows[id];
    require(block.timestamp > e.deadline + GRACE_PERIOD, "Deadline not passed");
    // ...
}
```

---

### 4. Signature Replay

**Risk:** Signed messages (offers, deliveries) could be replayed on different chains or after expiration.

**Mitigation:**
- Include `chainId` in EIP-712 domain
- Include `nonce` in signed message, increment per action
- Include `expiresAt` timestamp

**Domain Separator:**
```json
{
  "name": "Globe",
  "version": "1",
  "chainId": 84532,
  "verifyingContract": "<escrow_address>"
}
```

---

### 5. Incorrect Access Control

**Risk:** Unauthorized users could call privileged functions.

**Mitigation:**
- Explicit access control checks on every state-changing function
- Only `payer` can: `fund()`, `refund()`, `dispute()`, `verify()`
- Only `payee` can: `deliver()`, `withdraw()`
- Both can: `cancelMutual()`

**Code Pattern:**
```solidity
function fund(bytes32 id) external nonReentrant {
    Escrow storage e = escrows[id];
    require(msg.sender == e.payer, "Not payer");
    // ...
}
```

---

### 6. Front-Running

**Risk:** Transactions could be front-run (e.g., deposit race condition).

**Mitigation:**
- Escrow created with unique ID (hash of params)
- Each escrow isolated, no shared state
- For MVP: acceptable risk

---

### 7. Token Manipulation

**Risk:** USDC contract could be manipulated or deprecated.

**Mitigation:**
- Use interface, not implementation
- Check balance before transfer
- For MVP: trust USDC on Base

---

### 8. Griefing/DoS

**Risk:** Someone creates many escrows to spam contract.

**Mitigation:**
- Gas costs deter spam
- No bulk operations exposed

---

### 9. Integer Overflow/Underflow

**Risk:** Arithmetic errors could cause unexpected behavior.

**Mitigation:**
- Solidity 0.8+ has built-in overflow checks
- Use `uint256` for all amounts

---

### 10. Emergency: Contract Upgrade

**Risk:** If contract has bugs, funds could be locked.

**Mitigation:**
- Pull-based withdrawal (always retrievable)
- Timeout refund path
- Mutual cancellation
- For MVP: no proxy/upgradeability (simpler = safer)

---

## Security Checklist (Pre-Deploy)

- [ ] ReentrancyGuard on all state-changing functions
- [ ] Access control on every function
- [ ] No unsafe `.call()` or `.send()`
- [ ] Pull-based withdrawal (no auto-transfer)
- [ ] Timeout refund path tested
- [ ] Mutual cancel tested
- [ ] Double-withdraw protection
- [ ] State transitions validated
- [ ] Events emit correct params
- [ ] No Solidity compiler warnings

---

## Audit Recommendations

For v0.2+, consider:
1. Formal verification (Certora/Runtime Verification)
2. Third-party audit (Trail of Bits/OpenZeppelin)
3. Bug bounty program

---

## Incident Response

If funds at risk:
1. Pause contract (if upgradeable)
2. Document exploit
3. Coordinate with Base team
4. Deploy fix
5. Distribute remaining funds
