#!/usr/bin/env bun
import { createClient } from '@libsql/client';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const MIGRATIONS_DIR = join(process.cwd(), 'migrations');

async function runMigrations() {
  // Check for required environment variables
  if (!process.env.TURSO_DATABASE_URL) {
    console.error('❌ Error: TURSO_DATABASE_URL environment variable is not set');
    console.error('   Please set your database URL in .env or .env.local file');
    process.exit(1);
  }

  if (!process.env.TURSO_AUTH_TOKEN) {
    console.error('❌ Error: TURSO_AUTH_TOKEN environment variable is not set');
    console.error('   Please set your database auth token in .env or .env.local file');
    process.exit(1);
  }

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    // Create migrations tracking table if it doesn't exist
    await client.execute(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL UNIQUE,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get all migration files
    const files = await readdir(MIGRATIONS_DIR);
    const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort(); // Sort to ensure chronological order

    console.log(`Found ${sqlFiles.length} migration files`);

    // Get already applied migrations
    const appliedResult = await client.execute('SELECT filename FROM _migrations');
    const appliedMigrations = new Set(appliedResult.rows.map((row) => row.filename as string));

    // Run pending migrations
    let appliedCount = 0;
    for (const filename of sqlFiles) {
      if (appliedMigrations.has(filename)) {
        console.log(`⏭️  Skipping ${filename} (already applied)`);
        continue;
      }

      console.log(`▶️  Running ${filename}...`);
      const filePath = join(MIGRATIONS_DIR, filename);
      const sql = await readFile(filePath, 'utf-8');

      try {
        // Execute the migration SQL
        await client.executeMultiple(sql);

        // Record the migration as applied
        await client.execute({
          sql: 'INSERT INTO _migrations (filename) VALUES (?)',
          args: [filename],
        });

        console.log(`✅ Applied ${filename}`);
        appliedCount++;
      } catch (error) {
        console.error(`❌ Failed to apply ${filename}:`, error);
        throw error;
      }
    }

    if (appliedCount === 0) {
      console.log('✨ All migrations are up to date');
    } else {
      console.log(`\n✅ Successfully applied ${appliedCount} migration(s)`);
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.close();
  }
}

runMigrations();
