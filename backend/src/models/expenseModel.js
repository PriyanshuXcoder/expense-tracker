const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  amount: { type: Number, required: true }, // Store as integer cents
  category: { type: String, required: true },
  description: { type: String, default: '' },
  date: { type: String, required: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1 });

const Expense = mongoose.model('Expense', expenseSchema);

function dollarsToCents(amount) {
  const cents = Math.round(parseFloat(amount) * 100);
  if (!Number.isFinite(cents)) {
    throw new Error(`Invalid amount: ${amount}`);
  }
  return cents;
}

function centsToDollars(cents) {
  return (cents / 100).toFixed(2);
}

function docToExpense(doc) {
  return {
    id: doc._id.toString(),
    amount: centsToDollars(doc.amount),
    category: doc.category,
    description: doc.description,
    date: doc.date,
    created_at: doc.created_at.toISOString(),
  };
}

async function createExpense({ amount, category, description, date }) {
  const amountCents = dollarsToCents(amount);
  const expense = new Expense({ amount: amountCents, category, description, date });
  await expense.save();
  return docToExpense(expense);
}

async function getExpenses({ category, sort } = {}) {
  const sortDir = sort === 'date_asc' ? 1 : -1;
  const query = category ? { category } : {};
  
  const docs = await Expense.find(query).sort({ date: sortDir, created_at: sortDir });
  return docs.map(docToExpense);
}

async function getExpenseById(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const doc = await Expense.findById(id);
  return doc ? docToExpense(doc) : null;
}

module.exports = { createExpense, getExpenses, getExpenseById, dollarsToCents, centsToDollars };
