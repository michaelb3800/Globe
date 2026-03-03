// Deployment script for GlobeEscrow to Base Sepolia
import { ethers } from "hardhat";

async function main() {
  console.log("Deploying GlobeEscrow to Base Sepolia...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const GlobeEscrow = await ethers.getContractFactory("GlobeEscrow");
  const escrow = await GlobeEscrow.deploy();
  
  await escrow.waitForDeployment();
  const address = await escrow.getAddress();
  
  console.log("GlobeEscrow deployed to:", address);
  
  // Verify events
  console.log("\nContract Events:");
  console.log("- EscrowCreated(bytes32,address,address,address,uint256,uint256)");
  console.log("- Funded(bytes32,address,uint256)");
  console.log("- Delivered(bytes32,address,string)");
  console.log("- Verified(bytes32,address)");
  console.log("- Released(bytes32,address,uint256)");
  console.log("- Disputed(bytes32,address,string)");
  console.log("- Refunded(bytes32,address,uint256)");
  
  console.log("\n✅ Deployment complete!");
  console.log("Update DEPLOYMENT.md with:");
  console.log(`- Contract Address: ${address}`);
  console.log(`- Transaction Hash: (from deployment)`);
  console.log(`- Block: (from deployment)`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
