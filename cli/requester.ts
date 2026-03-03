#!/usr/bin/env node
/**
 * CLI Requester - Simulates a service requester agent
 * 
 * Run locally with Hardhat:
 *   npx hardhat run cli/requester.ts --network localhost
 * 
 * This simulates the requester side of the escrow flow:
 * 1. Creates service request
 * 2. Funds escrow
 * 3. Confirms delivery
 * 4. Releases payment
 */

import { ethers } from "hardhat";

const SERVICE_FEE = ethers.parseEther("0.01");
const DELIVERY_TIMEOUT = 3600; // 1 hour

async function main() {
  console.log("\n🤖 CLI Requester Simulation\n" + "=".repeat(40));
  
  // Get signers
  const [requester] = await ethers.getSigners();
  console.log(`📤 Requester: ${requester.address}`);
  
  const balance = await ethers.provider.getBalance(requester.address);
  console.log(`💰 Balance:   ${ethers.formatEther(balance)} ETH\n`);
  
  // In real usage, would connect to deployed contract
  // For local simulation, we'd use a local instance
  const escrowAddress = process.env.ESCROW_CONTRACT_ADDRESS;
  
  if (!escrowAddress) {
    console.log("⚠️  No ESCROW_CONTRACT_ADDRESS set");
    console.log("   Set environment and run:");
    console.log("   ESCROW_CONTRACT_ADDRESS=0x... npx hardhat run cli/requester.ts\n");
    return;
  }
  
  console.log(`📍 Contract: ${escrowAddress}`);
  console.log("\n📝 Simulating escrow flow...\n");
  
  // Step 1: Create escrow (would be contract call in real flow)
  console.log("Step 1: Creating service request...");
  const serviceId = ethers.keccak256(ethers.toUtf8Bytes("service-" + Date.now()));
  console.log(`   Service ID: ${serviceId}`);
  
  // Step 2: Fund escrow (simulate)
  console.log(`Step 2: Funding escrow with ${ethers.formatEther(SERVICE_FEE)} ETH...`);
  console.log("   (Would send transaction to contract)");
  
  // Step 3: Confirm delivery (simulate)
  console.log("Step 3: Confirming delivery...");
  console.log("   (Would call confirmDelivery() on contract)");
  
  // Step 4: Release payment (simulate)
  console.log("Step 4: Releasing payment...");
  console.log("   (Would call release() on contract)");
  
  console.log("\n" + "=".repeat(40));
  console.log("✅ Requester flow simulation complete!");
  console.log("\n📋 Flow Summary:");
  console.log(`   Service: ${serviceId}`);
  console.log(`   Amount: ${ethers.formatEther(SERVICE_FEE)} ETH`);
  console.log(`   Timeout: ${DELIVERY_TIMEOUT}s\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Requester simulation failed:");
    console.error(error);
    process.exit(1);
  });
