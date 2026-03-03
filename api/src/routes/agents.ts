import { Router, Request, Response } from 'express';
import { run, get, all } from '../db.js';
import { verifySignedPayload } from '../utils/signature.js';
import { RegisterAgentSchema, UpdateAgentSchema, SignedPayloadSchema } from '../models/types.js';

const router = Router();

// DEMO MODE: Simple registration without signature
router.post('/register-demo', (req: Request, res: Response) => {
  try {
    const { agentId, wallet, name, capabilities, regionLat, regionLon } = req.body;
    
    if (!agentId || !wallet) {
      return res.status(400).json({ error: 'agentId and wallet required' });
    }

    const existing = get('SELECT agent_id FROM agents WHERE agent_id = ? OR wallet = ?', [agentId, wallet]);
    if (existing) {
      return res.json({ success: true, agent: { agentId, wallet, name }, message: 'Agent already exists' });
    }

    const lat = regionLat ?? (Math.random() * 180 - 90);
    const lon = regionLon ?? (Math.random() * 360 - 180);

    run(`
      INSERT INTO agents (agent_id, wallet, name, capabilities, region_lat, region_lon, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [agentId, wallet, name || 'Demo Agent', JSON.stringify(capabilities || []), lat, lon]);

    res.json({ success: true, agent: { agentId, wallet, name: name || 'Demo Agent' } });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /agents/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    
    const payloadValidation = SignedPayloadSchema.safeParse(body.payload);
    if (!payloadValidation.success) {
      return res.status(400).json({ error: 'Invalid payload format', details: payloadValidation.error.errors });
    }

    const { valid, error } = await verifySignedPayload(
      payloadValidation.data,
      body.signature,
      body.wallet
    );

    if (!valid) {
      return res.status(401).json({ error: 'Signature verification failed', details: error });
    }

    const data = RegisterAgentSchema.parse(body.payload.body);
    const wallet = body.wallet.toLowerCase();

    const existing = get('SELECT agent_id FROM agents WHERE agent_id = ? OR wallet = ?', [data.agentId, wallet]);

    if (existing) {
      return res.status(409).json({ error: 'Agent already exists' });
    }

    const lat = data.regionLat ?? (Math.random() * 180 - 90);
    const lon = data.regionLon ?? (Math.random() * 360 - 180);

    run(`
      INSERT INTO agents (agent_id, wallet, name, capabilities, pricing_model, region_lat, region_lon, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      data.agentId,
      wallet,
      data.name || null,
      JSON.stringify(data.capabilities),
      JSON.stringify(data.pricingModel || {}),
      lat,
      lon
    ]);

    run('INSERT OR IGNORE INTO nonces (wallet, nonce) VALUES (?, 0)', [wallet]);

    res.status(201).json({ 
      success: true, 
      agentId: data.agentId,
      wallet,
      region: { lat, lon }
    });
  } catch (e: any) {
    console.error('Register error:', e);
    res.status(400).json({ error: e.message });
  }
});

// PATCH /agents/:agentId
router.patch('/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const body = req.body;

    const payloadValidation = SignedPayloadSchema.safeParse(body.payload);
    if (!payloadValidation.success) {
      return res.status(400).json({ error: 'Invalid payload format' });
    }

    const agent = get<{ wallet: string }>('SELECT wallet FROM agents WHERE agent_id = ?', [agentId]);
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

    const data = UpdateAgentSchema.parse(body.payload.body);
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
    if (data.capabilities !== undefined) { updates.push('capabilities = ?'); values.push(JSON.stringify(data.capabilities)); }
    if (data.pricingModel !== undefined) { updates.push('pricing_model = ?'); values.push(JSON.stringify(data.pricingModel)); }
    if (data.regionLat !== undefined) { updates.push('region_lat = ?'); values.push(data.regionLat); }
    if (data.regionLon !== undefined) { updates.push('region_lon = ?'); values.push(data.regionLon); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push("updated_at = datetime('now')");
    values.push(agentId);

    run(`UPDATE agents SET ${updates.join(', ')} WHERE agent_id = ?`, values);

    res.json({ success: true, agentId });
  } catch (e: any) {
    console.error('Update error:', e);
    res.status(400).json({ error: e.message });
  }
});

// GET /agents/:agentId
router.get('/:agentId', (req: Request, res: Response) => {
  const agent = get(`
    SELECT agent_id, wallet, name, capabilities, pricing_model, region_lat, region_lon,
           reputation_score, total_contracts, successful_contracts, created_at
    FROM agents WHERE agent_id = ?
  `, [req.params.agentId]);

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  const a: any = agent;
  res.json({
    agentId: a.agent_id,
    wallet: a.wallet,
    name: a.name,
    capabilities: JSON.parse(a.capabilities || '[]'),
    pricingModel: JSON.parse(a.pricing_model || '{}'),
    region: { lat: a.region_lat, lon: a.region_lon },
    reputationScore: a.reputation_score,
    totalContracts: a.total_contracts,
    successfulContracts: a.successful_contracts,
    createdAt: a.created_at,
  });
});

export default router;
