/**
 * expenseRoutes.js — Route definitions for the /expenses resource.
 *
 * Middleware application order matters:
 *   1. idempotencyMiddleware — check/store idempotency key BEFORE validation
 *      so a replayed request short-circuits before hitting the DB at all.
 *   2. validateCreateExpense — validate input BEFORE the controller so the
 *      controller can assume clean data.
 *   3. Controller function — business logic.
 */

const express = require('express');
const router  = express.Router();

const { createExpense, getExpenses, getCategorySummary } = require('../controllers/expenseController');
const { validateCreateExpense } = require('../middleware/validation');
const { idempotencyMiddleware }  = require('../middleware/idempotency');

// GET /expenses/categories/summary  — MUST be defined before /:id routes
// to prevent Express from interpreting "categories" as an ID parameter.
router.get('/categories/summary', getCategorySummary);

// GET /expenses
router.get('/', getExpenses);

// POST /expenses
router.post('/', idempotencyMiddleware, validateCreateExpense, createExpense);

module.exports = router;
