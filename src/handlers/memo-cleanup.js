// Cleanup expired memos (cron job)
import { getErrorMessage } from '../utils/errorMessages.js';
import { uniformResponseDelay } from '../utils/timingSecurity.js';

export async function handleCleanupMemos(env) {
  try {
    const stmt = env.DB.prepare(`
            DELETE FROM memos 
            WHERE expiry_time IS NOT NULL 
            AND expiry_time < unixepoch('now')
        `);

    const result = await stmt.run();

    return new Response(
      JSON.stringify({
        success: true,
        cleanedUp: result.changes,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    // Add artificial delay for security
    await uniformResponseDelay();
    return new Response(JSON.stringify({ error: getErrorMessage('DATABASE_ERROR', 'en') }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
}
