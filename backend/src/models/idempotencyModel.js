const mongoose = require('mongoose');

const idempotencySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  response: { type: String, required: true },
  status_code: { type: Number, required: true },
  created_at: { type: Date, default: Date.now, expires: 86400 } // MongoDB TTL index (24 hours)
});

const IdempotencyKey = mongoose.model('IdempotencyKey', idempotencySchema);

async function findKey(key) {
  const doc = await IdempotencyKey.findOne({ key });
  if (!doc) return null;
  return {
    response: JSON.parse(doc.response),
    status_code: doc.status_code,
  };
}

async function saveKey(key, response, status_code) {
  try {
    const doc = new IdempotencyKey({
      key,
      response: JSON.stringify(response),
      status_code,
    });
    await doc.save();
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key error is fine, means another concurrent request saved it first
    } else {
      console.error('[idempotency] Failed to save key:', err.message);
    }
  }
}

async function purgeExpiredKeys() {
  // Mongoose TTL index automatically handles this in MongoDB, so no-op.
}

module.exports = { findKey, saveKey, purgeExpiredKeys };
