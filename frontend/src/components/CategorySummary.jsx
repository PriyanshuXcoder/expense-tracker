/**
 * CategorySummary.jsx — Category-wise breakdown cards (nice-to-have feature).
 */

import { useState, useEffect } from 'react';
import { getCategorySummary } from '../api/expenses';
import { formatCurrency, CATEGORY_COLORS } from '../utils/format';

export default function CategorySummary({ refreshKey }) {
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCategorySummary()
      .then(res => setSummary(res.data || []))
      .catch(() => setSummary([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading || summary.length === 0) return null;

  // Sort by total descending.
  const sorted = [...summary].sort((a, b) => parseFloat(b.total) - parseFloat(a.total));
  const grandTotal = sorted.reduce((s, c) => s + parseFloat(c.total), 0);

  return (
    <section className="category-summary" aria-label="Category summary">
      <h3 className="section-title">Spending by Category</h3>
      <div className="summary-cards">
        {sorted.map(({ category, count, total }) => {
          const pct = grandTotal > 0 ? ((parseFloat(total) / grandTotal) * 100).toFixed(0) : 0;
          const color = CATEGORY_COLORS[category] || '#6b7280';
          return (
            <div key={category} className="summary-card" style={{ borderTopColor: color }}>
              <div className="summary-card-header">
                <span className="summary-cat" style={{ color }}>{category}</span>
                <span className="summary-pct">{pct}%</span>
              </div>
              <div className="summary-amount">{formatCurrency(total)}</div>
              <div className="summary-count">{count} expense{count !== 1 ? 's' : ''}</div>
              <div className="summary-progress" aria-hidden="true">
                <div
                  className="summary-progress-fill"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
