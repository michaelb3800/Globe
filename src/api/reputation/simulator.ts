/**
 * Reputation Simulator
 * 
 * Simulates reputation updates based on escrow events.
 * Validates spec/reputation.md formula.
 */

import { GlobeEvent, GlobeEventType } from "../events/indexer";

export interface AgentReputation {
  agentId: string;
  address: string;
  score: number;
  tier: "new" | "building" | "trusted" | "top";
  totalContracts: number;
  successfulContracts: number;
  disputedContracts: number;
  totalVolumeUsd: number;
  lastUpdated: string;
}

// Reputation formula from spec/reputation.md
const REPUTATION_CONFIG = {
  SUCCESS_WEIGHT: 70,
  VOLUME_BONUS_CAP: 20,
  DISPUTE_PENALTY: 15,
  DISPUTE_PENALTY_CAP: 50,
  DECAY_PER_DAY: 0.5,
  DECAY_START_DAY: 30,
  DECAY_CAP: 20,
  DEFAULT_SCORE: 35
};

export class ReputationSimulator {
  private agents: Map<string, AgentReputation>;
  
  constructor() {
    this.agents = new Map();
  }
  
  /**
   * Get or create agent reputation
   */
  private getOrCreate(address: string): AgentReputation {
    const agentId = `agent_${address.slice(2, 10)}`;
    
    if (!this.agents.has(address)) {
      this.agents.set(address, {
        agentId,
        address,
        score: REPUTATION_CONFIG.DEFAULT_SCORE,
        tier: "new",
        totalContracts: 0,
        successfulContracts: 0,
        disputedContracts: 0,
        totalVolumeUsd: 0,
        lastUpdated: new Date().toISOString()
      });
    }
    
    return this.agents.get(address)!;
  }
  
  /**
   * Calculate score for an agent
   */
  private calculateScore(agent: AgentReputation, daysSinceLastContract: number = 0): number {
    const { totalContracts, successfulContracts, disputedContracts, totalVolumeUsd } = agent;
    
    // Success ratio
    let successRatio = 0.5;
    if (totalContracts > 0) {
      successRatio = successfulContracts / totalContracts;
    }
    
    // Components
    const successComponent = REPUTATION_CONFIG.SUCCESS_WEIGHT * successRatio;
    const volumeBonus = Math.min(totalVolumeUsd / 1000, REPUTATION_CONFIG.VOLUME_BONUS_CAP);
    const disputePenalty = Math.min(
      disputedContracts * REPUTATION_CONFIG.DISPUTE_PENALTY,
      REPUTATION_CONFIG.DISPUTE_PENALTY_CAP
    );
    
    // Decay
    let decayPenalty = 0;
    if (daysSinceLastContract > REPUTATION_CONFIG.DECAY_START_DAY) {
      decayPenalty = Math.min(
        (daysSinceLastContract - REPUTATION_CONFIG.DECAY_START_DAY) * REPUTATION_CONFIG.DECAY_PER_DAY,
        REPUTATION_CONFIG.DECAY_CAP
      );
    }
    
    // Final
    const score = Math.min(100, Math.max(0,
      successComponent + volumeBonus - disputePenalty - decayPenalty
    ));
    
    return Math.round(score);
  }
  
  /**
   * Determine tier
   */
  private getTier(score: number): AgentReputation["tier"] {
    if (score >= 86) return "top";
    if (score >= 61) return "trusted";
    if (score >= 31) return "building";
    return "new";
  }
  
  /**
   * Process an event and update reputation
   */
  processEvent(event: GlobeEvent): void {
    switch (event.eventType) {
      case "EscrowCreated":
        // New contract initiated
        if (event.payer) {
          const payer = this.getOrCreate(event.payer.address);
          payer.totalContracts += 1;
        }
        break;
        
      case "Released":
        // Successful completion
        if (event.payer) {
          const payer = this.getOrCreate(event.payer.address);
          payer.successfulContracts += 1;
          if (event.amount) {
            payer.totalVolumeUsd += event.amount / 1e6; // Convert from microusdc
          }
        }
        if (event.payee) {
          const payee = this.getOrCreate(event.payee.address);
          payee.successfulContracts += 1;
          if (event.amount) {
            payee.totalVolumeUsd += event.amount / 1e6;
          }
        }
        break;
        
      case "Disputed":
        // Dispute recorded
        if (event.payer) {
          const payer = this.getOrCreate(event.payer.address);
          payer.disputedContracts += 1;
        }
        break;
        
      case "Refunded":
        // Failed contract (doesn't count as successful)
        break;
        
      case "Cancelled":
        // Cancelled doesn't affect reputation
        break;
    }
    
    // Recalculate scores for affected agents
    const now = Date.now();
    const daysSinceLastContract = 0; // Would calculate from event timestamp
    
    for (const agent of this.agents.values()) {
      agent.score = this.calculateScore(agent, daysSinceLastContract);
      agent.tier = this.getTier(agent.score);
      agent.lastUpdated = new Date().toISOString();
    }
  }
  
