// Bug Reports & Feedback: Database operations
// Domain: User-submitted bug reports and feature requests

import { randomUUID } from 'crypto';
import { getClient } from './client';
import { dbLogger } from '../logger';
import { getNowISO } from '../utils/dates';
import type { BugReport, BugReportType, DiagnosticInfo, BugReportStatus } from './types';

/**
 * Create a new bug report or feedback submission.
 * Supports both authenticated and anonymous submissions.
 *
 * @returns The created report with generated ID
 */
export async function createBugReport(params: {
  userId: string | null;
  type: BugReportType;
  description: string;
  screenshotUrl?: string | null;
  diagnosticInfo?: DiagnosticInfo | null;
}): Promise<{ id: string }> {
  const id = randomUUID();
  const now = getNowISO();
  const diagnosticJson = params.diagnosticInfo ? JSON.stringify(params.diagnosticInfo) : null;

  try {
    await getClient().execute({
      sql: `INSERT INTO bug_reports (id, user_id, type, description, screenshot_url, diagnostic_info, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'new', ?)`,
      args: [
        id,
        params.userId,
        params.type,
        params.description,
        params.screenshotUrl ?? null,
        diagnosticJson,
        now,
      ],
    });

    dbLogger.info(
      { bugReportId: id, userId: params.userId, type: params.type },
      'Bug report created'
    );

    return { id };
  } catch (error) {
    dbLogger.error(
      { error, userId: params.userId, type: params.type },
      'Error creating bug report'
    );
    throw new Error('Failed to create bug report');
  }
}

/**
 * Get bug reports submitted by a specific user.
 * Ordered by creation date (newest first).
 */
export async function getBugReportsByUser(userId: string): Promise<BugReport[]> {
  try {
    const result = await getClient().execute({
      sql: `SELECT * FROM bug_reports WHERE user_id = ? ORDER BY created_at DESC`,
      args: [userId],
    });

    return result.rows as unknown as BugReport[];
  } catch (error) {
    dbLogger.error({ error, userId }, 'Error fetching bug reports for user');
    return [];
  }
}

/**
 * Get a single bug report by ID.
 */
export async function getBugReportById(id: string): Promise<BugReport | null> {
  try {
    const result = await getClient().execute({
      sql: `SELECT * FROM bug_reports WHERE id = ?`,
      args: [id],
    });

    return result.rows.length > 0 ? (result.rows[0] as unknown as BugReport) : null;
  } catch (error) {
    dbLogger.error({ error, bugReportId: id }, 'Error fetching bug report');
    return null;
  }
}

/**
 * Update bug report status (for admin use).
 */
export async function updateBugReportStatus(id: string, status: BugReportStatus): Promise<boolean> {
  try {
    const result = await getClient().execute({
      sql: `UPDATE bug_reports SET status = ? WHERE id = ?`,
      args: [status, id],
    });

    if (result.rowsAffected > 0) {
      dbLogger.info({ bugReportId: id, status }, 'Bug report status updated');
      return true;
    }
    return false;
  } catch (error) {
    dbLogger.error({ error, bugReportId: id, status }, 'Error updating bug report status');
    return false;
  }
}

/**
 * Count bug reports by status (for admin dashboard).
 */
export async function getBugReportStats(): Promise<{
  new: number;
  reviewed: number;
  resolved: number;
  total: number;
}> {
  try {
    const result = await getClient().execute({
      sql: `SELECT status, COUNT(*) as count FROM bug_reports GROUP BY status`,
      args: [],
    });

    const stats = { new: 0, reviewed: 0, resolved: 0, total: 0 };
    for (const row of result.rows) {
      const status = row.status as BugReportStatus;
      const count = Number(row.count);
      stats[status] = count;
      stats.total += count;
    }

    return stats;
  } catch (error) {
    dbLogger.error({ error }, 'Error fetching bug report stats');
    return { new: 0, reviewed: 0, resolved: 0, total: 0 };
  }
}

// Aggregate export for db.feedback.* pattern
export const feedback = {
  createBugReport,
  getBugReportsByUser,
  getBugReportById,
  updateBugReportStatus,
  getBugReportStats,
};
