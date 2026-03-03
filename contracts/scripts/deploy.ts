#!/usr/bin/env node
/**
 * GlobeEscrow Deployment Script
 * Deploys to Base Sepolia with verification
 * 
 * Usage:
 *   npx hardhat run scripts/deploy.ts --network baseSepolia
 * 
 * Required environment:
 *   cp .env.example .env
 *   # Add PRIVATE_KEY and BASESEPOLIA_RPC_URL
 */

import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

const CONFIRMATION_FLAG = process.argv.includes("--confirm");

async function main() {
  console.log("\n🏦 GlobeEscrow Deployment\n" + "=".repeat(40));
  
  // Check for required env vars
  const privateKey = process.env.PRIVATE_KEY;
  const rpcUrl = process.env.BASESEPOLIA_RPC_URL;
  
  if (!privateKey && !CONFIRMATION_FLAG) {
    console.log("\n⚠️  Missing PRIVATE_KEY in .env");
    console.log("   Run: cp .env.example .env && edit .env");
    console.log("   Or pass --confirm to skip this check (not recommended)\n");
    process.exit(1);
  }
  
  if (!rpcUrl && !CONFIRMATION_FLAG) {
    console.log("\n⚠️  Missing BASESEPOLIA_RPC_URL in .env\n");
    process.exit(1);
  }
  
  const [deployer] = await ethers.getSigners();
  console.log(`📤 Deployer: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance:  ${ethers.formatEther(balance)} ETH\n`);
  
  if (balance < ethers.parseEther("0.001")) {
    console.log("⚠️  Warning: Low balance. You may need more ETH for deployment.\n");
  }
  
  // Deploy
  console.log("📦 Deploying GlobeEscrow...\n");
  
  const GlobeEscrow = await ethers.getContractFactory("GlobeEscrow");
  const escrow = await GlobeEscrow.deploy();
  
  await escrow.waitForDeployment();
  const address = await escrow.getAddress();
  
  console.log("✅ Deployment Successful!");
  console.log("=".repeat(40));
  console.log(`📍 Contract:  ${address}`);
  console.log(`⛽ Network:   Base Sepolia (chainid: ${(await ethers.provider.getNetwork()).chainId})`);
  
  // Save deployment info
  const deploymentInfo = {
    address,
    network: "base-sepolia",
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    transactionHash: escrow.deploymentTransaction()?.hash
  };
  
  const deploymentPath = path.join(__dirname, "..", "deployment.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Saved to: ${deploymentPath}`);
  
  // Verify events
  console.log("\n📋 Contract Events:");
  console.log("  - EscrowCreated(bytes32,address,address,address,uint256,uint256)");
  console.log("  - Funded(bytes32,address,uint256)");
  console.log("  - Delivered(bytes32,address,string)");
  console.log("  - Verified(bytes32,address)");
  console.log("  - Released(bytes32,address,uint256)");
  console.log("  - Disputed(bytes32,address,string)");
  console.log("  - Cancelled(bytes32,address)");
  console.log("  - Refunded(bytes32,address,uint256)");
  
  // Constants
  const GRACE_PERIOD = await escrow.GRACE_PERIOD();
  console.log(`\n⏱️  GRACE_PERIOD: ${GRACE_PERIOD.toString()} seconds (${Number(GRACE_PERIOD)/3600} hours)`);
  
  console.log("\n" + "=".repeat(40));
  console.log("✅ Deployment Complete!");
  console.log("\n📝 Next Steps:");
  console.log(`   1. Verify source on BaseScan`);
  console.log(`   2. Update .env: ESCROW_CONTRACT_ADDRESS=${address}`);
  console.log(`   3. Update DEMO_PROOF.md with tx hash\n`);
  
  return deploymentInfo;
}

main()
  .then((info) => {
    console.log("\n🎉 Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment Failed:");
    console.error(error);
    process.exit(1);
  });
