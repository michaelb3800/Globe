/**
 * GlobeEscrow Interface
 * 
 * TypeScript interface for GlobeEscrow contract interaction.
 * Used by API layer to interact with deployed contract.
 * 
 * Matches spec/contracts.md exactly.
 */

import { BigNumber, Bytes32 } from 'ethers';

// ============ Types ============

export type EscrowState = 
  | 'Created' 
  | 'Funded' 
  | 'Delivered' 
  | 'Verified' 
  | 'Released' 
  | 'Disputed' 
  | 'Refunded' 
  | 'Cancelled';

export interface EscrowData {
  payer: string;
  payee: string;
  token: string;
  amount: BigNumber;
  deadline: number;
  createdAt: number;
  state: EscrowState;
  artifactHash: string;
}

export interface CreateEscrowParams {
  payer: string;
  payee: string;
  amount: BigNumber;
  deadline: number;
  artifactHash: string;
}

export interface EscrowCreatedEvent {
  id: string;
  payer: string;
  payee: string;
  amount: BigNumber;
  deadline: number;
}

export interface FundedEvent {
  id: string;
  amount: BigNumber;
}

export interface DeliveredEvent {
  id: string;
  artifactHash: string;
}

export interface VerifiedEvent {
  id: string;
}

export interface ReleasedEvent {
  id: string;
  amount: BigNumber;
}

export interface DisputedEvent {
  id: string;
  reason: string;
}

export interface RefundedEvent {
  id: string;
  amount: BigNumber;
}

export interface CancelledEvent {
  id: string;
}

// ============ Contract Interface ============

export interface IGlobeEscrow {
  // Read functions
  escrows(id: string): Promise<EscrowData>;
  usdc(): Promise<string>;
  gracePeriod(): Promise<number>;
  
  // Write functions
  create(
    payer: string,
    payee: string,
    amount: BigNumber,
    deadline: number,
    artifactHash: string
  ): Promise<string>; // Returns tx hash
  
  fund(id: string): Promise<string>;
  
  deliver(id: string, artifactHash: string): Promise<string>;
  
  verify(id: string): Promise<string>;
  
  withdraw(id: string): Promise<string>;
  
  dispute(id: string, reason: string): Promise<string>;
  
  refund(id: string): Promise<string>;
  
  cancelMutual(id: string): Promise<string>;
  
  // Event filters
  queryFilter(
    event: string,
    fromBlock?: number,
    toBlock?: number
  ): Promise<any[]>;
}

// ============ API Service Class ============

export class GlobeEscrowService {
  constructor(
    private contract: IGlobeEscrow,
    private signer: any
  ) {}
  
  /**
   * Create a new escrow
   */
  async createEscrow(params: CreateEscrowParams): Promise<{
    txHash: string;
    escrowId: string;
  }> {
    const tx = await this.contract.create(
      params.payer,
      params.payee,
      params.amount,
      params.deadline,
      params.artifactHash
    );
    
    const receipt = await tx.wait();
    const event = receipt.events?.find((e: any) => e.event === 'EscrowCreated');
    
    return {
      txHash: tx.hash,
      escrowId: event?.args?.id
    };
  }
  
  /**
   * Fund an existing escrow (payer only)
   */
  async fundEscrow(escrowId: string): Promise<{ txHash: string }> {
    const tx = await this.contract.fund(escrowId);
    const receipt = await tx.wait();
    
    return { txHash: tx.hash };
  }
  
  /**
   * Submit delivery (payee only)
   */
  async submitDelivery(
    escrowId: string, 
    artifactHash: string
  ): Promise<{ txHash: string }> {
    const tx = await this.contract.deliver(escrowId, artifactHash);
    const receipt = await tx.wait();
    
    return { txHash: tx.hash };
  }
  
  /**
   * Verify and release funds (payer only)
   */
  async verifyAndRelease(escrowId: string): Promise<{ txHash: string }> {
    // First verify
    const verifyTx = await this.contract.verify(escrowId);
    await verifyTx.wait();
    
    // Then withdraw (payee pulls funds)
    const withdrawTx = await this.contract.withdraw(escrowId);
    const receipt = await withdrawTx.wait();
    
    return { txHash: withdrawTx.hash };
  }
  
  /**
   * Request refund after timeout (payer only)
   */
  async refundAfterTimeout(escrowId: string): Promise<{ txHash: string }> {
    const tx = await this.contract.refund(escrowId);
    const receipt = await tx.wait();
    
    return { txHash: tx.hash };
  }
  
  /**
   * Mutual cancellation (either party)
   */
  async mutualCancel(escrowId: string): Promise<{ txHash: string }> {
    const tx = await this.contract.cancelMutual(escrowId);
    const receipt = await tx.wait();
    
    return { txHash: tx.hash };
  }
  
  /**
   * Open dispute (payer only)
   */
  async openDispute(
    escrowId: string, 
    reason: string
  ): Promise<{ txHash: string }> {
    const tx = await this.contract.dispute(escrowId, reason);
    const receipt = await tx.wait();
    
    return { txHash: tx.hash };
  }
  
  /**
   * Get escrow state
   */
  async getEscrowState(escrowId: string): Promise<EscrowState> {
    const data = await this.contract.escrows(escrowId);
    return data.state;
  }
  
  /**
   * Get all events for an escrow
   */
  async getEscrowEvents(escrowId: string): Promise<{
    created?: EscrowCreatedEvent;
    funded?: FundedEvent;
    delivered?: DeliveredEvent;
    verified?: VerifiedEvent;
    released?: ReleasedEvent;
    disputed?: DisputedEvent;
    refunded?: RefundedEvent;
    cancelled?: CancelledEvent;
  }> {
    // Note: In practice, filter by indexed id
    const events = await this.contract.queryFilter('EscrowCreated', 0, 'latest');
    
    // Parse and return relevant events
    // Implementation depends on indexing strategy
    return {};
  }
}

// ============ Event Types for Indexer ============

export type GlobeContractEvent = 
  | EscrowCreatedEvent
  | FundedEvent
  | DeliveredEvent
  | VerifiedEvent
  | ReleasedEvent
  | DisputedEvent
  | RefundedEvent
  | CancelledEvent;

export interface ParsedContractEvent {
  type: string;
  escrowId: string;
  timestamp: number;
  blockNumber: number;
  txHash: string;
  data: Record<string, any>;
}
