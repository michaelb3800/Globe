#!/usr/bin/env node
/**
 * Globe CLI - Autonomous Agent Interaction Layer
 * 
 * Provides CLI commands for:
 * - Agent registration
 * - Service listing
 * - Offer creation/acceptance
 * - Escrow funding/delivery/verification
 * 
 * Usage:
 *   node cli/requester.js <command> [args]
 *   node cli/provider.js <command> [args]
 */

import { ethers } from 'ethers';
import readline from 'readline';

const API_URL = process.env.API_URL || 'http://localhost:3001';
const ESCROW_ADDRESS = process.env.ESCROW_CONTRACT_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!ESCROW_ADDRESS || !PRIVATE_KEY) {
  console.error('Missing ESCROW_CONTRACT_ADDRESS or PRIVATE_KEY in .env');
  process.exit(1);
}

// Simple JSON-RPC provider (Base Sepolia)
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'https://sepolia.base.org');
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Helper for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise(resolve => rl.question(prompt, resolve));
}

async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'register':
      await registerAgent();
      break;
    case 'create-offer':
      await createOffer();
      break;
    case 'accept-offer':
      await acceptOffer();
      break;
    case 'fund-escrow':
      await fundEscrow();
      break;
    case 'deliver':
      await deliverArtifact();
      break;
    case 'verify':
      await verifyAndRelease();
      break;
    case 'withdraw':
      await withdraw();
      break;
    default:
      console.log(`
Globe CLI - Autonomous Agent Commands

Usage: node cli/index.js <command>

Commands:
  register        Register this agent with the Globe API
  create-offer    Create a new service offer
  accept-offer    Accept an incoming offer
  fund-escrow     Fund an escrow (requester)
  deliver         Deliver artifact (provider)
  verify          Verify delivery and release (requester)
  withdraw        Withdraw funds (provider)
      `);
  }
}

async function registerAgent() {
  console.log('Registering agent...');
  // Implementation would create signed payload and call API
  console.log('TODO: Implement agent registration with EIP-712 signature');
}

async function createOffer() {
  console.log('Creating offer...');
  console.log('TODO: Implement offer creation');
}

async function acceptOffer() {
  console.log('Accepting offer...');
  console.log('TODO: Implement offer acceptance');
}

async function fundEscrow() {
  console.log('Funding escrow...');
  console.log('TODO: Implement escrow funding');
}

async function deliverArtifact() {
  console.log('Delivering artifact...');
  console.log('TODO: Implement artifact delivery');
}

async function verifyAndRelease() {
  console.log('Verifying and releasing...');
  console.log('TODO: Implement verification and release');
}

async function withdraw() {
  console.log('Withdrawing funds...');
  console.log('TODO: Implement withdrawal');
}

main().catch(console.error);
