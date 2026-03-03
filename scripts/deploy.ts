import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deploy GlobeEscrow to Base Sepolia
 * 
 * Usage: npx hardhat run scripts/deploy.ts --network baseSepolia
 */

async function main() {
  console.log("=".repeat(60));
  console.log("GlobeEscrow Deployment");
  console.log("=".repeat(60));
  
  const networkName = network.name;
  const chainId = network.config.chainId;
  
  console.log(`\nNetwork: ${networkName}`);
  console.log(`Chain ID: ${chainId}`);
  
  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  
  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.utils.formatEther(balance)} ETH`);
  
  // USDC address on Base Sepolia
  // Note: Verify this address before deploying
  const USDC_ADDRESS = "0x4Cc2a5B4Dd4C3181f2F6FC949aE1d3B4B1d3b4B1"; // Placeholder - verify!
  
  console.log(`\nUSDC Token: ${USDC_ADDRESS}`);
  
  // Deploy GlobeEscrow
  console.log("\nDeploying GlobeEscrow...");
  const GlobeEscrow = await ethers.getContractFactory("GlobeEscrow");
  const escrow = await GlobeEscrow.deploy(USDC_ADDRESS);
  
  await escrow.deployed();
  
  console.log(`\n✅ GlobeEscrow deployed!`);
  console.log(`   Address: ${escrow.address}`);
  console.log(`   Transaction: ${escrow.deployTransaction.hash}`);
  
  // Save deployment info
  const deploymentInfo = {
    network: networkName,
    chainId,
    contract: "GlobeEscrow",
    address: escrow.address,
    deployer: deployer.address,
    usdc: USDC_ADDRESS,
    timestamp: new Date().toISOString(),
    txHash: escrow.deployTransaction.hash
  };
  
  // Write to deployments.json
  const deploymentsPath = path.join(__dirname, "../deployments.json");
  let deployments: any = {};
  
  if (fs.existsSync(deploymentsPath)) {
    deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));
  }
  
  deployments[networkName] = deploymentInfo;
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  
  console.log(`\n📝 Deployment info saved to: ${deploymentsPath}`);
  
  // Verify on explorer
  console.log("\n" + "=".repeat(60));
  console.log("NEXT STEPS:");
  console.log("=".repeat(60));
  console.log(`1. Verify on BaseScan: https://sepolia.basescan.org/address/${escrow.address}`);
  console.log(`2. Update CONTRACTS.md with address`);
  console.log(`3. Run: npx hardhat run scripts/verify.ts --network baseSepolia`);
  
  return escrow.address;
}

main()
  .then((address) => {
    console.log(`\n🎉 Deployment complete! Contract: ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
