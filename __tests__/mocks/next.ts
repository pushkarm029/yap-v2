// Next.js Request/Response mock utilities for API testing
import { NextRequest } from 'next/server';

/**
 * Create a mock NextRequest for testing API routes
 */
export function createMockRequest(
  options: {
    method?: string;
    url?: string;
    body?: unknown;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  } = {}
): NextRequest {
  const url = new URL(options.url || 'http://localhost:3000/api/test');

  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const headers: Record<string, string> = options.headers || {};

  // Only add body for non-GET requests
  let body: string | undefined;
  if (options.body && options.method !== 'GET') {
    body = JSON.stringify(options.body);
    headers['Content-Type'] = 'application/json';
  }

  return new NextRequest(url, {
    method: options.method || 'GET',
    headers,
    body,
  });
}

/**
 * Parse a Response/NextResponse to extract status and JSON data
 */
export async function parseResponse<T = unknown>(
  response: Response
): Promise<{ status: number; data: T }> {
  const data = await response.json();
  return {
    status: response.status,
    data: data as T,
  };
}

/**
 * Create a mock request with Authorization header for cron routes
 */
export function createCronRequest(
  secret: string,
  url = 'http://localhost:3000/api/cron/test'
): NextRequest {
  return createMockRequest({
    url,
    headers: {
      Authorization: `Bearer ${secret}`,
    },
  });
}
