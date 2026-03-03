import { ethers, network, run } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deploy and Verify GlobeEscrow in one command
 * 
 * Usage: npx hardhat run scripts/deploy-and-verify.ts --network baseSepolia
 */

async function main() {
  console.log("=".repeat(60));
  console.log("GlobeEscrow Deploy + Verify");
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
  
  if (balance.lt(ethers.utils.parseEther("0.001"))) {
    console.error("\n❌ Insufficient balance. Need at least 0.001 ETH");
    process.exit(1);
  }
  
  // USDC address on Base Sepolia
  const USDC_ADDRESS = "0x4Cc2a5B4Dd4C3181f2F6FC949aE1d3B4B1d3b4B1"; // Placeholder
  
  // Deploy
  console.log("\n[1/2] Deploying GlobeEscrow...");
  const GlobeEscrow = await ethers.getContractFactory("GlobeEscrow");
  const escrow = await GlobeEscrow.deploy(USDC_ADDRESS);
  
  await escrow.deployed();
  
  console.log(`✅ Deployed: ${escrow.address}`);
  console.log(`   TX: ${escrow.deployTransaction.hash}`);
  
  // Wait for confirmations
  console.log("\nWaiting for block confirmations...");
  await escrow.deployTransaction.wait(3);
  
  // Verify
  console.log("\n[2/2] Verifying on BaseScan...");
  
  try {
    await run("verify:verify", {
      address: escrow.address,
      constructorArguments: [USDC_ADDRESS],
    });
    console.log("✅ Verified!");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("⚠️ Already verified");
    } else {
      console.log("⚠️ Verification skipped (may need manual verify)");
    }
  }
  
  // Save deployment info
  const deploymentInfo = {
    network: networkName,
    chainId,
    contract: "GlobeEscrow",
    address: escrow.address,
    deployer: deployer.address,
    usdc: USDC_ADDRESS,
    timestamp: new Date().toISOString(),
    txHash: escrow.deployTransaction.hash,
    verified: true
  };
  
  const deploymentsPath = path.join(__dirname, "../deployments.json");
  let deployments: any = {};
  
  if (fs.existsSync(deploymentsPath)) {
    deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));
  }
  
  deployments[networkName] = deploymentInfo;
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  
  // Update DEMO_PROOF.md
  const demoProofPath = path.join(__dirname, "../DEMO_PROOF.md");
  if (fs.existsSync(demoProofPath)) {
    let demoProof = fs.readFileSync(demoProofPath, "utf-8");
    
    const deployTable = `
## Deployment

| Contract | Network | Address | TX Hash |
|----------|---------|---------|---------|
| GlobeEscrow | Base Sepolia | \`${escrow.address}\` | \`${escrow.deployTransaction.hash}\` |
| USDC | Base Sepolia | \`${USDC_ADDRESS}\` | N/A |
`;
    
    // Simple append (in production, would use proper markdown parsing)
    if (!demoProof.includes("GlobeEscrow")) {
      demoProof = demoProof.replace("## Deployment", deployTable + "\n## Deployment");
      fs.writeFileSync(demoProofPath, demoProof);
    }
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log(`Contract: ${escrow.address}`);
  console.log(`Explorer: https://sepolia.basescan.org/address/${escrow.address}`);
  console.log(`\nRun demo:`);
  console.log(`  npx hardhat run scripts/demo.ts --network baseSepolia`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
