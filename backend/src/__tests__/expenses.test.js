/**
 * expenses.test.js — Integration tests for the expenses API.
 *
 * WHY integration tests (not unit tests)?
 *   The most valuable tests for this application verify that the full HTTP
 *   request/response cycle — middleware, controller, service, model, SQLite —
 *   works correctly end-to-end.  Unit tests for pure utility functions
 *   (dollarsToCents, centsToDollars) are in moneyUtils.test.js.
 *
 * We use an in-memory SQLite database for tests to avoid touching the
 * production data file.  jest's --runInBand flag ensures tests run serially
 * so the shared DB is not corrupted by concurrent writes.
 *
 * NOTE: We override the DB_PATH via environment variable in the jest config.
 */

const request = require('supertest');
const app     = require('../app');

// ─── Test helpers ─────────────────────────────────────────────────────────────
const TODAY = new Date().toISOString().slice(0, 10);

function validPayload(overrides = {}) {
  return {
    amount:      '12.99',
    category:    'Food',
    description: 'Lunch',
    date:        TODAY,
    ...overrides,
  };
}

// ─── POST /expenses ───────────────────────────────────────────────────────────
describe('POST /expenses', () => {
  test('201 — creates a valid expense', async () => {
    const res = await request(app).post('/expenses').send(validPayload());
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      amount:   '12.99',
      category: 'Food',
      date:     TODAY,
    });
    expect(res.body.data.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  test('400 — rejects negative amount', async () => {
    const res = await request(app).post('/expenses').send(validPayload({ amount: '-5' }));
    expect(res.status).toBe(400);
    expect(res.body.errors).toContain('amount must be greater than 0.');
  });

  test('400 — rejects zero amount', async () => {
    const res = await request(app).post('/expenses').send(validPayload({ amount: '0' }));
    expect(res.status).toBe(400);
  });

  test('400 — rejects amount with more than 2 decimal places', async () => {
    const res = await request(app).post('/expenses').send(validPayload({ amount: '1.999' }));
    expect(res.status).toBe(400);
    expect(res.body.errors.some(e => e.includes('decimal places'))).toBe(true);
  });

  test('400 — rejects invalid category', async () => {
    const res = await request(app).post('/expenses').send(validPayload({ category: 'Rockets' }));
    expect(res.status).toBe(400);
  });

  test('400 — rejects missing date', async () => {
    const payload = validPayload();
    delete payload.date;
    const res = await request(app).post('/expenses').send(payload);
    expect(res.status).toBe(400);
    expect(res.body.errors).toContain('date is required.');
  });

  test('400 — rejects future date', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const res = await request(app).post('/expenses').send(
      validPayload({ date: futureDate.toISOString().slice(0, 10) })
    );
    expect(res.status).toBe(400);
    expect(res.body.errors.some(e => e.includes('future'))).toBe(true);
  });

  test('400 — rejects invalid Idempotency-Key format', async () => {
    const res = await request(app)
      .post('/expenses')
      .set('Idempotency-Key', 'not-a-uuid')
      .send(validPayload());
    expect(res.status).toBe(400);
  });
});

// ─── Idempotency ─────────────────────────────────────────────────────────────
describe('POST /expenses — idempotency', () => {
  test('returns same response for duplicate Idempotency-Key', async () => {
    const { v4: uuidv4 } = require('uuid');
    const key = uuidv4();

    const first = await request(app)
      .post('/expenses')
      .set('Idempotency-Key', key)
      .send(validPayload({ amount: '99.99', description: 'Idempotency test' }));

    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/expenses')
      .set('Idempotency-Key', key)
      .send(validPayload({ amount: '99.99', description: 'Idempotency test' }));

    expect(second.status).toBe(201);
    expect(second.headers['idempotent-replayed']).toBe('true');
    // Same expense ID — no duplicate row was created.
    expect(second.body.data.id).toBe(first.body.data.id);
  });
});

// ─── GET /expenses ────────────────────────────────────────────────────────────
describe('GET /expenses', () => {
  test('200 — returns expense list with meta', async () => {
    const res = await request(app).get('/expenses');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toHaveProperty('count');
    expect(res.body.meta).toHaveProperty('total');
  });

  test('200 — filters by category', async () => {
    // Insert a Transport expense.
    await request(app).post('/expenses').send(
      validPayload({ category: 'Transport', amount: '5.00', description: 'Bus' })
    );

    const res = await request(app).get('/expenses?category=Transport');
    expect(res.status).toBe(200);
    expect(res.body.data.every(e => e.category === 'Transport')).toBe(true);
  });

  test('200 — total matches sum of visible expenses', async () => {
    const res = await request(app).get('/expenses');
    const sumFromItems = res.body.data
      .reduce((acc, e) => acc + parseFloat(e.amount), 0)
      .toFixed(2);
    expect(res.body.meta.total).toBe(sumFromItems);
  });
});

// ─── GET /expenses/categories/summary ────────────────────────────────────────
describe('GET /expenses/categories/summary', () => {
  test('200 — returns category breakdown', async () => {
    const res = await request(app).get('/expenses/categories/summary');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    if (res.body.data.length > 0) {
      expect(res.body.data[0]).toHaveProperty('category');
      expect(res.body.data[0]).toHaveProperty('count');
      expect(res.body.data[0]).toHaveProperty('total');
    }
  });
});

// ─── Health check ─────────────────────────────────────────────────────────────
describe('GET /health', () => {
  test('200 — returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
