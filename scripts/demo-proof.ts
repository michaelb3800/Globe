#!/usr/bin/env node
/**
 * DEMO_PROOF Automation Script
 * 
 * Appends deployment proof to DEMO_PROOF.md
 * Usage:
 *   npx ts-node scripts/demo-proof.ts --commit <commit> --address <address> --tx <txHash>
 *   npx ts-node scripts/demo-proof.ts --network base-sepolia
 */

import fs from 'fs';
import path from 'path';

const DEMO_PROOF_PATH = path.join(__dirname, '..', 'DEMO_PROOF.md');

interface DeploymentProof {
  commit?: string;
  address?: string;
  txHash?: string;
  network?: string;
  timestamp: string;
  deployedBy?: string;
}

// Mock deployment info - in real usage, would be passed via args or read from deployment.json
function getDeploymentInfo(): DeploymentProof {
  const args = process.argv.slice(2);
  const proof: DeploymentProof = {
    timestamp: new Date().toISOString()
  };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--commit' && args[i + 1]) proof.commit = args[i + 1];
    if (args[i] === '--address' && args[i + 1]) proof.address = args[i + 1];
    if (args[i] === '--tx' && args[i + 1]) proof.txHash = args[i + 1];
    if (args[i] === '--network' && args[i + 1]) proof.network = args[i + 1];
  }
  
  return proof;
}

function appendProof(proof: DeploymentProof): void {
  // Create DEMO_PROOF.md if it doesn't exist
  if (!fs.existsSync(DEMO_PROOF_PATH)) {
    const header = `# DEMO_PROOF.md - Globe Protocol Deployment Proof

This file tracks deployment proof for the Globe Protocol MVP.

## Deployment History

| Date | Network | Commit | Contract Address | TX Hash | Deployed By |
|------|---------|--------|------------------|---------|-------------|
`;
    fs.writeFileSync(DEMO_PROOF_PATH, header);
  }
  
  // Read existing content
  const existing = fs.readFileSync(DEMO_PROOF_PATH, 'utf-8');
  
  // Parse last row to get deployer info (or use default)
  const deployer = proof.deployedBy || 'OpenClawBot2';
  const date = proof.timestamp.split('T')[0];
  
  // Append new row
  const newRow = `| ${date} | ${proof.network || 'N/A'} | ${proof.commit || 'N/A'} | ${proof.address || 'N/A'} | ${proof.txHash ? `[${proof.txHash.slice(0,10)}...](https://sepolia.basescan.org/tx/${proof.txHash})` : 'N/A'} | ${deployer} |\n`;
  
  // Find the table end (last | in the header section)
  const tableEnd = existing.lastIndexOf('|');
  const content = existing.slice(0, tableEnd + 1) + '\n' + newRow + existing.slice(tableEnd + 1);
  
  fs.writeFileSync(DEMO_PROOF_PATH, content);
  
  console.log(`✅ Added deployment proof to ${DEMO_PROOF_PATH}`);
  console.log(`   Commit: ${proof.commit || 'N/A'}`);
  console.log(`   Address: ${proof.address || 'N/A'}`);
  console.log(`   TX: ${proof.txHash || 'N/A'}`);
}

// CLI entry point
const proof = getDeploymentInfo();

if (!proof.commit && !proof.address) {
  console.log(`
DEMO_PROOF Automation Script

Usage:
  npx ts-node scripts/demo-proof.ts --commit <commit> --address <address> --tx <txHash> --network <network>
  npx ts-node scripts/demo-proof.ts --network base-sepolia

Options:
  --commit <hash>   Git commit hash
  --address <addr>  Deployed contract address
  --tx <hash>      Transaction hash
  --network <name>  Network name (e.g., base-sepolia)
  `);
  process.exit(0);
}

appendProof(proof);
