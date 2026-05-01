const expenseService = require('../services/expenseService');

async function createExpense(req, res, next) {
  try {
    const { amount, category, description, date } = req.body;

    const expense = await expenseService.createExpense({ amount, category, description, date });

    return res.status(201).json({
      success: true,
      data:    expense,
    });
  } catch (err) {
    next(err);
  }
}

async function getExpenses(req, res, next) {
  try {
    const { category, sort } = req.query;

    const allowedSorts = ['date_asc', 'date_desc'];
    const safeSort = allowedSorts.includes(sort) ? sort : 'date_desc';

    const result = await expenseService.getExpenses({
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

async function getCategorySummary(req, res, next) {
  try {
    const summary = await expenseService.getCategorySummary({});
    return res.status(200).json({
      success: true,
      data:    summary,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createExpense, getExpenses, getCategorySummary };
