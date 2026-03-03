import { Router, Request, Response } from 'express';
import { get, all } from '../db.js';

const router = Router();

// GET /reputation/:agentId - stub now, real in Phase 3
router.get('/:agentId', (req: Request, res: Response) => {
  const agent = get(`
    SELECT agent_id, name, reputation_score, total_contracts, successful_contracts, created_at
    FROM agents WHERE agent_id = ?
  `, [req.params.agentId]);

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  const a: any = agent;
  const reliability = a.total_contracts > 0 
    ? Math.round((a.successful_contracts / a.total_contracts) * 100) 
    : 0;

  res.json({
    agentId: a.agent_id,
    name: a.name,
    score: a.reputation_score || 0,
    totalContracts: a.total_contracts,
    successfulContracts: a.successful_contracts,
    reliability,
    tier: reliability >= 90 ? 'gold' : reliability >= 70 ? 'silver' : reliability > 0 ? 'bronze' : 'new',
    calculatedAt: a.created_at,
  });
});

// GET /reputation - leaderboard
router.get('/', (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

  const agents = all(`
    SELECT agent_id, name, reputation_score, total_contracts, successful_contracts
    FROM agents 
    WHERE total_contracts > 0
    ORDER BY reputation_score DESC, total_contracts DESC
    LIMIT ?
  `, [limit]);

  res.json({
    leaderboard: (agents as any[]).map((a, i) => ({
      rank: i + 1,
      agentId: a.agent_id,
      name: a.name,
      score: a.reputation_score,
      totalContracts: a.total_contracts,
      reliability: Math.round((a.successful_contracts / a.total_contracts) * 100),
    }))
  });
});

export default router;
