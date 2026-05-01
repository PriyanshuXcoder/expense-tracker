/**
 * errorHandler.js — Centralised Express error-handling middleware.
 *
 * Express distinguishes error-handling middleware by its 4-argument signature.
 * Any route or middleware that calls next(err) lands here.
 *
 * WHY centralise error handling?
 *   Scattered try/catch with individual res.status(500).json() calls are
 *   hard to maintain and often forget headers (e.g., CORS headers must be set
 *   even on error responses).  A single handler guarantees consistent shape.
 */

/* eslint-disable no-unused-vars */
function errorHandler(err, req, res, next) {
  // Log the full error server-side for observability.
  // In production, pipe this to a logging service (Datadog, Sentry, etc.).
  console.error('[ERROR]', {
    message: err.message,
    stack:   err.stack,
    path:    req.path,
    method:  req.method,
    body:    req.body,
  });

  // Detect SQLite-specific errors and translate to meaningful HTTP codes.
  if (err.code === 'SQLITE_CONSTRAINT') {
    return res.status(409).json({
      success: false,
      error:   'A conflicting record already exists.',
    });
  }

  // Generic 500 — never expose internal details to clients in production.
  const statusCode = err.statusCode || 500;
  const message    = statusCode < 500 ? err.message : 'An internal server error occurred.';

  return res.status(statusCode).json({
    success: false,
    error:   message,
  });
}

module.exports = { errorHandler };
