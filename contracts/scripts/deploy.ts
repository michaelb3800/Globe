// Deployment script for GlobeEscrow to Base Sepolia
// Run with: npx hardhat run scripts/deploy.ts --network baseSepolia

import { ethers } from "hardhat";

async function main() {
  console.log("Deploying GlobeEscrow to Base Sepolia...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  
  const GlobeEscrow = await ethers.getContractFactory("GlobeEscrow");
  const escrow = await GlobeEscrow.deploy();
  
  await escrow.waitForDeployment();
  const address = await escrow.getAddress();
  
  console.log("\n✅ GlobeEscrow deployed to:", address);
  
  // Verify events
  console.log("\nContract Events:");
  console.log("- EscrowCreated(bytes32,address,address,address,uint256,uint256)");
  console.log("- Funded(bytes32,address,uint256)");
  console.log("- Delivered(bytes32,address,string)");
  console.log("- Verified(bytes32,address)");
  console.log("- Released(bytes32,address,uint256)");
  console.log("- Disputed(bytes32,address,string)");
  console.log("- Cancelled(bytes32,address)");
  console.log("- Refunded(bytes32,address,uint256)");
  
  console.log("\n📝 Update .env with:");
  console.log(`ESCROW_CONTRACT_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