  /**
   * Process multiple events
   */
  processEvents(events: GlobeEvent[]): void {
    for (const event of events) {
      this.processEvent(event);
    }
  }
  
  /**
   * Get agent reputation
   */
  getReputation(address: string): AgentReputation | null {
    return this.agents.get(address) || null;
  }
  
  /**
   * Get all reputations
   */
  getAllReputations(): AgentReputation[] {
    return Array.from(this.agents.values());
  }
  
  /**
   * Get leaderboard (top N by score)
   */
  getLeaderboard(limit: number = 10): AgentReputation[] {
    return Array.from(this.agents.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
  
  /**
   * Reset simulator
   */
  reset(): void {
    this.agents.clear();
  }
  
  /**
   * Simulate N escrow events (for stress testing)
   */
  async simulateStressTest(numEscrows: number = 1000): Promise<void> {
    this.reset();
    
    const events: GlobeEvent[] = [];
    
    for (let i = 0; i < numEscrows; i++) {
      const payerAddr = `0x${String(i).padStart(40, "0")}`;
      const payeeAddr = `0x${String(i + 1000).padStart(40, "0")}`;
      const amount = Math.floor(Math.random() * 1000) * 1e6;
      
      // Random outcome
      const outcome = Math.random();
      
      if (outcome < 0.8) {
        // 80% success
        events.push(
          {
            eventId: `evt_${i}`,
            eventType: "EscrowCreated",
            timestamp: new Date().toISOString(),
            escrowId: `escrow_${i}`,
            txHash: `0x${i}`,
            amount,
            payer: { agentId: "", address: payerAddr, region: "", reputationScore: 0 },
            payee: { agentId: "", address: payeeAddr, region: "", reputationScore: 0 }
          },
          {
            eventId: `evt_${i}`,
            eventType: "Released",
            timestamp: new Date().toISOString(),
            escrowId: `escrow_${i}`,
            txHash: `0x${i}`,
            amount
          }
        );
      } else if (outcome < 0.95) {
        // 15% refunded
        events.push(
          {
            eventId: `evt_${i}`,
            eventType: "EscrowCreated",
            timestamp: new Date().toISOString(),
            escrowId: `escrow_${i}`,
            txHash: `0x${i}`,
            amount,
            payer: { agentId: "", address: payerAddr, region: "", reputationScore: 0 },
            payee: { agentId: "", address: payeeAddr, region: "", reputationScore: 0 }
          },
          {
            eventId: `evt_${i}`,
            eventType: "Refunded",
            timestamp: new Date().toISOString(),
            escrowId: `escrow_${i}`,
            txHash: `0x${i}`,
            amount
          }
        );
      } else {
        // 5% disputed
        events.push(
          {
            eventId: `evt_${i}`,
            eventType: "EscrowCreated",
            timestamp: new Date().toISOString(),
            escrowId: `escrow_${i}`,
            txHash: `0x${i}`,
            amount,
            payer: { agentId: "", address: payerAddr, region: "", reputationScore: 0 },
            payee: { agentId: "", address: payeeAddr, region: "", reputationScore: 0 }
          },
          {
            eventId: `evt_${i}`,
            eventType: "Disputed",
            timestamp: new Date().toISOString(),
            escrowId: `escrow_${i}`,
            txHash: `0x${i}`,
            metadata: { disputeReason: "Quality dispute" }
          }
        );
      }
    }
    
    this.processEvents(events);
    
    console.log(`\n📊 Stress Test Results (${numEscrows} escrows):`);
    console.log(`   Total agents: ${this.agents.size}`);
    console.log(`   Avg score: ${(Array.from(this.agents.values()).reduce((a, b) => a + b.score, 0) / this.agents.size).toFixed(1)}`);
    console.log(`   Top score: ${Math.max(...Array.from(this.agents.values()).map(a => a.score))}`);
  }
}

// Export factory
export function createReputationSimulator(): ReputationSimulator {
  return new ReputationSimulator();
}
