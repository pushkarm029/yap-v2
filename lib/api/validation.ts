// API Input validation utilities
// Common validators for request parameters

import { NextResponse } from 'next/server';
import { address, type Address } from '@solana/kit';
import { badRequest } from './responses';

// ============ RESULT TYPES ============

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: NextResponse };

// ============ STRING VALIDATORS ============

/**
 * Validate required non-empty string
 */
export function requireString(
  value: unknown,
  fieldName: string,
  maxLength?: number
): ValidationResult<string> {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return { ok: false, error: badRequest(`${fieldName} is required`) };
  }

  const trimmed = value.trim();

  if (maxLength && trimmed.length > maxLength) {
    return { ok: false, error: badRequest(`${fieldName} too long (max ${maxLength} characters)`) };
  }

  return { ok: true, value: trimmed };
}

/**
 * Validate optional string with max length
 */
export function optionalString(
  value: unknown,
  maxLength?: number
): ValidationResult<string | undefined> {
  if (value === undefined || value === null || value === '') {
    return { ok: true, value: undefined };
  }

  if (typeof value !== 'string') {
    return { ok: false, error: badRequest('Invalid string value') };
  }

  const trimmed = value.trim();

  if (maxLength && trimmed.length > maxLength) {
    return { ok: false, error: badRequest(`Value too long (max ${maxLength} characters)`) };
  }

  return { ok: true, value: trimmed };
}

// ============ SOLANA VALIDATORS ============

/**
 * Validate Solana wallet address
 */
export function requireWallet(
  value: unknown,
  fieldName = 'Wallet address'
): ValidationResult<Address> {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return { ok: false, error: badRequest(`${fieldName} required`) };
  }

  try {
    const addr = address(value.trim());
    return { ok: true, value: addr };
  } catch {
    return { ok: false, error: badRequest(`Invalid ${fieldName.toLowerCase()}`) };
  }
}

/**
 * Validate Solana transaction signature (87-88 chars base58)
 */
export function requireTxSignature(value: unknown): ValidationResult<string> {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return { ok: false, error: badRequest('Transaction signature required') };
  }

  const sig = value.trim();

  // Solana tx signatures are 87-88 chars base58
  // Base58 excludes: 0, O, I, l
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/;

  if (!base58Regex.test(sig)) {
    return { ok: false, error: badRequest('Invalid transaction signature format') };
  }

  return { ok: true, value: sig };
}

// ============ NUMBER VALIDATORS ============

/**
 * Validate positive integer
 */
export function requirePositiveInt(value: unknown, fieldName: string): ValidationResult<number> {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;

  if (typeof num !== 'number' || isNaN(num) || num <= 0 || !Number.isInteger(num)) {
    return { ok: false, error: badRequest(`${fieldName} must be a positive integer`) };
  }

  return { ok: true, value: num };
}

/**
 * Validate pagination limit (positive int with max)
 */
export function validateLimit(value: unknown, defaultLimit = 20, maxLimit = 100): number {
  if (value === undefined || value === null) {
    return defaultLimit;
  }

  const num = typeof value === 'string' ? parseInt(value, 10) : value;

  if (typeof num !== 'number' || isNaN(num) || num <= 0) {
    return defaultLimit;
  }

  return Math.min(num, maxLimit);
}

// ============ UUID VALIDATORS ============

/**
 * Validate UUID format
 */
export function requireUUID(value: unknown, fieldName: string): ValidationResult<string> {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return { ok: false, error: badRequest(`${fieldName} is required`) };
  }

  const uuid = value.trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(uuid)) {
    return { ok: false, error: badRequest(`Invalid ${fieldName} format`) };
  }

  return { ok: true, value: uuid };
}

// ============ CONTENT VALIDATORS ============

/**
 * Validate post content (non-empty, max 280 chars)
 */
export function validatePostContent(content: unknown): ValidationResult<string> {
  return requireString(content, 'Content', 280);
}

/**
 * Validate post content - optional if image is present
 * Allows photo-only posts without text
 */
export function validatePostContentOptional(
  content: unknown,
  hasImage: boolean
): ValidationResult<string> {
  // If no image, content is required
  if (!hasImage) {
    return requireString(content, 'Content', 280);
  }

  // With image, content is optional but must be valid if provided
  if (content === undefined || content === null || content === '') {
    return { ok: true, value: '' };
  }

  return requireString(content, 'Content', 280);
}
