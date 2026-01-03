// Invite code generation utilities

import { APP_CONFIG } from '@/constants';

/**
 * Generate a random invite code with YAP- prefix
 * Format: YAP-XXXXXXXX (8 random alphanumeric characters)
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';

  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `${APP_CONFIG.INVITE_CODE_PREFIX}${code}`;
}
