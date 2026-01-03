// API Response utilities
// Type-safe response helpers for consistent API responses

import { NextResponse } from 'next/server';

// ============ SUCCESS RESPONSES ============

/**
 * Return 200 OK with JSON data
 */
export function ok<T>(data: T): NextResponse<T> {
  return NextResponse.json(data);
}

/**
 * Return 201 Created with JSON data
 */
export function created<T>(data: T): NextResponse<T> {
  return NextResponse.json(data, { status: 201 });
}

/**
 * Return 204 No Content
 */
export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

// ============ ERROR RESPONSES ============

interface ErrorBody {
  error: string;
  message?: string;
  [key: string]: unknown;
}

/**
 * Return 400 Bad Request
 */
export function badRequest(
  error: string,
  extra?: Record<string, unknown>
): NextResponse<ErrorBody> {
  return NextResponse.json({ error, ...extra }, { status: 400 });
}

/**
 * Return 401 Unauthorized
 */
export function unauthorized(error = 'Unauthorized'): NextResponse<ErrorBody> {
  return NextResponse.json({ error }, { status: 401 });
}

/**
 * Return 403 Forbidden
 */
export function forbidden(error: string, message?: string): NextResponse<ErrorBody> {
  const body: ErrorBody = { error };
  if (message) body.message = message;
  return NextResponse.json(body, { status: 403 });
}

/**
 * Return 404 Not Found
 */
export function notFound(error: string): NextResponse<ErrorBody> {
  return NextResponse.json({ error }, { status: 404 });
}

/**
 * Return 429 Too Many Requests
 */
export function tooManyRequests(
  error: string,
  extra?: Record<string, unknown>
): NextResponse<ErrorBody> {
  return NextResponse.json({ error, ...extra }, { status: 429 });
}

/**
 * Return 500 Internal Server Error
 */
export function serverError(error = 'Internal server error'): NextResponse<ErrorBody> {
  return NextResponse.json({ error }, { status: 500 });
}

// ============ TYPED RESPONSE FACTORY ============

/**
 * Create a typed response with status code
 */
export function respond<T>(data: T, status = 200): NextResponse<T> {
  return NextResponse.json(data, { status });
}
