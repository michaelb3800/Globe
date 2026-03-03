import { Router, Request, Response } from 'express';
import { run, get, all } from '../db.js';
import { verifySignedPayload } from '../utils/signature.js';
import { CreateServiceSchema, SignedPayloadSchema } from '../models/types.js';

const router = Router();

// POST /services
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    
    const payloadValidation = SignedPayloadSchema.safeParse(body.payload);
    if (!payloadValidation.success) {
      return res.status(400).json({ error: 'Invalid payload format' });
    }

    const data = CreateServiceSchema.parse(body.payload.body);

    const agent = get<{ wallet: string }>('SELECT wallet FROM agents WHERE agent_id = ?', [data.agentId]);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const { valid, error } = await verifySignedPayload(
      payloadValidation.data,
      body.signature,
      agent.wallet
    );

    if (!valid) {
      return res.status(401).json({ error: 'Signature verification failed', details: error });
    }

    const existing = get('SELECT service_id FROM services WHERE service_id = ?', [data.serviceId]);
    if (existing) {
      return res.status(409).json({ error: 'Service already exists' });
    }

    run(`
      INSERT INTO services (service_id, agent_id, capability, description, price_min, price_max, pricing_model, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      data.serviceId,
      data.agentId,
      data.capability,
      data.description || null,
      data.priceMin || null,
      data.priceMax || null,
      JSON.stringify(data.pricingModel || {})
    ]);

    res.status(201).json({ success: true, serviceId: data.serviceId });
  } catch (e: any) {
    console.error('Create service error:', e);
    res.status(400).json({ error: e.message });
  }
});

// GET /services/search
router.get('/search', (req: Request, res: Response) => {
  const { capability, maxPrice, agentId } = req.query;

  let sql = 'SELECT * FROM services WHERE active = 1';
  const params: any[] = [];

  if (capability) {
    sql += ' AND capability = ?';
    params.push(capability);
  }

  if (maxPrice) {
    sql += ' AND (price_max IS NULL OR price_max <= ?)';
    params.push(Number(maxPrice));
  }

  if (agentId) {
    sql += ' AND agent_id = ?';
    params.push(agentId);
  }

  sql += ' ORDER BY created_at DESC LIMIT 50';

  const services = all(sql, params);

  res.json({
    services: (services as any[]).map(s => ({
      serviceId: s.service_id,
      agentId: s.agent_id,
      capability: s.capability,
      description: s.description,
      priceMin: s.price_min,
      priceMax: s.price_max,
      createdAt: s.created_at,
    }))
  });
});

// GET /services/:serviceId
router.get('/:serviceId', (req: Request, res: Response) => {
  const service = get(`
    SELECT s.*, a.name as agent_name, a.reputation_score, a.region_lat, a.region_lon
    FROM services s
    JOIN agents a ON s.agent_id = a.agent_id
    WHERE s.service_id = ?
  `, [req.params.serviceId]);

  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }

  const s: any = service;
  res.json({
    serviceId: s.service_id,
    agentId: s.agent_id,
    agentName: s.agent_name,
    capability: s.capability,
    description: s.description,
    priceMin: s.price_min,
    priceMax: s.price_max,
    pricingModel: JSON.parse(s.pricing_model || '{}'),
    reputationScore: s.reputation_score,
    region: { lat: s.region_lat, lon: s.region_lon },
    createdAt: s.created_at,
  });
});

export default router;
