/**
 * idempotencyModel.js — Persistence layer for idempotency keys.
 *
 * WHY idempotency keys?
 *   Networks are unreliable. A mobile client on a slow 4G connection may time
 *   out before receiving a 201 response, then retry — creating duplicate rows.
 *   Idempotency keys solve this: the client generates a unique key (UUID v4)
 *   per *logical* request and sends it in the `Idempotency-Key` header.  If we
 *   see the key again, we return the cached response without touching the DB.
 *
 * KEY EXPIRY:
 *   Keys expire after 24 hours.  After that window, the client should treat
 *   the original request as lost and generate a fresh key if they retry.
 *   This prevents unbounded table growth.
 */

const db = require('../db/database');

const EXPIRY_HOURS = 24;

const stmtGet = db.prepare(`
  SELECT * FROM idempotency_keys
  WHERE key = ?
    AND created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', ? || ' hours')
`);

const stmtInsert = db.prepare(`
  INSERT OR IGNORE INTO idempotency_keys (key, response, status_code)
  VALUES (@key, @response, @status_code)
`);

const stmtCleanup = db.prepare(`
  DELETE FROM idempotency_keys
  WHERE created_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', ? || ' hours')
`);

/**
 * findKey — Look up an unexpired idempotency key.
 * Returns null if the key doesn't exist or has expired.
 */
function findKey(key) {
  const expiryParam = `-${EXPIRY_HOURS}`;
  const row = stmtGet.get(key, expiryParam);
  if (!row) return null;
  return {
    response:    JSON.parse(row.response),
    status_code: row.status_code,
  };
}

/**
 * saveKey — Persist an idempotency key with its response payload.
 * INSERT OR IGNORE means a race between two simultaneous identical requests
 * will result in only one insertion (the second is silently dropped).
 */
function saveKey(key, response, status_code) {
  stmtInsert.run({
    key,
    response:    JSON.stringify(response),
    status_code,
  });
}

/**
 * purgeExpiredKeys — Called on server startup and periodically to reclaim space.
 */
function purgeExpiredKeys() {
  const expiryParam = `-${EXPIRY_HOURS}`;
  const { changes } = stmtCleanup.run(expiryParam);
  if (changes > 0) {
    console.log(`[idempotency] Purged ${changes} expired key(s).`);
  }
}

module.exports = { findKey, saveKey, purgeExpiredKeys };
