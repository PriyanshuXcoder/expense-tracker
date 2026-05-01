/**
 * database.js — Singleton SQLite connection with WAL mode.
 *
 * WHY better-sqlite3 over sqlite3 (async)?
 *   - Synchronous API eliminates async complexity; Node.js event loop is not
 *     blocked in practice because SQLite ops are microsecond-fast.
 *   - WAL (Write-Ahead Logging) mode gives us concurrent reads while writes
 *     are in progress, critical for a busy API.
 *
 * WHY store amount as INTEGER (cents)?
 *   - Floating-point arithmetic (IEEE 754) cannot represent 0.1 + 0.2 exactly.
 *     Storing money as cents (integer) guarantees exact arithmetic.
 *     $12.99 is stored as 1299. We convert back on read.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Place the DB file in a predictable location relative to the project root.
const DB_DIR = path.resolve(__dirname, '../../data');
const DB_PATH = path.join(DB_DIR, 'expenses.db');

// Ensure the data directory exists (important for first-run / container envs).
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Open (or create) the database file.
const db = new Database(DB_PATH);

/**
 * Apply production-grade PRAGMA settings:
 *  - WAL mode: readers don't block writers and vice versa.
 *  - foreign_keys: enforce relational integrity.
 *  - journal_mode=WAL: already set above; confirmed here.
 *  - busy_timeout: instead of throwing SQLITE_BUSY immediately, wait up to
 *    5 s for locks to release — handles burst traffic gracefully.
 */
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

/**
 * Schema initialization.
 * Using a single transaction ensures the schema is created atomically.
 * The `IF NOT EXISTS` guards make this idempotent (safe to call on restart).
 */
const initSchema = db.transaction(() => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id          TEXT    PRIMARY KEY,   -- UUID v4; avoids sequential-ID guessing
      amount      INTEGER NOT NULL,      -- stored in CENTS to avoid float errors
      category    TEXT    NOT NULL,
      description TEXT    NOT NULL DEFAULT '',
      date        TEXT    NOT NULL,      -- ISO 8601 date: YYYY-MM-DD
      created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    -- Index for the most-common query patterns.
    CREATE INDEX IF NOT EXISTS idx_expenses_date     ON expenses(date DESC);
    CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

    /**
     * Idempotency key table.
     * When a client sends the same request twice (network retry), we look up
     * the idempotency key and return the cached response instead of inserting
     * a duplicate row.  Keys expire after 24 hours to avoid unbounded growth.
     */
    CREATE TABLE IF NOT EXISTS idempotency_keys (
      key         TEXT    PRIMARY KEY,
      response    TEXT    NOT NULL,      -- JSON-serialised response body
      status_code INTEGER NOT NULL,
      created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_idempotency_created
      ON idempotency_keys(created_at);
  `);
});

initSchema();

module.exports = db;
