/**
 * formatCurrency — Format a dollar string for display.
 * Always shows 2 decimal places and a $ prefix.
 */
export function formatCurrency(amount) {
  const num = parseFloat(amount);
  if (isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style:                 'currency',
    currency:              'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * formatDate — Format a YYYY-MM-DD string to a human-readable date.
 * Uses UTC to avoid timezone-driven off-by-one-day bugs.
 */
export function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00Z');
  return date.toLocaleDateString('en-US', {
    year:     'numeric',
    month:    'short',
    day:      'numeric',
    timeZone: 'UTC',
  });
}

/**
 * generateIdempotencyKey — Generates a UUID v4 for idempotency.
 * Uses the native crypto API (available in all modern browsers).
 */
export function generateIdempotencyKey() {
  return crypto.randomUUID();
}

/** CATEGORIES — single source of truth shared with validation middleware. */
export const CATEGORIES = [
  'Food', 'Transport', 'Housing', 'Healthcare',
  'Entertainment', 'Shopping', 'Education', 'Travel', 'Other',
];

/** Category colour map for badges and chart. */
export const CATEGORY_COLORS = {
  Food:          '#f59e0b',
  Transport:     '#3b82f6',
  Housing:       '#8b5cf6',
  Healthcare:    '#ef4444',
  Entertainment: '#ec4899',
  Shopping:      '#06b6d4',
  Education:     '#10b981',
  Travel:        '#f97316',
  Other:         '#6b7280',
};
