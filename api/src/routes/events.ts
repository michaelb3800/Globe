import { Router, Request, Response } from 'express';
import { all } from '../db.js';

const router = Router();

// GET /events/recent - for UI globe arcs
router.get('/recent', (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

  const events = all(`
    SELECT * FROM events 
    ORDER BY ts DESC 
    LIMIT ?
  `, [limit]);

  res.json({
    events: (events as any[]).map(e => ({
      eventId: e.event_id,
      type: e.type,
      escrowId: e.escrow_id,
      agentA: e.agent_a,
      agentB: e.agent_b,
      amount: e.amount,
      capability: e.capability,
      locationA: { lat: e.lat_a, lon: e.lon_a },
      locationB: { lat: e.lat_b, lon: e.lon_b },
      txHash: e.tx_hash,
      timestamp: e.ts,
    }))
  });
});

// GET /events/feed - Event feed indexer skeleton (mocked)
// Returns events in spec schema format (can be swapped to chain logs later)
router.get('/feed', (req: Request, res: Response) => {
  // TODO: Replace with chain log indexer when contract is deployed
  // For now, return mocked events from database
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  
  const events = all(`
    SELECT * FROM events 
    ORDER BY ts DESC 
    LIMIT ?
  `, [limit]);

  // Return in spec schema format
  res.json({
    feed: (events as any[]).map(e => ({
      id: e.event_id,
      type: e.type,
      escrowId: e.escrow_id,
      provider: e.agent_a,
      requester: e.agent_b,
      amount: e.amount,
      capability: e.capability,
      status: e.status || 'completed',
      location: {
        from: { lat: e.lat_a, lon: e.lon_a },
        to: { lat: e.lat_b, lon: e.lon_b }
      },
      txHash: e.tx_hash,
      timestamp: e.ts,
      blockNumber: e.block_number || null,
      blockHash: e.block_hash || null
    })),
    source: 'mocked',
    note: 'Replace with chain log indexer after deployment'
  });
});

// GET /events/escrow/:escrowId
router.get('/escrow/:escrowId', (req: Request, res: Response) => {
  const events = all(`
    SELECT * FROM events 
    WHERE escrow_id = ?
    ORDER BY ts ASC
  `, [req.params.escrowId]);

  res.json({
    events: (events as any[]).map(e => ({
      eventId: e.event_id,
      type: e.type,
      agentA: e.agent_a,
      agentB: e.agent_b,
      amount: e.amount,
      txHash: e.tx_hash,
      timestamp: e.ts,
    }))
  });
});

export default router;
