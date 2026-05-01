const { findKey, saveKey } = require('../models/idempotencyModel');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function idempotencyMiddleware(req, res, next) {
  try {
    const key = req.headers['idempotency-key'];

    if (!key) {
      return next();
    }

    if (!UUID_RE.test(key)) {
      return res.status(400).json({
        success: false,
        errors:  ['Idempotency-Key must be a valid UUID v4.'],
      });
    }

    const cached = await findKey(key);
    if (cached) {
      res.setHeader('Idempotent-Replayed', 'true');
      return res.status(cached.status_code).json(cached.response);
    }

    const originalJson = res.json.bind(res);
    res.json = function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        saveKey(key, body, res.statusCode).catch(() => {});
      }
      return originalJson(body);
    };

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { idempotencyMiddleware };
