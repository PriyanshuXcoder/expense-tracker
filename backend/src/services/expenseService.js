const expenseModel = require('../models/expenseModel');

async function createExpense(data) {
  return await expenseModel.createExpense(data);
}

async function getExpenses(filters) {
  const expenses = await expenseModel.getExpenses(filters);

  const total = expenses
    .reduce((sum, e) => sum + parseFloat(e.amount), 0)
    .toFixed(2);

  return { expenses, total };
}

async function getCategorySummary(filters) {
  const { expenses } = await getExpenses(filters);

  const summary = {};
  for (const e of expenses) {
    if (!summary[e.category]) {
      summary[e.category] = { count: 0, total: 0 };
    }
    summary[e.category].count  += 1;
    summary[e.category].total  += parseFloat(e.amount);
  }

  return Object.entries(summary).map(([category, { count, total }]) => ({
    category,
    count,
    total: total.toFixed(2),
  }));
}

module.exports = { createExpense, getExpenses, getCategorySummary };
