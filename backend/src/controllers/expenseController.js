/**
 * expenseController.js — HTTP handler layer.
 *
 * Controllers are intentionally thin: parse input, call service, send response.
 * All errors are forwarded to the centralised errorHandler via next(err).
 * This ensures no unhandled-promise-rejection can crash the process.
 */

const expenseService = require('../services/expenseService');

/**
 * POST /expenses
 * Body (validated by middleware): { amount, category, description, date }
 * Header (optional): Idempotency-Key: <uuid>
 */
async function createExpense(req, res, next) {
  try {
    const { amount, category, description, date } = req.body;

    const expense = expenseService.createExpense({ amount, category, description, date });

    return res.status(201).json({
      success: true,
      data:    expense,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /expenses
 * Query params:
 *   - category  (string)              — filter by category
 *   - sort      ("date_asc" | "date_desc") — default: date_desc
 */
async function getExpenses(req, res, next) {
  try {
    const { category, sort } = req.query;

    // Whitelist the sort param — already validated in the model but belt-and-suspenders.
    const allowedSorts = ['date_asc', 'date_desc'];
    const safeSort = allowedSorts.includes(sort) ? sort : 'date_desc';

    const result = expenseService.getExpenses({
      category: category || null,
      sort:     safeSort,
    });

    return res.status(200).json({
      success: true,
      data:    result.expenses,
      meta:    {
        count: result.expenses.length,
        total: result.total,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /expenses/categories/summary
 * Returns per-category count and total.
 */
async function getCategorySummary(req, res, next) {
  try {
    const summary = expenseService.getCategorySummary({});
    return res.status(200).json({
      success: true,
      data:    summary,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createExpense, getExpenses, getCategorySummary };
