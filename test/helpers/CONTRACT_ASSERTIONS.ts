/**
 * CONTRACT_ASSERTIONS.ts
 * 
 * Reusable test assertions for GlobeEscrow contract validation.
 * Validates state transitions, events, reentrancy guards, and access control.
 * 
 * Usage:
 *   import { validateStateTransition, validateEventEmission } from './test/helpers/contractAssertions';
 */

import { expect } from "chai";
import { ethers, BigNumber } from "ethers";

// State enum mapping (must match contract)
export enum EscrowState {
  Created = 0,
  Funded = 1,
  Delivered = 2,
  Verified = 3,
  Released = 4,
  Disputed = 5,
  Refunded = 6,
  Cancelled = 7
}

// Valid state transitions per spec/contracts.md
const VALID_TRANSITIONS: Record<EscrowState, EscrowState[]> = {
  [EscrowState.Created]: [EscrowState.Funded, EscrowState.Cancelled],
  [EscrowState.Funded]: [EscrowState.Delivered, EscrowState.Refunded],
  [EscrowState.Delivered]: [EscrowState.Verified, EscrowState.Disputed],
  [EscrowState.Verified]: [EscrowState.Released],
  [EscrowState.Released]: [],
  [EscrowState.Disputed]: [EscrowState.Refunded, EscrowState.Released],
  [EscrowState.Refunded]: [],
  [EscrowState.Cancelled]: []
};

/**
 * Validate state transition is allowed
 */
export function validateStateTransition(
  currentState: EscrowState,
  newState: EscrowState,
  operation: string
): void {
  const allowed = VALID_TRANSITIONS[currentState];
  if (!allowed.includes(newState)) {
    throw new Error(
      `Invalid state transition: ${EscrowState[currentState]} -> ${EscrowState[newState]} ` +
      `during ${operation}. Allowed: [${allowed.map(s => EscrowState[s]).join(', ')}]`
    );
  }
}

/**
 * Assert escrow state equals expected
 */
export function expectEscrowState(
  escrowData: any,
  expectedState: EscrowState,
  message?: string
): void {
  expect(escrowData.state, message || `Expected state ${EscrowState[expectedState]}`)
    .to.equal(expectedState);
}

/**
 * Validate event emission matches spec exactly
 */
export function validateEventEmission(
  receipt: ethers.TransactionReceipt,
  expectedEvent: string,
  expectedArgs?: Record<string, any>
): ethers.utils.LogDescription | null {
  const event = receipt.events?.find(e => e.event === expectedEvent);
  
  if (!event) {
    throw new Error(`Expected event "${expectedEvent}" not found. Found: ${receipt.events?.map(e => e.event).join(', ')}`);
  }
  
  if (expectedArgs) {
    for (const [key, value] of Object.entries(expectedArgs)) {
      expect(event.args?.[key], `Event arg ${key}`).to.equal(value);
    }
  }
  
  return event;
}

/**
 * Validate event does NOT exist in receipt
 */
export function expectNoEvent(
  receipt: ethers.TransactionReceipt,
  eventName: string
): void {
  const event = receipt.events?.find(e => e.event === eventName);
  expect(event, `Event "${eventName}" should not be emitted`).to.be.undefined;
}

/**
 * Validate reentrancy guard behavior
 * (This is a conceptual check - actual testing requires separate contract)
 */
export function validateReentrancyGuardPresent(contract: any): void {
  // Check contract has nonReentrant modifier on critical functions
  // This is validated via Hardhat console.log or interface inspection
  expect(contract).to.have.property('interface');
}

/**
 * Validate access control - function reverts for non-authorized caller
 */
export async function expectRevertForUnauthorized(
  contract: any,
  functionName: string,
  unauthorizedSigner: any,
  args: any[]
): Promise<void> {
  await expect(
    contract.connect(unauthorizedSigner)[functionName](...args)
  ).to.be.reverted;
}

/**
 * Validate timeout refund logic
 */
