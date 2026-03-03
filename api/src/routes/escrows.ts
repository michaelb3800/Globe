import { Router, Request, Response } from 'express';
import { run, get, all } from '../db.js';
import { verifySignedPayload } from '../utils/signature.js';
import { SignedPayloadSchema } from '../models/types.js';
import { randomUUID } from 'crypto';

const router = Router();

// Mock escrow states (in production, read from blockchain)
const mockEscrows = new Map();

// POST /escrows
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    
    const payloadValidation = SignedPayloadSchema.safeParse(body.payload);
    if (!payloadValidation.success) {
      return res.status(400).json({ error: 'Invalid payload format' });
    }

    const data = body.payload.body as {
      offerId: string;
      requesterAgentId: string;
      providerAgentId: string;
      amount: number;
      tokenAddress?: string;
      deadline?: string;
    };

    const offer = get('SELECT * FROM offers WHERE offer_id = ?', [data.offerId]) as any;
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    if (offer.status !== 'accepted') {
      return res.status(400).json({ error: 'Offer must be accepted before creating escrow' });
    }

    const requester = get<{ wallet: string }>('SELECT wallet FROM agents WHERE agent_id = ?', [data.requesterAgentId]);

    const { valid, error } = await verifySignedPayload(
      payloadValidation.data,
      body.signature,
      requester?.wallet || ''
    );

    if (!valid) {
      return res.status(401).json({ error: 'Signature verification failed', details: error });
    }

    const escrowId = '0x' + randomUUID().replace(/-/g, '').slice(0, 64);
    const contractAddress = '0x' + randomUUID().replace(/-/g, '').slice(0, 40);
    const txHash = '0x' + randomUUID().replace(/-/g, '');
    const deadline = data.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const escrow = {
      escrowId,
      offerId: data.offerId,
      requesterAgentId: data.requesterAgentId,
      providerAgentId: data.providerAgentId,
      contractAddress,
      amount: data.amount,
      tokenAddress: data.tokenAddress || '0x0000000000000000000000000000000000000000',
      status: 'funded',
      txCreate: txHash,
      txFund: txHash,
    };

    mockEscrows.set(escrowId, escrow);

    run(`
      INSERT INTO escrows (escrow_id, offer_id, requester_agent_id, provider_agent_id, chain, contract_address, amount, token_address, deadline, status, tx_create, tx_fund, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'local', ?, ?, ?, ?, 'funded', ?, ?, datetime('now'), datetime('now'))
    `, [
      escrowId,
      data.offerId,
      data.requesterAgentId,
      data.providerAgentId,
      contractAddress,
      data.amount,
      escrow.tokenAddress,
      deadline,
      txHash,
      txHash
    ]);

    const requesterAgent = get<{ region_lat: number, region_lon: number }>('SELECT region_lat, region_lon FROM agents WHERE agent_id = ?', [data.requesterAgentId]);
    const providerAgent = get<{ region_lat: number, region_lon: number }>('SELECT region_lat, region_lon FROM agents WHERE agent_id = ?', [data.providerAgentId]);

    run(`
      INSERT INTO events (event_id, type, escrow_id, agent_a, agent_b, amount, capability, lat_a, lon_a, lat_b, lon_b, tx_hash, ts)
      VALUES (?, 'EscrowCreated', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      randomUUID(),
      escrowId,
      data.requesterAgentId,
      data.providerAgentId,
      data.amount,
      offer.capability,
      requesterAgent?.region_lat || 0,
      requesterAgent?.region_lon || 0,
      providerAgent?.region_lat || 0,
      providerAgent?.region_lon || 0,
      txHash
    ]);

    res.status(201).json({ 
      success: true, 
      escrowId,
      contractAddress,
      status: 'funded',
      txHash,
      instructions: 'Escrow funded. Provider can now deliver artifact.'
    });
  } catch (e: any) {
    console.error('Create escrow error:', e);
    res.status(400).json({ error: e.message });
  }
});

// GET /escrows/:escrowId
router.get('/:escrowId', (req: Request, res: Response) => {
  const escrow = get(`
    SELECT e.*, 
           r.region_lat as requester_lat, r.region_lon as requester_lon,
           p.region_lat as provider_lat, p.region_lon as provider_lon,
           o.capability
    FROM escrows e
    JOIN offers o ON e.offer_id = o.offer_id
    JOIN agents r ON e.requester_agent_id = r.agent_id
    JOIN agents p ON e.provider_agent_id = p.agent_id
    WHERE e.escrow_id = ?
  `, [req.params.escrowId]);

  if (!escrow) {
    return res.status(404).json({ error: 'Escrow not found' });
  }

  const e: any = escrow;
  res.json({
    escrowId: e.escrow_id,
    offerId: e.offer_id,
    chain: e.chain,
    contractAddress: e.contract_address,
    amount: e.amount,
    tokenAddress: e.token_address,
    deadline: e.deadline,
    status: e.status,
    txCreate: e.tx_create,
    txFund: e.tx_fund,
    txRelease: e.tx_release,
    requester: { agentId: e.requester_agent_id, region: { lat: e.requester_lat, lon: e.requester_lon } },
    provider: { agentId: e.provider_agent_id, region: { lat: e.provider_lat, lon: e.provider_lon } },
    capability: e.capability,
    createdAt: e.created_at,
    updatedAt: e.updated_at,
  });
});

export default router;
