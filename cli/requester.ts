#!/usr/bin/env node
/**
 * Globe CLI - Requester Agent
 * 
 * Simulates an AI agent requesting services from another agent
 * Usage:
 *   node cli/requester.js [command]
 *   
 * Or run full simulation:
 *   node cli/requester.js simulate
 */

import readline from 'readline';

const API_URL = process.env.API_URL || 'http://localhost:3001';

// Simple in-memory state for demo mode
const state = {
  agentId: null,
  wallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f0fA1',
  services: [],
  offers: [],
  escrows: []
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => rl.question(prompt, resolve));
}

async function api(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  return response.json();
}

async function main() {
  const command = process.argv[2] || 'help';
  
  console.log('\n🌍 Globe CLI - Requester Agent\n' + '='.repeat(40));
  
  switch (command) {
    case 'register':
      await register();
      break;
    case 'discover':
      await discover();
      break;
    case 'create-offer':
      await createOffer();
      break;
    case 'fund':
      await fundEscrow();
      break;
    case 'verify':
      await verify();
      break;
    case 'simulate':
    case 'demo':
      await runSimulation();
      break;
    case 'status':
      await showStatus();
      break;
    default:
      showHelp();
  }
  
  rl.close();
}

function showHelp() {
  console.log(`
Usage: node cli/requester.js <command>

Commands:
  register     Register this agent with the Globe API
  discover     Search for available services
  create-offer Create a service request offer
  fund         Fund an escrow (after offer accepted)
  verify       Verify delivery and release funds
  simulate     Run full demo simulation
  status       Show current agent status
`);
}

async function register() {
  console.log('\n📝 Registering agent...');
  
  try {
    const response = await api('/agents/register', {
      method: 'POST',
      body: JSON.stringify({
        agentId: 'requester-' + Date.now(),
        wallet: state.wallet,
        name: 'Requester Agent',
        capabilities: ['ad_copy', 'content'],
        regionLat: 37.7749,
        regionLon: -122.4194
      })
    });
    
    state.agentId = response.agent?.agentId;
    console.log('✅ Registered:', state.agentId);
  } catch (e) {
    console.log('⚠️  API not available - running in demo mode');
    state.agentId = 'demo-requester-' + Date.now();
    console.log('✅ Demo registration:', state.agentId);
  }
}

async function discover() {
  console.log('\n🔍 Discovering services...');
  
  try {
    const response = await api('/services/search?capability=ad_copy');
    state.services = response.services || [];
    console.log(`Found ${state.services.length} services`);
    state.services.forEach(s => {
      console.log(`  - ${s.agentId}: ${s.capability} ($${s.priceMin}-${s.priceMax})`);
    });
  } catch (e) {
    console.log('⚠️  Using demo services');
    state.services = [
      { serviceId: 'svc-001', agentId: 'provider-001', capability: 'ad_copy', priceMin: 5, priceMax: 10 },
      { serviceId: 'svc-002', agentId: 'provider-002', capability: 'ad_copy', priceMin: 3, priceMax: 8 }
    ];
    console.log('Demo services:', state.services.length);
  }
}

async function createOffer() {
  console.log('\n📋 Creating offer...');
  
  const offer = {
    offerId: 'offer-' + Date.now(),
    requesterAgentId: state.agentId,
    providerAgentId: 'provider-001',
    capability: 'ad_copy',
    price: 5,
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };
  
  state.offers.push(offer);
  console.log('✅ Offer created:', offer.offerId);
  console.log('   To: provider-001');
  console.log('   Price: $' + offer.price);
  console.log('   Capability:', offer.capability);
}

async function fundEscrow() {
  console.log('\n💰 Funding escrow...');
  
  const escrow = {
    escrowId: 'escrow-' + Date.now(),
    offerId: state.offers[0]?.offerId || 'demo-offer',
    amount: 5 * 1000000 // USDC decimals
  };
  
  state.escrows.push(escrow);
  console.log('✅ Escrow funded:', escrow.escrowId);
  console.log('   Amount: $5 USDC');
}

async function verify() {
  console.log('\n✅ Verifying delivery...');
  
  console.log('✅ Verification complete - funds released');
  console.log('💰 Provider can now withdraw');
}

async function showStatus() {
  console.log('\n📊 Agent Status:');
  console.log('  Agent ID:', state.agentId || 'Not registered');
  console.log('  Wallet:', state.wallet);
  console.log('  Services found:', state.services.length);
  console.log('  Offers:', state.offers.length);
  console.log('  Escrows:', state.escrows.length);
}

async function runSimulation() {
  console.log('\n🎬 Running full simulation...\n');
  
  // Step 1: Register
  console.log('1️⃣  Registering requester agent...');
  await register();
  await sleep(500);
  
  // Step 2: Discover
  console.log('\n2️⃣  Discovering services...');
  await discover();
  await sleep(500);
  
  // Step 3: Create offer
  console.log('\n3️⃣  Creating offer...');
  await createOffer();
  await sleep(500);
  
  // Step 4: Fund escrow
  console.log('\n4️⃣  Funding escrow...');
  await fundEscrow();
  await sleep(500);
  
  // Step 5: Verify (simulate provider delivery)
  console.log('\n5️⃣  Provider delivers artifact...');
  console.log('   📦 Artifact: ipfs://QmHash...');
  await sleep(500);
  
  console.log('\n6️⃣  Verifying and releasing...');
  await verify();
  
  console.log('\n' + '='.repeat(40));
  console.log('🎉 Simulation complete!');
  console.log('\nTo view on Globe UI: open ui/index.html');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(console.error);
