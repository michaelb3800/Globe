#!/usr/bin/env node
/**
 * Globe CLI - Provider Agent
 * 
 * Simulates an AI agent providing services to requesters
 * Usage:
 *   node cli/provider.js [command]
 *   
 * Or run full simulation:
 *   node cli/provider.js simulate
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';

// Simple in-memory state for demo mode
const state = {
  agentId: null,
  wallet: '0x8Ba1f109551bD432803012645Ac136ddd64DBA72',
  offers: [],
  deliveries: []
};

const rl = require('readline').createInterface({
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
  
  console.log('\n🌍 Globe CLI - Provider Agent\n' + '='.repeat(40));
  
  switch (command) {
    case 'register':
      await register();
      break;
    case 'listen':
      await listen();
      break;
    case 'accept':
      await acceptOffer();
      break;
    case 'deliver':
      await deliver();
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
Usage: node cli/provider.js <command>

Commands:
  register     Register this agent with the Globe API
  listen       Listen for incoming offers
  accept       Accept an incoming offer
  deliver      Deliver completed work
  simulate     Run full demo simulation
  status       Show current agent status
`);
}

async function register() {
  console.log('\n📝 Registering provider agent...');
  
  try {
    const response = await api('/agents/register', {
      method: 'POST',
      body: JSON.stringify({
        agentId: 'provider-' + Date.now(),
        wallet: state.wallet,
        name: 'Provider Agent',
        capabilities: ['ad_copy', 'content', 'translation'],
        regionLat: 40.7128,
        regionLon: -74.0060,
        pricingModel: { ad_copy: { min: 5, max: 10 } }
      })
    });
    
    state.agentId = response.agent?.agentId;
    console.log('✅ Registered:', state.agentId);
  } catch (e) {
    console.log('⚠️  Running in demo mode');
    state.agentId = 'demo-provider-' + Date.now();
    console.log('✅ Demo registration:', state.agentId);
  }
}

async function listen() {
  console.log('\n👂 Listening for offers...');
  console.log('   (In production, this would be a websocket or polling loop)');
  
  // Simulate incoming offer
  setTimeout(() => {
    console.log('\n📬 New offer received!');
    console.log('   From: requester-001');
    console.log('   Service: ad_copy');
    console.log('   Price: $5 USDC');
    
    state.offers.push({
      offerId: 'offer-' + Date.now(),
      requester: 'requester-001',
      capability: 'ad_copy',
      price: 5
    });
  }, 2000);
}

async function acceptOffer() {
  console.log('\n✅ Accepting offer...');
  console.log('   Offer accepted!');
  console.log('   Escrow will be created by requester');
}

async function deliver() {
  console.log('\n📦 Delivering artifact...');
  
  const artifact = {
    deliveryId: 'delivery-' + Date.now(),
    artifactHash: 'ipfs://Qm' + Math.random().toString(36).substr(2, 44),
    metadata: {
      type: 'ad_copy',
      format: 'json',
      preview: 'Sample ad copy...'
    }
  };
  
  state.deliveries.push(artifact);
  console.log('✅ Delivered:', artifact.artifactHash);
  console.log('   Waiting for requester verification...');
}

async function showStatus() {
  console.log('\n📊 Provider Status:');
  console.log('  Agent ID:', state.agentId || 'Not registered');
  console.log('  Wallet:', state.wallet);
  console.log('  Offers received:', state.offers.length);
  console.log('  Deliveries:', state.deliveries.length);
}

async function runSimulation() {
  console.log('\n🎬 Running provider simulation...\n');
  
  // Step 1: Register
  console.log('1️⃣  Registering provider agent...');
  await register();
  await sleep(500);
  
  // Step 2: Listen for offers
  console.log('\n2️⃣  Listening for offers...');
  await listen();
  await sleep(2500);
  
  // Step 3: Accept offer
  console.log('\n3️⃣  Accepting offer...');
  await acceptOffer();
  await sleep(500);
  
  // Step 4: Deliver work
  console.log('\n4️⃣  Completing work...');
  await sleep(1000);
  
  console.log('\n5️⃣  Delivering artifact...');
  await deliver();
  
  console.log('\n' + '='.repeat(40));
  console.log('🎉 Provider simulation complete!');
  console.log('\nWaiting for requester verification...');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(console.error);
