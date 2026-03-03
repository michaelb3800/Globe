import { Router, Request, Response } from 'express';
import { run, get, all } from '../db.js';
import { verifySignedPayload } from '../utils/signature.js';
import { CreateOfferSchema, SignedPayloadSchema } from '../models/types.js';
import { randomUUID } from 'crypto';

const router = Router();

// POST /offers
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    
    const payloadValidation = SignedPayloadSchema.safeParse(body.payload);
    if (!payloadValidation.success) {
      return res.status(400).json({ error: 'Invalid payload format' });
    }

    const data = CreateOfferSchema.parse(body.payload.body);

    const requester = get<{ wallet: string }>('SELECT wallet FROM agents WHERE agent_id = ?', [data.requesterAgentId]);
    if (!requester) {
      return res.status(404).json({ error: 'Requester agent not found' });
    }

    const { valid, error } = await verifySignedPayload(
      payloadValidation.data,
      body.signature,
      requester.wallet
    );

    if (!valid) {
      return res.status(401).json({ error: 'Signature verification failed', details: error });
    }

    const provider = get('SELECT agent_id FROM agents WHERE agent_id = ?', [data.providerAgentId]);
    if (!provider) {
      return res.status(404).json({ error: 'Provider agent not found' });
    }

    const expiresAt = payloadValidation.data.expiresAt;

    run(`
      INSERT INTO offers (offer_id, requester_agent_id, provider_agent_id, service_id, capability, price, deadline, nonce, expires_at, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
    `, [
      data.offerId,
      data.requesterAgentId,
      data.providerAgentId,
      data.serviceId || null,
      data.capability,
      data.price,
      data.deadline || null,
      payloadValidation.data.nonce,
      new Date(expiresAt).toISOString()
    ]);

    res.status(201).json({ success: true, offerId: data.offerId, status: 'pending' });
  } catch (e: any) {
    console.error('Create offer error:', e);
    res.status(400).json({ error: e.message });
  }
});

// POST /offers/:offerId/accept
router.post('/:offerId/accept', async (req: Request, res: Response) => {
  try {
    const { offerId } = req.params;
    const body = req.body;

    const payloadValidation = SignedPayloadSchema.safeParse(body.payload);
    if (!payloadValidation.success) {
      return res.status(400).json({ error: 'Invalid payload format' });
    }

    const offer = get('SELECT * FROM offers WHERE offer_id = ?', [offerId]) as any;
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    if (offer.status !== 'pending') {
      return res.status(400).json({ error: `Offer is ${offer.status}` });
    }

    const provider = get<{ wallet: string }>('SELECT wallet FROM agents WHERE agent_id = ?', [offer.provider_agent_id]);

    const { valid, error } = await verifySignedPayload(
      payloadValidation.data,
      body.signature,
      provider?.wallet || ''
    );

    if (!valid) {
      return res.status(401).json({ error: 'Signature verification failed', details: error });
    }

    run("UPDATE offers SET status = 'accepted', expires_at = ? WHERE offer_id = ?",
      [new Date(payloadValidation.data.expiresAt).toISOString(), offerId]);

    res.json({ success: true, offerId, status: 'accepted' });
  } catch (e: any) {
    console.error('Accept offer error:', e);
    res.status(400).json({ error: e.message });
  }
});

// GET /offers/:offerId
router.get('/:offerId', (req: Request, res: Response) => {
  const offer = get(`
    SELECT o.*, 
           r.name as requester_name, r.region_lat as requester_lat, r.region_lon as requester_lon,
           p.name as provider_name, p.region_lat as provider_lat, p.region_lon as provider_lon
    FROM offers o
    JOIN agents r ON o.requester_agent_id = r.agent_id
    JOIN agents p ON o.provider_agent_id = p.agent_id
    WHERE o.offer_id = ?
  `, [req.params.offerId]);

  if (!offer) {
    return res.status(404).json({ error: 'Offer not found' });
  }

  const o: any = offer;
  res.json({
    offerId: o.offer_id,
    requesterAgentId: o.requester_agent_id,
    providerAgentId: o.provider_agent_id,
    serviceId: o.service_id,
    capability: o.capability,
    price: o.price,
    deadline: o.deadline,
    status: o.status,
    expiresAt: o.expires_at,
    createdAt: o.created_at,
    requester: { name: o.requester_name, region: { lat: o.requester_lat, lon: o.requester_lon } },
    provider: { name: o.provider_name, region: { lat: o.provider_lat, lon: o.provider_lon } },
  });
});

export default router;
