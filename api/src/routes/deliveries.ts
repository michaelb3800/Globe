import { Router, Request, Response } from 'express';
import { run, get, all } from '../db.js';
import { verifySignedPayload } from '../utils/signature.js';
import { SubmitDeliverySchema, SubmitVerificationSchema, SignedPayloadSchema } from '../models/types.js';
import { randomUUID } from 'crypto';

const router = Router({ mergeParams: true });

// POST /escrows/:escrowId/deliver
router.post('/:escrowId/deliver', async (req: Request, res: Response) => {
  try {
    const { escrowId } = req.params;
    const body = req.body;

    const payloadValidation = SignedPayloadSchema.safeParse(body.payload);
    if (!payloadValidation.success) {
      return res.status(400).json({ error: 'Invalid payload format' });
    }

    const data = SubmitDeliverySchema.parse(body.payload.body);

    const escrow = get('SELECT * FROM escrows WHERE escrow_id = ?', [escrowId]) as any;
    if (!escrow) {
      return res.status(404).json({ error: 'Escrow not found' });
    }

    if (escrow.status !== 'funded') {
      return res.status(400).json({ error: `Cannot deliver in ${escrow.status} state` });
    }

    const provider = get<{ wallet: string }>('SELECT wallet FROM agents WHERE agent_id = ?', [escrow.provider_agent_id]);

    const { valid, error } = await verifySignedPayload(
      payloadValidation.data,
      body.signature,
      provider?.wallet || ''
    );

    if (!valid) {
      return res.status(401).json({ error: 'Signature verification failed', details: error });
    }

    const deliveryId = data.deliveryId || 'del_' + randomUUID().slice(0, 8);
    run(`
      INSERT INTO deliveries (delivery_id, escrow_id, agent_id, artifact_hash, attestation, delivered_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `, [deliveryId, escrowId, escrow.provider_agent_id, data.artifactHash, data.attestation || null]);

    run("UPDATE escrows SET status = 'delivered', updated_at = datetime('now') WHERE escrow_id = ?", [escrowId]);

    const requesterAgent = get<{ region_lat: number, region_lon: number }>('SELECT region_lat, region_lon FROM agents WHERE agent_id = ?', [escrow.requester_agent_id]);
    const providerAgent = get<{ region_lat: number, region_lon: number }>('SELECT region_lat, region_lon FROM agents WHERE agent_id = ?', [escrow.provider_agent_id]);

    run(`
      INSERT INTO events (event_id, type, escrow_id, agent_a, agent_b, amount, capability, lat_a, lon_a, lat_b, lon_b, ts)
      VALUES (?, 'Delivered', ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      randomUUID(),
      escrowId,
      escrow.requester_agent_id,
      escrow.provider_agent_id,
      escrow.amount,
      escrow.capability,
      requesterAgent?.region_lat || 0,
      requesterAgent?.region_lon || 0,
      providerAgent?.region_lat || 0,
      providerAgent?.region_lon || 0
    ]);

    res.json({ success: true, deliveryId, status: 'delivered' });
  } catch (e: any) {
    console.error('Delivery error:', e);
    res.status(400).json({ error: e.message });
  }
});

// POST /escrows/:escrowId/verify
router.post('/:escrowId/verify', async (req: Request, res: Response) => {
  try {
    const { escrowId } = req.params;
    const body = req.body;

    const payloadValidation = SignedPayloadSchema.safeParse(body.payload);
    if (!payloadValidation.success) {
      return res.status(400).json({ error: 'Invalid payload format' });
    }

    const data = SubmitVerificationSchema.parse(body.payload.body);

    const escrow = get('SELECT * FROM escrows WHERE escrow_id = ?', [escrowId]) as any;
    if (!escrow) {
      return res.status(404).json({ error: 'Escrow not found' });
    }

    if (escrow.status !== 'delivered') {
      return res.status(400).json({ error: `Cannot verify in ${escrow.status} state` });
    }

    const requester = get<{ wallet: string }>('SELECT wallet FROM agents WHERE agent_id = ?', [escrow.requester_agent_id]);

    const { valid, error } = await verifySignedPayload(
      payloadValidation.data,
      body.signature,
      requester?.wallet || ''
    );

    if (!valid) {
      return res.status(401).json({ error: 'Signature verification failed', details: error });
    }

    const verificationId = data.verificationId || 'ver_' + randomUUID().slice(0, 8);
    run(`
      INSERT INTO verifications (verification_id, escrow_id, agent_id, status, verified_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `, [verificationId, escrowId, escrow.requester_agent_id, data.status]);

    let newStatus = escrow.status;
    let txRelease = null;

    if (data.status === 'verified') {
      newStatus = 'released';
      txRelease = '0x' + randomUUID().replace(/-/g, '').slice(0, 64);
      
      run("UPDATE escrows SET status = 'released', tx_release = ?, updated_at = datetime('now') WHERE escrow_id = ?",
        [txRelease, escrowId]);

      run(`
        UPDATE agents SET 
          successful_contracts = successful_contracts + 1,
          total_contracts = total_contracts + 1,
          reputation_score = CAST(successful_contracts AS REAL) / total_contracts * 100,
          updated_at = datetime('now')
        WHERE agent_id = ?
      `, [escrow.provider_agent_id]);

      const requesterAgent = get<{ region_lat: number, region_lon: number }>('SELECT region_lat, region_lon FROM agents WHERE agent_id = ?', [escrow.requester_agent_id]);
      const providerAgent = get<{ region_lat: number, region_lon: number }>('SELECT region_lat, region_lon FROM agents WHERE agent_id = ?', [escrow.provider_agent_id]);

      run(`
        INSERT INTO events (event_id, type, escrow_id, agent_a, agent_b, amount, capability, lat_a, lon_a, lat_b, lon_b, tx_hash, ts)
        VALUES (?, 'Released', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `, [
        randomUUID(),
        escrowId,
        escrow.requester_agent_id,
        escrow.provider_agent_id,
        escrow.amount,
        escrow.capability,
        requesterAgent?.region_lat || 0,
        requesterAgent?.region_lon || 0,
        providerAgent?.region_lat || 0,
        providerAgent?.region_lon || 0,
        txRelease
      ]);
    } else {
      newStatus = 'disputed';
      run("UPDATE escrows SET status = 'disputed', updated_at = datetime('now') WHERE escrow_id = ?", [escrowId]);
    }

    res.json({ success: true, verificationId, status: newStatus, txRelease });
  } catch (e: any) {
    console.error('Verification error:', e);
    res.status(400).json({ error: e.message });
  }
});

export default router;
