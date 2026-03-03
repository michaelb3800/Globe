import { run, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Verify GlobeEscrow on BaseScan
 * 
 * Usage: npx hardhat run scripts/verify.ts --network baseSepolia
 */

async function main() {
  console.log("=".repeat(60));
  console.log("GlobeEscrow Verification");
  console.log("=".repeat(60));
  
  const networkName = network.name;
  
  // Load deployment info
  const deploymentsPath = path.join(__dirname, "../deployments.json");
  
  if (!fs.existsSync(deploymentsPath)) {
    console.error("❌ No deployment found. Run deploy.ts first.");
    process.exit(1);
  }
  
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));
  const deployment = deployments[networkName];
  
  if (!deployment) {
    console.error(`❌ No deployment found for network: ${networkName}`);
    process.exit(1);
  }
  
  console.log(`\nVerifying: ${deployment.contract}`);
  console.log(`Address: ${deployment.address}`);
  console.log(`Network: ${networkName}`);
  
  try {
    console.log("\nRunning verification...");
    
    await run("verify:verify", {
      address: deployment.address,
      constructorArguments: [deployment.usdc],
    });
    
    console.log("\n✅ Verification complete!");
    console.log(`   Explorer: https://sepolia.basescan.org/address/${deployment.address}`);
    
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("\n⚠️ Contract already verified!");
    } else {
      console.error("\n❌ Verification failed:", error.message);
      process.exit(1);
    }
  }
  
  // Update deployment with verified flag
  deployment.verified = true;
  deployment.verifiedAt = new Date().toISOString();
  deployments[networkName] = deployment;
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  
  console.log("\n📝 Verification status updated.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
