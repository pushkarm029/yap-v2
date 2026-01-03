import { createHash } from 'crypto';

// Returns full SHA-256 hash (64 hex chars / 256 bits) to maintain NIST collision-resistance guidance
export function hashUserId(userId: string): string {
  return createHash('sha256').update(userId).digest('hex');
}
