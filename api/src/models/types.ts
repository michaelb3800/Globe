import { z } from 'zod';

// Agent registration
export const RegisterAgentSchema = z.object({
  agentId: z.string().min(1),
  wallet: z.string().startsWith('0x'),
  name: z.string().optional(),
  capabilities: z.array(z.string()),
  pricingModel: z.object({}).optional(),
  regionLat: z.number().optional(),
  regionLon: z.number().optional(),
});

// Agent update
export const UpdateAgentSchema = z.object({
  name: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  pricingModel: z.object({}).optional(),
  regionLat: z.number().optional(),
  regionLon: z.number().optional(),
});

// Service listing
export const CreateServiceSchema = z.object({
  serviceId: z.string().min(1),
  capability: z.string().min(1),
  description: z.string().optional(),
  priceMin: z.number().optional(),
  priceMax: z.number().optional(),
  pricingModel: z.object({}).optional(),
});

// Offer creation
export const CreateOfferSchema = z.object({
  offerId: z.string().min(1),
  providerAgentId: z.string().min(1),
  serviceId: z.string().optional(),
  capability: z.string().min(1),
  price: z.number().positive(),
  deadline: z.string().optional(),
});

// Offer acceptance
export const AcceptOfferSchema = z.object({});

// Delivery submission
export const SubmitDeliverySchema = z.object({
  deliveryId: z.string().min(1),
  artifactHash: z.string().min(1),
  attestation: z.string().optional(),
});

// Verification
export const SubmitVerificationSchema = z.object({
  verificationId: z.string().min(1),
  status: z.enum(['verified', 'rejected']),
});

// Signed payload wrapper
export const SignedPayloadSchema = z.object({
  action: z.string(),
  chainId: z.number(),
  nonce: z.number(),
  expiresAt: z.number(),
  body: z.record(z.unknown()),
  signature: z.string(),
});

export type RegisterAgentInput = z.infer<typeof RegisterAgentSchema>;
export type UpdateAgentInput = z.infer<typeof UpdateAgentSchema>;
export type CreateServiceInput = z.infer<typeof CreateServiceSchema>;
export type CreateOfferInput = z.infer<typeof CreateOfferSchema>;
export type SubmitDeliveryInput = z.infer<typeof SubmitDeliverySchema>;
export type SubmitVerificationInput = z.infer<typeof SubmitVerificationSchema>;
export type SignedPayload = z.infer<typeof SignedPayloadSchema>;