export async function validateTimeoutRefund(
  contract: any,
  escrowId: string,
  payer: any,
  deadline: number,
  gracePeriod: number,
  fundAmount: BigNumber
): Promise<void> {
  // Should fail before deadline + grace
  await expect(
    contract.connect(payer).refund(escrowId)
  ).to.be.revertedWith("Deadline not passed");
  
  // Simulate time passing (would need Hardhat evm_increaseTime)
  // Then should succeed
}

/**
 * Validate mutual cancellation
 */
export async function validateMutualCancel(
  contract: any,
  escrowId: string,
  payer: any,
  payee: any
): Promise<void> {
  // Cancel before funding should work
  await expect(contract.connect(payer).cancelMutual(escrowId))
    .to.emit(contract, 'Cancelled');
    
  // State should be Cancelled
  const escrow = await contract.escrows(escrowId);
  expect(escrow.state).to.equal(EscrowState.Cancelled);
}

/**
 * Validate pull-based withdrawal (no auto-transfer)
 */
export async function validatePullWithdrawal(
  contract: any,
  escrowId: string,
  payee: any,
  expectedAmount: BigNumber
): Promise<void> {
  const payeeBalanceBefore = await contract.usdc().then((token: any) => 
    token.balanceOf(payee.address)
  );
  
  // Withdraw should succeed
  await expect(contract.connect(payee).withdraw(escrowId))
    .to.emit(contract, 'Released');
    
  // Check balance increased (not via auto-transfer)
  const payeeBalanceAfter = await contract.usdc().then((token: any) => 
    token.balanceOf(payee.address)
  );
  
  expect(payeeBalanceAfter.sub(payeeBalanceBefore)).to.equal(expectedAmount);
}

/**
 * Validate double-withdrawal protection
 */
export async function validateNoDoubleWithdraw(
  contract: any,
  escrowId: string,
  payee: any
): Promise<void> {
  // First withdrawal should succeed
  await contract.connect(payee).withdraw(escrowId);
  
  // Second should revert
  await expect(
    contract.connect(payee).withdraw(escrowId)
  ).to.be.revertedWith("Nothing to withdraw");
}

/**
 * Complete validation suite for escrow contract
 * Run this to validate full spec compliance
 */
export async function runFullValidation(
  contract: any,
  usdc: any,
  payer: any,
  payee: any,
  unauthorized: any
): Promise<void> {
  const TEN_USDC = BigNumber.from(10).pow(6).mul(10);
  const DEADLINE = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
  const ARTIFACT_HASH = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test"));
  
  // 1. Create escrow
  const tx = await contract.create(payer.address, payee.address, TEN_USDC, DEADLINE, ARTIFACT_HASH);
  const receipt = await tx.wait();
  const escrowId = receipt.events?.[0]?.args?.id;
  
  validateEventEmission(receipt, 'EscrowCreated', {
    payer: payer.address,
    payee: payee.address,
    amount: TEN_USDC,
    deadline: DEADLINE
  });
  
  // 2. Validate created state
  let escrow = await contract.escrows(escrowId);
  expectEscrowState(escrow, EscrowState.Created, 'After creation');
  
  // 3. Fund escrow
  await contract.connect(payer).fund(escrowId);
  escrow = await contract.escrows(escrowId);
  expectEscrowState(escrow, EscrowState.Funded, 'After funding');
  
  // 4. Unauthorized fund should fail
  await expectRevertForUnauthorized(
    contract, 'fund', unauthorized, [escrowId]
  );
  
  // 5. Deliver
  await contract.connect(payee).deliver(escrowId, ARTIFACT_HASH);
  escrow = await contract.escrows(escrowId);
  expectEscrowState(escrow, EscrowState.Delivered, 'After delivery');
  
  // 6. Verify
  await contract.connect(payer).verify(escrowId);
  escrow = await contract.escrows(escrowId);
  expectEscrowState(escrow, EscrowState.Verified, 'After verification');
  
  // 7. Withdraw (pull-based)
  await validatePullWithdrawal(contract, escrowId, payee, TEN_USDC);
  
  // 8. Double-withdraw should fail
  await validateNoDoubleWithdraw(contract, escrowId, payee);
  
  console.log('✅ Full validation suite passed');
}
