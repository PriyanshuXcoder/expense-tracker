/**
 * TotalDisplay.jsx — Shows the total of visible expenses and a category breakdown.
 */

import { formatCurrency, CATEGORY_COLORS } from '../utils/format';

export default function TotalDisplay({ total, expenses, activeCategory }) {
  const label = activeCategory ? `Total for ${activeCategory}` : 'Total Expenses';

  // Mini breakdown bar — shows proportions of top 5 categories.
  const catTotals = {};
  expenses.forEach(e => {
    catTotals[e.category] = (catTotals[e.category] || 0) + parseFloat(e.amount);
  });
  const grandTotal = parseFloat(total) || 0;

  const breakdown = Object.entries(catTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="total-display">
      <div className="total-main">
        <span className="total-label">{label}</span>
        <span className="total-amount">{formatCurrency(total)}</span>
      </div>

      {/* Proportional bar chart */}
      {grandTotal > 0 && breakdown.length > 1 && (
        <div className="breakdown-bar" role="img" aria-label="Category breakdown">
          {breakdown.map(([cat, catTotal]) => {
            const pct = ((catTotal / grandTotal) * 100).toFixed(1);
            return (
              <div
                key={cat}
                className="breakdown-segment"
                style={{
                  width:      `${pct}%`,
                  background: CATEGORY_COLORS[cat] || '#6b7280',
                }}
                title={`${cat}: ${formatCurrency(catTotal)} (${pct}%)`}
              />
            );
          })}
        </div>
      )}

      {/* Legend */}
      {grandTotal > 0 && (
        <div className="breakdown-legend">
          {breakdown.map(([cat, catTotal]) => (
            <span key={cat} className="legend-item">
              <span
                className="legend-dot"
                style={{ background: CATEGORY_COLORS[cat] || '#6b7280' }}
                aria-hidden="true"
              />
              {cat} · {formatCurrency(catTotal)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
