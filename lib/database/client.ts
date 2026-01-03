// Database client with lazy initialization
// Shared singleton for all database modules

import { createClient, type Client as LibsqlClient } from '@libsql/client';
import { dbLogger } from '../logger';

let client: LibsqlClient | null = null;
let cleanupRegistered = false;

function setupCleanup(): void {
  const cleanup = () => {
    try {
      if (client) {
        client.close();
      }
    } catch (error) {
      dbLogger.error({ error }, 'Error closing database');
    }
  };

  process.on('exit', cleanup);
  process.on('SIGHUP', () => process.exit(128 + 1));
  process.on('SIGINT', () => process.exit(128 + 2));
  process.on('SIGTERM', () => process.exit(128 + 15));
}

export function getClient(): LibsqlClient {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });

    if (!cleanupRegistered) {
      setupCleanup();
      cleanupRegistered = true;
    }
  }
  return client;
}
