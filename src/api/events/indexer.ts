/**
 * Event Indexer
 * 
 * Listens to GlobeEscrow contract events and updates the database.
 * Matches spec/schemas/event-feed.json exactly.
 * 
 * Events to index:
 * - EscrowCreated
 * - Funded
 * - Delivered
 * - Verified
 * - Released
 * - Disputed
 * - Refunded
 * - Cancelled
 */

import { ethers, Event, EventFilter } from "ethers";

// Event types matching spec/schemas/event-feed.json
export type GlobeEventType = 
  | "EscrowCreated"
  | "Funded"
  | "Delivered"
  | "Verified"
  | "Released"
  | "Disputed"
  | "Refunded"
  | "Cancelled";

// Event interface matching spec
export interface GlobeEvent {
  eventId: string;
  eventType: GlobeEventType;
  timestamp: string;
  escrowId: string;
  txHash: string;
  amount?: number;
  capabilityTag?: string;
  payer?: {
    agentId: string;
    address: string;
    region: string;
    reputationScore: number;
  };
  payee?: {
    agentId: string;
    address: string;
    region: string;
    reputationScore: number;
  };
  metadata?: {
    artifactHash?: string;
    disputeReason?: string;
    deliveryNote?: string;
  };
}

// Contract ABI (events only)
const ESCROW_ABI = [
  "event EscrowCreated(bytes32 indexed escrowId, address indexed requester, address indexed provider, address token, uint256 amount, uint256 deadline)",
  "event Funded(bytes32 indexed escrowId, address funder, uint256 amount)",
  "event Delivered(bytes32 indexed escrowId, address indexed provider, string artifactHash)",
  "event Verified(bytes32 indexed escrowId, address indexed requester)",
  "event Released(bytes32 indexed escrowId, address indexed provider, uint256 amount)",
  "event Disputed(bytes32 indexed escrowId, address disputer, string reason)",
  "event Refunded(bytes32 indexed escrowId, address indexed requester, uint256 amount)",
  "event Cancelled(bytes32 indexed escrowId)"
];

export class EventIndexer {
  private contract: ethers.Contract;
  private provider: ethers.providers.Provider;
  private db: Map<string, GlobeEvent[]>;
  
  constructor(
    contractAddress: string,
    provider: ethers.providers.Provider
  ) {
    this.provider = provider;
    this.contract = new ethers.Contract(contractAddress, ESCROW_ABI, provider);
    this.db = new Map();
  }
  
  /**
   * Parse event and convert to GlobeEvent format
   */
  private parseEvent(event: Event): GlobeEvent {
    const baseEvent = {
      eventId: `evt_${event.transactionHash.slice(2, 10)}_${event.logIndex}`,
      timestamp: new Date((event.blockNumber || 0) * 12 + 5000).toISOString(), // Approximate
      escrowId: event.args?.escrowId as string,
      txHash: event.transactionHash
    };
    
    switch (event.event) {
      case "EscrowCreated":
        return {
          ...baseEvent,
          eventType: "EscrowCreated",
          amount: (event.args?.amount as ethers.BigNumber)?.toNumber(),
          payer: {
            agentId: "",
            address: event.args?.requester as string,
            region: "",
            reputationScore: 0
          },
          payee: {
            agentId: "",
            address: event.args?.provider as string,
            region: "",
            reputationScore: 0
          }
        };
        
      case "Funded":
        return {
          ...baseEvent,
          eventType: "Funded",
          amount: (event.args?.amount as ethers.BigNumber)?.toNumber()
        };
        
      case "Delivered":
        return {
          ...baseEvent,
          eventType: "Delivered",
          metadata: {
            artifactHash: event.args?.artifactHash as string
          }
        };
        
      case "Verified":
        return {
          ...baseEvent,
          eventType: "Verified"
        };
        
      case "Released":
        return {
          ...baseEvent,
          eventType: "Released",
          amount: (event.args?.amount as ethers.BigNumber)?.toNumber()
        };
        
      case "Disputed":
        return {
          ...baseEvent,
          eventType: "Disputed",
          metadata: {
            disputeReason: event.args?.reason as string
          }
        };
        
      case "Refunded":
        return {
          ...baseEvent,
          eventType: "Refunded",
          amount: (event.args?.amount as ethers.BigNumber)?.toNumber()
        };
        
      case "Cancelled":
        return {
          ...baseEvent,
          eventType: "Cancelled"
        };
        
      default:
        throw new Error(`Unknown event: ${event.event}`);
    }
  }
  
  /**
   * Index events from a specific block range
   */
  async indexRange(fromBlock: number, toBlock: number | string = "latest"): Promise<GlobeEvent[]> {
    const events: GlobeEvent[] = [];
    
    const eventTypes: GlobeEventType[] = [
      "EscrowCreated", "Funded", "Delivered", "Verified", 
      "Released", "Disputed", "Refunded", "Cancelled"
    ];
    
    for (const eventType of eventTypes) {
      const filter: EventFilter = this.contract.filters[eventType]();
      const logs = await this.contract.queryFilter(filter, fromBlock, toBlock);
      
      for (const log of logs) {
        try {
          const parsed = this.contract.interface.parseLog(log);
          const globeEvent = this.parseEvent({
            ...log,
            event: eventType,
            args: parsed.args
          } as Event);
          
          events.push(globeEvent);
          
          // Store in DB
          const escrowEvents = this.db.get(globeEvent.escrowId) || [];
          escrowEvents.push(globeEvent);
          this.db.set(globeEvent.escrowId, escrowEvents);
          
        } catch (e) {
          console.error(`Failed to parse ${eventType}:`, e);
        }
      }
    }
    
    // Sort by timestamp
    events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    
    return events;
  }
  
  /**
   * Get all events for an escrow
   */
  getEvents(escrowId: string): GlobeEvent[] {
    return this.db.get(escrowId) || [];
  }
  
  /**
   * Get recent events (for UI feed)
   */
  async getRecentEvents(limit: number = 20): Promise<GlobeEvent[]> {
    const allEvents: GlobeEvent[] = [];
    
    for (const events of this.db.values()) {
      allEvents.push(...events);
    }
    
    allEvents.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    
    return allEvents.slice(0, limit);
  }
  
  /**
   * Start polling for new events
   */
  startPolling(intervalMs: number = 3000): () => void {
    let lastBlock: number;
    
    const poll = async () => {
      try {
        const block = await this.provider.getBlockNumber();
        
        if (lastBlock && block > lastBlock) {
          await this.indexRange(lastBlock + 1, block);
          console.log(`Indexed blocks ${lastBlock + 1} to ${block}`);
        }
        
        lastBlock = block;
      } catch (e) {
        console.error("Polling error:", e);
      }
    };
    
    const intervalId = setInterval(poll, intervalMs);
    
    // Initial poll
    poll();
    
    // Return stop function
    return () => clearInterval(intervalId);
  }
}

/**
 * Factory function
 */
export function createIndexer(contractAddress: string, rpcUrl: string): EventIndexer {
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  return new EventIndexer(contractAddress, provider);
}

// Export types for API
export type { GlobeEventType as EventType };
