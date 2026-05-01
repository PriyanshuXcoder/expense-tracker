/**
 * validation.js — Input validation middleware.
 *
 * WHY manual validation instead of a library (Joi, Zod, express-validator)?
 *   For a focused project like this, a thin custom validator keeps the
 *   dependency surface small and makes the rules immediately readable.
 *   In a larger team codebase, Zod would be the recommended choice for its
 *   TypeScript integration and composable schema definitions.
 *
 * Validation rules for POST /expenses:
 *   - amount: required, positive, max 2 decimal places, ≤ $1,000,000
 *   - category: required, non-empty string, max 50 chars
 *   - description: optional, max 255 chars
 *   - date: required, valid ISO 8601 date (YYYY-MM-DD), not in the future
 */

const VALID_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_AMOUNT = 1_000_000; // $1M upper sanity bound
const ALLOWED_CATEGORIES = [
  'Food', 'Transport', 'Housing', 'Healthcare',
  'Entertainment', 'Shopping', 'Education', 'Travel', 'Other',
];

function validateCreateExpense(req, res, next) {
  const errors = [];
  const { amount, category, description, date } = req.body;

  // ── amount ────────────────────────────────────────────────────────────────
  if (amount === undefined || amount === null || amount === '') {
    errors.push('amount is required.');
  } else {
    const num = parseFloat(amount);
    if (isNaN(num)) {
      errors.push('amount must be a valid number.');
    } else if (num <= 0) {
      errors.push('amount must be greater than 0.');
    } else if (num > MAX_AMOUNT) {
      errors.push(`amount must not exceed ${MAX_AMOUNT}.`);
    } else {
      // Reject more than 2 decimal places — e.g. 1.999 is a client error.
      const str = String(amount);
      const dotIdx = str.indexOf('.');
      if (dotIdx !== -1 && str.length - dotIdx - 1 > 2) {
        errors.push('amount must have at most 2 decimal places.');
      }
    }
  }

  // ── category ──────────────────────────────────────────────────────────────
  if (!category || typeof category !== 'string' || category.trim() === '') {
    errors.push('category is required.');
  } else if (category.trim().length > 50) {
    errors.push('category must be 50 characters or fewer.');
  } else if (!ALLOWED_CATEGORIES.includes(category.trim())) {
    errors.push(`category must be one of: ${ALLOWED_CATEGORIES.join(', ')}.`);
  }

  // ── description (optional) ────────────────────────────────────────────────
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      errors.push('description must be a string.');
    } else if (description.length > 255) {
      errors.push('description must be 255 characters or fewer.');
    }
  }

  // ── date ──────────────────────────────────────────────────────────────────
  if (!date || typeof date !== 'string' || date.trim() === '') {
    errors.push('date is required.');
  } else if (!VALID_DATE_RE.test(date.trim())) {
    errors.push('date must be in YYYY-MM-DD format.');
  } else {
    const parsed = new Date(date.trim() + 'T00:00:00Z');
    if (isNaN(parsed.getTime())) {
      errors.push('date is not a valid calendar date.');
    }
    // Allow same-day entries in any timezone by comparing UTC dates.
    const todayUTC = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
    if (parsed > todayUTC) {
      errors.push('date must not be in the future.');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  // Normalise values before they reach the controller.
  req.body.amount      = parseFloat(amount);
  req.body.category    = category.trim();
  req.body.description = (description || '').trim();
  req.body.date        = date.trim();

  next();
}

module.exports = { validateCreateExpense, ALLOWED_CATEGORIES };
