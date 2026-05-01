/**
 * expenseService.js — Business logic layer.
 *
 * WHY a separate service layer between controller and model?
 *   - Controllers handle HTTP concerns (parsing req, sending res).
 *   - Models handle SQL concerns (queries, row mapping).
 *   - Services handle business rules (complex validation, aggregations,
 *     cross-model coordination).
 *
 *   For this project the service layer is thin, but it provides the right
 *   seam for future growth — e.g., adding a budget-limit check before insert
 *   without touching the controller or model.
 */

const expenseModel = require('../models/expenseModel');

/**
 * createExpense — Validate business rules and delegate to the model.
 * Returns the created expense.
 */
function createExpense(data) {
  // The model owns SQL; the service owns business rules.
  // Currently no cross-model rules apply, but this is the right place for them.
  return expenseModel.createExpense(data);
}

/**
 * getExpenses — Retrieve and optionally filter/sort expenses.
 * Also computes the aggregate total for the visible set.
 *
 * WHY compute total server-side?
 *   When pagination is added later, the client can't total filtered results
 *   without fetching all pages.  Returning it here keeps the option open.
 */
function getExpenses(filters) {
  const expenses = expenseModel.getExpenses(filters);

  // Total in dollars, computed from the already-converted string amounts.
  // We parse back to float here — precision is acceptable for totals display
  // (we're summing pre-rounded dollar strings, not raw floats).
  const total = expenses
    .reduce((sum, e) => sum + parseFloat(e.amount), 0)
    .toFixed(2);

  return { expenses, total };
}

/**
 * getCategorySummary — Group expenses by category with per-group totals.
 * Useful for the "category summary" nice-to-have feature.
 */
function getCategorySummary(filters) {
  const { expenses } = getExpenses(filters);

  const summary = {};
  for (const e of expenses) {
    if (!summary[e.category]) {
      summary[e.category] = { count: 0, total: 0 };
    }
    summary[e.category].count  += 1;
    summary[e.category].total  += parseFloat(e.amount);
  }

  // Convert totals to formatted strings.
  return Object.entries(summary).map(([category, { count, total }]) => ({
    category,
    count,
    total: total.toFixed(2),
  }));
}

module.exports = { createExpense, getExpenses, getCategorySummary };
