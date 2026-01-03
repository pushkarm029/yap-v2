// API utilities barrel export
// Import from '@/lib/api' for all API route helpers

// Auth helpers
export {
  requireAuth,
  requireInvite,
  requireUser,
  requireInvitedUser,
  isAuthError,
  type AuthResult,
  type AuthWithUserResult,
  type AuthError,
} from './auth';

// Response helpers
export {
  ok,
  created,
  noContent,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  tooManyRequests,
  serverError,
  respond,
} from './responses';

// Validation helpers
export {
  requireString,
  optionalString,
  requireWallet,
  requireTxSignature,
  requirePositiveInt,
  validateLimit,
  requireUUID,
  validatePostContent,
  validatePostContentOptional,
  type ValidationResult,
} from './validation';
