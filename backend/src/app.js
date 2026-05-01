/**
 * app.js — Express application factory.
 *
 * Separating app construction from server.listen() enables clean unit testing
 * with supertest (which starts its own HTTP server without port conflicts).
 */

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');

const expenseRoutes  = require('./routes/expenseRoutes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// ─── Security Headers ────────────────────────────────────────────────────────
// helmet sets sensible HTTP security headers (X-Content-Type-Options, etc.)
app.use(helmet());

// ─── CORS ────────────────────────────────────────────────────────────────────
// In production, lock this down to your actual frontend origin.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no Origin header (server-to-server, curl, Postman).
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed.`));
    }
  },
  methods:            ['GET', 'POST', 'OPTIONS'],
  allowedHeaders:     ['Content-Type', 'Idempotency-Key'],
  exposedHeaders:     ['Idempotent-Replayed'],
  optionsSuccessStatus: 204,
}));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
// Prevent abuse / accidental script loops.
// 200 requests per 15-minute window per IP is generous for human usage.
const limiter = rateLimit({
  windowMs:         15 * 60 * 1000, // 15 minutes
  max:              200,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { success: false, error: 'Too many requests. Please try again later.' },
});
app.use(limiter);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));  // Reject oversized payloads.

// ─── Request Logging ─────────────────────────────────────────────────────────
// Use 'dev' format in development, 'combined' (Apache-style) in production.
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/expenses', expenseRoutes);

// Health-check endpoint — used by load balancers and deployment platforms.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler for unmatched routes.
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found.' });
});

// ─── Centralised Error Handler ────────────────────────────────────────────────
// MUST be last — Express identifies error handlers by 4-arg signature.
app.use(errorHandler);

module.exports = app;
