/**
 * Generic utility types for type-safe APIs and data handling
 * Reduces repetitive type definitions across the codebase
 */

// ============ API RESPONSE TYPES ============

/**
 * Standard API success response
 * Usage: ApiResponse<{ user: User }>
 */
export type ApiResponse<T> = T;

/**
 * API response with possible error
 * Usage: ApiResponseWithError<UserData, 'NOT_FOUND' | 'UNAUTHORIZED'>
 */
export type ApiResponseWithError<T, E extends string = string> = T | { error: E; message?: string };

/**
 * Paginated response with cursor-based pagination
 * Usage: PaginatedResponse<Post>
 */
export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Paginated response with count (for UI showing "1 of N")
 */
export interface PaginatedResponseWithCount<T> extends PaginatedResponse<T> {
  totalCount: number;
}

/**
 * Simple list response (no pagination)
 */
export interface ListResponse<T> {
  items: T[];
  count: number;
}

// ============ RESULT TYPES (Rust-style) ============

/**
 * Success result
 */
export interface Ok<T> {
  ok: true;
  value: T;
}

/**
 * Error result
 */
export interface Err<E> {
  ok: false;
  error: E;
}

/**
 * Result type for operations that can fail
 * Usage: Result<User, 'NOT_FOUND' | 'UNAUTHORIZED'>
 *
 * Example:
 * ```ts
 * function getUser(id: string): Result<User, 'NOT_FOUND'> {
 *   const user = db.findUser(id);
 *   if (!user) return { ok: false, error: 'NOT_FOUND' };
 *   return { ok: true, value: user };
 * }
 *
 * const result = getUser('123');
 * if (!result.ok) {
 *   // TypeScript knows result.error exists
 *   console.log(result.error);
 * } else {
 *   // TypeScript knows result.value is User
 *   console.log(result.value.name);
 * }
 * ```
 */
export type Result<T, E = Error> = Ok<T> | Err<E>;

/**
 * Async result type
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

// ============ HELPER FUNCTIONS ============

/**
 * Create a success result
 */
export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

/**
 * Create an error result
 */
export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

/**
 * Check if result is Ok
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok;
}

/**
 * Check if result is Err
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.ok;
}

/**
 * Unwrap result or throw
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) return result.value;
  throw new Error(`Unwrap failed: ${String(result.error)}`);
}

/**
 * Unwrap result or return default
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return result.ok ? result.value : defaultValue;
}

// ============ DATABASE QUERY TYPES ============

/**
 * Query that returns a single item or null
 */
export type QueryResult<T> = Promise<T | null>;

/**
 * Query that returns a list of items
 */
export type QueryListResult<T> = Promise<T[]>;

/**
 * Query that returns a count
 */
export type QueryCountResult = Promise<number>;

// ============ MUTATION TYPES ============

/**
 * Standard mutation input with optimistic update support
 */
export interface MutationInput<T> {
  data: T;
  optimisticId?: string;
}

/**
 * Mutation result
 */
export interface MutationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============ UTILITY TYPES ============

/**
 * Make specific properties optional
 * Usage: PartialBy<User, 'id' | 'createdAt'>
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific properties required
 * Usage: RequiredBy<User, 'email'>
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Extract array element type
 * Usage: ArrayElement<Post[]> = Post
 */
export type ArrayElement<T> = T extends readonly (infer E)[] ? E : never;

/**
 * Deep partial - makes all nested properties optional
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Nullable type
 */
export type Nullable<T> = T | null;

/**
 * Optional type (can be undefined)
 */
export type Optional<T> = T | undefined;
