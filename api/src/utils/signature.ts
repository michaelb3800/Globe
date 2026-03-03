import { ethers } from 'ethers';
import { get, run } from '../db.js';

const SIGNING_DOMAIN = 'GlobeProtocol';
const VERSION = '1';

interface SignedPayload {
  action: string;
  chainId: number;
  nonce: number;
  expiresAt: number;
  body: object;
}

export async function verifySignedPayload(
  payload: SignedPayload,
  signature: string,
  expectedSigner: string
): Promise<{ valid: boolean; error?: string }> {
  // Check expiration
  if (payload.expiresAt < Date.now()) {
    return { valid: false, error: 'Payload expired' };
  }

  // Check nonce
  const walletLower = expectedSigner.toLowerCase();
  const nonceRow = get<{ nonce: number }>('SELECT nonce FROM nonces WHERE wallet = ?', [walletLower]);
  const expectedNonce = nonceRow?.nonce ?? -1;
  
  if (payload.nonce < expectedNonce) {
    return { valid: false, error: 'Nonce too low (replay attack?)' };
  }

  // Verify signature
  try {
    const domain = {
      name: SIGNING_DOMAIN,
      version: VERSION,
      chainId: payload.chainId,
    };

    const types = {
      SignedPayload: [
        { name: 'action', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'expiresAt', type: 'uint256' },
        { name: 'body', type: 'string' },
      ],
    };

    const bodyString = JSON.stringify(payload.body);
    const signatureData = {
      action: payload.action,
      chainId: payload.chainId,
      nonce: payload.nonce,
      expiresAt: payload.expiresAt,
      body: bodyString,
    };

    const recovered = ethers.verifyTypedData(domain, types, signatureData, signature);
    
    if (recovered.toLowerCase() !== walletLower) {
      return { valid: false, error: 'Invalid signature' };
    }

    // Update nonce
    run(`
      INSERT INTO nonces (wallet, nonce, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(wallet) DO UPDATE SET nonce = ?, updated_at = datetime('now')
    `, [walletLower, payload.nonce, payload.nonce]);

    return { valid: true };
  } catch (e) {
    return { valid: false, error: `Signature verification failed: ${e}` };
  }
}

export function createTypedData(payload: SignedPayload) {
  const bodyString = JSON.stringify(payload.body);
  return {
    domain: {
      name: SIGNING_DOMAIN,
      version: VERSION,
      chainId: payload.chainId,
    },
    types: {
      SignedPayload: [
        { name: 'action', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'expiresAt', type: 'uint256' },
        { name: 'body', type: 'string' },
      ],
    },
    message: {
      action: payload.action,
      chainId: payload.chainId,
      nonce: payload.nonce,
      expiresAt: payload.expiresAt,
      body: bodyString,
    },
  };
}
