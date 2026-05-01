/**
 * idempotency.js — Express middleware for idempotency-key enforcement.
 *
 * Protocol:
 *   1. Client generates a UUID v4, sends it in `Idempotency-Key: <uuid>` header.
 *   2. On first receipt: process the request normally, cache the response.
 *   3. On duplicate receipt (same key): return cached response immediately.
 *
 * This middleware is applied ONLY to POST /expenses (state-mutating endpoint).
 * GET requests are naturally idempotent and need no caching.
 *
 * IMPORTANT: The middleware wraps res.json() so it can intercept the response
 * body after the controller builds it, then persists that body to the DB.
 */

const { findKey, saveKey } = require('../models/idempotencyModel');

// Validate that the key looks like a UUID v4 to reject garbage values.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function idempotencyMiddleware(req, res, next) {
  const key = req.headers['idempotency-key'];

  // If no key is provided, skip idempotency logic entirely.
  // This is a deliberate design choice: we don't force clients to send keys,
  // but we strongly encourage it via documentation.
  if (!key) {
    return next();
  }

  // Reject malformed keys immediately — prevents DB pollution.
  if (!UUID_RE.test(key)) {
    return res.status(400).json({
      success: false,
      errors:  ['Idempotency-Key must be a valid UUID v4.'],
    });
  }

  // Check cache.
  const cached = findKey(key);
  if (cached) {
    // Return the exact same response the first request produced.
    // The `Idempotent-Replayed` header lets clients detect replayed responses.
    res.setHeader('Idempotent-Replayed', 'true');
    return res.status(cached.status_code).json(cached.response);
  }

  // Intercept res.json to capture the response body AFTER the controller runs.
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    // Only cache successful responses (2xx) — don't cache validation errors.
    if (res.statusCode >= 200 && res.statusCode < 300) {
      saveKey(key, body, res.statusCode);
    }
    return originalJson(body);
  };

  next();
}

module.exports = { idempotencyMiddleware };
