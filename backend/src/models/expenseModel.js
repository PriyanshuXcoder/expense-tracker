/**
 * expenseModel.js — Data-access layer for the expenses table.
 *
 * This layer owns ALL SQL. Controllers never write raw SQL.
 * This keeps the codebase testable (mock this module in unit tests)
 * and makes schema changes a single-file concern.
 *
 * MONEY HANDLING:
 *   - All amounts enter the DB as INTEGER cents  (e.g., $12.99 → 1299).
 *   - All amounts leave the DB converted back to a decimal string
 *     (e.g., 1299 → "12.99") so the client gets a predictable format.
 *   - We return a string, not a JS Number, to avoid any float coercion
 *     when the caller serialises to JSON.
 */

const db = require('../db/database');
const { v4: uuidv4 } = require('uuid');

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * dollarsToCents — Convert a decimal dollar string/number to integer cents.
 * Uses Math.round to handle values like 10.999 (rounds to 1100).
 * Throws if the result is not a finite integer (catches NaN, Infinity, etc.).
 */
function dollarsToCents(amount) {
  const cents = Math.round(parseFloat(amount) * 100);
  if (!Number.isFinite(cents)) {
    throw new Error(`Invalid amount: ${amount}`);
  }
  return cents;
}

/**
 * centsToDollars — Convert integer cents back to a two-decimal string.
 * Returns a string so JSON.stringify never approximates it.
 */
function centsToDollars(cents) {
  return (cents / 100).toFixed(2);
}

/** Map a raw DB row to the shape the API returns. */
function rowToExpense(row) {
  return {
    id:          row.id,
    amount:      centsToDollars(row.amount),   // e.g. "12.99"
    category:    row.category,
    description: row.description,
    date:        row.date,
    created_at:  row.created_at,
  };
}

// ─── Prepared Statements ─────────────────────────────────────────────────────
// Prepare once at module load; SQLite reuses the compiled query plan.

const stmtInsert = db.prepare(`
  INSERT INTO expenses (id, amount, category, description, date)
  VALUES (@id, @amount, @category, @description, @date)
`);

const stmtFindById = db.prepare(`
  SELECT * FROM expenses WHERE id = ?
`);

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * createExpense — Insert a new expense row.
 * Returns the newly created expense object (dollars, not cents).
 */
function createExpense({ amount, category, description, date }) {
  const id = uuidv4();
  const amountCents = dollarsToCents(amount);

  stmtInsert.run({ id, amount: amountCents, category, description, date });

  return rowToExpense(stmtFindById.get(id));
}

/**
 * getExpenses — Fetch expenses with optional filtering and sorting.
 *
 * @param {object} options
 * @param {string} [options.category]  - Filter to a specific category.
 * @param {string} [options.sort]      - "date_asc" | "date_desc" (default: date_desc).
 * @returns {Expense[]}
 */
function getExpenses({ category, sort } = {}) {
  // Build query dynamically but safely using parameterised values.
  // We whitelist the sort direction to prevent SQL injection via the
  // query-string even though it's used as a keyword, not a value.
  const sortDir = sort === 'date_asc' ? 'ASC' : 'DESC';

  let query = `SELECT * FROM expenses`;
  const params = [];

  if (category) {
    query += ` WHERE category = ?`;
    params.push(category);
  }

  query += ` ORDER BY date ${sortDir}, created_at ${sortDir}`;

  const rows = db.prepare(query).all(...params);
  return rows.map(rowToExpense);
}

/**
 * getExpenseById — Useful for testing and idempotency checks.
 */
function getExpenseById(id) {
  const row = stmtFindById.get(id);
  return row ? rowToExpense(row) : null;
}

module.exports = { createExpense, getExpenses, getExpenseById, dollarsToCents, centsToDollars };
