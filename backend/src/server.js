/**
 * server.js — HTTP server entry point.
 *
 * Responsibilities:
 *   - Import the Express app.
 *   - Start listening on the configured port.
 *   - Handle graceful shutdown (SIGTERM / SIGINT) so in-flight requests
 *     are completed before the process exits.
 *   - Purge expired idempotency keys on startup.
 */

const app  = require('./app');
const { purgeExpiredKeys } = require('./models/idempotencyModel');

const PORT = process.env.PORT || 3001;

// Purge expired keys from previous runs before starting.
try {
  purgeExpiredKeys();
} catch (err) {
  // Non-fatal — log and continue.
  console.warn('[startup] Failed to purge expired idempotency keys:', err.message);
}

const server = app.listen(PORT, () => {
  console.log(`✅  Expense Tracker API listening on http://localhost:${PORT}`);
  console.log(`    Health: http://localhost:${PORT}/health`);
  console.log(`    Mode:   ${process.env.NODE_ENV || 'development'}`);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
// On SIGTERM (sent by Heroku, Docker, systemd) or SIGINT (Ctrl+C):
//   1. Stop accepting new connections.
//   2. Wait for existing connections to drain.
//   3. Exit cleanly.
// better-sqlite3 closes the DB file automatically when the process exits,
// but explicit close() here is good practice.
function shutdown(signal) {
  console.log(`\n[shutdown] Received ${signal}. Closing HTTP server…`);
  server.close(() => {
    console.log('[shutdown] All connections drained. Exiting.');
    process.exit(0);
  });

  // Force-kill after 10 s if connections don't drain (e.g., stuck WebSocket).
  setTimeout(() => {
    console.error('[shutdown] Forced exit after timeout.');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// Catch any unhandled promise rejections (safety net).
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
  // Don't exit — log and keep running; avoids crashes from non-critical async paths.
});
