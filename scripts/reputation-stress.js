#!/usr/bin/env node

/**
 * Reputation Stress Simulation
 * 
 * Simulates 1000+ escrow events to validate reputation v1 math.
 * Tests edge cases: cold start, disputes, high volume, decay.
 * 
 * Usage: node scripts/reputation-stress.js
 */

const REPUTATION_FORMULA = {
  // Weights
  SUCCESS_WEIGHT: 70,
  VOLUME_BONUS_CAP: 20,
  DISPUTE_PENALTY: 15,
  DISPUTE_PENALTY_CAP: 50,
  DECAY_PER_DAY: 0.5,
  DECAY_START_DAY: 30,
  DECAY_CAP: 20,
  
  // Defaults
  DEFAULT_SCORE: 35,
  
  calculate(agents) {
    return agents.map(agent => this.calculateAgent(agent));
  },
  
  calculateAgent(agent) {
    const {
      successfulContracts = 0,
      totalContracts = 0,
      disputedContracts = 0,
      totalVolumeUsd = 0,
      daysSinceLastContract = 0
    } = agent;
    
    // Success ratio
    let successRatio = 0.5; // default
    if (totalContracts > 0) {
      successRatio = successfulContracts / totalContracts;
    }
    
    // Success component
    const successComponent = this.SUCCESS_WEIGHT * successRatio;
    
    // Volume bonus
    const volumeBonus = Math.min(totalVolumeUsd / 1000, this.VOLUME_BONUS_CAP);
    
    // Dispute penalty
    const disputePenalty = Math.min(disputedContracts * this.DISPUTE_PENALTY, this.DISPUTE_PENALTY_CAP);
    
    // Decay penalty
    let decayPenalty = 0;
    if (daysSinceLastContract > this.DECAY_START_DAY) {
      decayPenalty = Math.min(
        (daysSinceLastContract - this.DECAY_START_DAY) * this.DECAY_PER_DAY,
        this.DECAY_CAP
      );
    }
    
    // Final score
    const score = Math.min(100, Math.max(0,
      successComponent + volumeBonus - disputePenalty - decayPenalty
    ));
    
    // Tier
    let tier = 'new';
    if (score >= 86) tier = 'top';
    else if (score >= 61) tier = 'trusted';
    else if (score >= 31) tier = 'building';
    
    return {
      ...agent,
      score: Math.round(score),
      tier,
      successRatio: Math.round(successRatio * 100) / 100
    };
  }
};

// Test scenarios
const SCENARIOS = [
  {
    name: 'Cold Start',
    agents: [
      { id: 'agent_1', successfulContracts: 0, totalContracts: 0, disputedContracts: 0, totalVolumeUsd: 0, daysSinceLastContract: 0 }
    ]
  },
  {
    name: 'Perfect Record (10 contracts)',
    agents: [
      { id: 'agent_2', successfulContracts: 10, totalContracts: 10, disputedContracts: 0, totalVolumeUsd: 500, daysSinceLastContract: 1 }
    ]
  },
  {
    name: 'One Dispute',
    agents: [
      { id: 'agent_3', successfulContracts: 10, totalContracts: 11, disputedContracts: 1, totalVolumeUsd: 500, daysSinceLastContract: 1 }
    ]
  },
  {
    name: 'High Volume (100 contracts)',
    agents: [
      { id: 'agent_4', successfulContracts: 95, totalContracts: 100, disputedContracts: 5, totalVolumeUsd: 50000, daysSinceLastContract: 1 }
    ]
  },
  {
    name: 'Inactive (60 days)',
    agents: [
      { id: 'agent_5', successfulContracts: 20, totalContracts: 20, disputedContracts: 0, totalVolumeUsd: 1000, daysSinceLastContract: 60 }
    ]
  },
  {
    name: 'Mixed Scenarios (1000 agents)',
    generate: () => {
      const agents = [];
      for (let i = 0; i < 1000; i++) {
        const totalContracts = Math.floor(Math.random() * 50);
        const disputedContracts = Math.floor(Math.random() * 5);
        const successfulContracts = totalContracts - disputedContracts;
        const totalVolumeUsd = totalContracts * (10 + Math.random() * 100);
        const daysSinceLastContract = Math.floor(Math.random() * 90);
        
        agents.push({
          id: `agent_${i}`,
          successfulContracts,
          totalContracts,
          disputedContracts,
          totalVolumeUsd: Math.round(totalVolumeUsd),
          daysSinceLastContract
        });
      }
      return agents;
    }
  }
];

console.log('='.repeat(60));
console.log('REPUTATION STRESS SIMULATION');
console.log('='.repeat(60));

for (const scenario of SCENARIOS) {
  console.log(`\n📊 Scenario: ${scenario.name}`);
  console.log('-'.repeat(40));
  
  const agents = scenario.generate ? scenario.generate() : scenario.agents;
  const results = REPUTATION_FORMULA.calculate(agents);
  
  if (results.length <= 5) {
    // Detailed output for small scenarios
    for (const result of results) {
      console.log(`\n${result.id}:`);
      console.log(`  Success: ${result.successfulContracts}/${result.totalContracts} (${result.successRatio * 100}%)`);
      console.log(`  Volume: $${result.totalVolumeUsd}`);
      console.log(`  Disputes: ${result.disputedContracts}`);
      console.log(`  Days inactive: ${result.daysSinceLastContract}`);
      console.log(`  → Score: ${result.score} (${result.tier})`);
    }
  } else {
    // Summary for large scenarios
    const scores = results.map(r => r.score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const tiers = results.reduce((acc, r) => {
      acc[r.tier] = (acc[r.tier] || 0) + 1;
      return acc;
    }, {});
    
    console.log(`  Agents: ${results.length}`);
    console.log(`  Avg Score: ${Math.round(avg)}`);
    console.log(`  Min: ${min}, Max: ${max}`);
    console.log(`  Tiers: ${JSON.stringify(tiers)}`);
  }
}

console.log('\n' + '='.repeat(60));
console.log('STRESS TEST COMPLETE');
console.log('='.repeat(60));

// Edge case tests
console.log('\n🔬 Edge Case Tests:');

const edgeCases = [
  { name: 'Zero successful, max disputes', input: { successfulContracts: 0, totalContracts: 10, disputedContracts: 10, totalVolumeUsd: 0, daysSinceLastContract: 0 }},
  { name: 'Massive volume (>$1M)', input: { successfulContracts: 1000, totalContracts: 1000, disputedContracts: 0, totalVolumeUsd: 2000000, daysSinceLastContract: 0 }},
  { name: 'Extreme inactivity (1 year)', input: { successfulContracts: 50, totalContracts: 50, disputedContracts: 0, totalVolumeUsd: 10000, daysSinceLastContract: 365 }}
];

for (const edge of edgeCases) {
  const result = REPUTATION_FORMULA.calculateAgent(edge.input);
  console.log(`  ${edge.name}: Score=${result.score}, Tier=${result.tier}`);
}
