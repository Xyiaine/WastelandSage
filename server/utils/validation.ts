
import { z } from 'zod';

// Session validation schemas
export const SessionCreateSchema = z.object({
  name: z.string().min(1).max(100),
  creatorMode: z.enum(['road', 'city']),
  currentPhase: z.number().int().min(0).max(4),
  duration: z.number().int().min(0),
  aiMode: z.enum(['continuity', 'variety', 'chaos'])
});

export const SessionUpdateSchema = SessionCreateSchema.partial();

// Node validation schemas
export const NodeCreateSchema = z.object({
  sessionId: z.string().uuid(),
  type: z.enum(['event', 'npc', 'faction', 'location', 'item']),
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  properties: z.record(z.any()).optional()
});

export const NodeUpdateSchema = NodeCreateSchema.partial().omit({ sessionId: true });

// Event generation validation
export const EventGenerationSchema = z.object({
  sessionId: z.string().uuid(),
  creatorMode: z.enum(['road', 'city']),
  focusType: z.enum(['road', 'city']).optional(),
  environment: z.string().max(50).optional(),
  eventType: z.string().max(50).optional(),
  threatLevel: z.enum(['low', 'medium', 'high']).optional(),
  timeOfDay: z.enum(['dawn', 'morning', 'noon', 'afternoon', 'dusk', 'night']).optional(),
  weather: z.string().max(50).optional()
});

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      throw new Error(`Validation failed: ${message}`);
    }
    throw error;
  }
}
