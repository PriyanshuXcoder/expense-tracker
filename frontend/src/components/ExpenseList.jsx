/**
 * ExpenseList.jsx — Table of expenses with loading, empty, and error states.
 *
 * Handles:
 *   - Loading skeleton rows (avoids layout shift on initial load)
 *   - Empty state with a contextual call-to-action
 *   - API error state with retry button
 */

import { formatCurrency, formatDate, CATEGORY_COLORS } from '../utils/format';

// Loading skeleton — shows placeholder rows while data fetches.
function SkeletonRow() {
  return (
    <tr className="skeleton-row" aria-hidden="true">
      <td><div className="skeleton skeleton--date" /></td>
      <td><div className="skeleton skeleton--category" /></td>
      <td><div className="skeleton skeleton--desc" /></td>
      <td><div className="skeleton skeleton--amount" /></td>
    </tr>
  );
}

export default function ExpenseList({ expenses, loading, error, onRetry, activeCategory }) {
  if (error) {
    return (
      <div className="list-state list-state--error" role="alert">
        <span className="state-icon">⚠</span>
        <p>{error}</p>
        <button className="btn btn-outline" onClick={onRetry}>Retry</button>
      </div>
    );
  }

  return (
    <div className="expense-list-wrapper">
      <div className="table-responsive">
        <table className="expense-table" aria-label="Expense list" aria-live="polite">
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Category</th>
              <th scope="col">Description</th>
              <th scope="col" className="col-amount">Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading && expenses.length === 0 ? (
              // Show 5 skeleton rows on initial load.
              Array.from({ length: 5 }, (_, i) => <SkeletonRow key={i} />)
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <div className="list-state list-state--empty">
                    <span className="state-icon">💸</span>
                    <p>
                      {activeCategory
                        ? `No expenses in "${activeCategory}" yet.`
                        : 'No expenses recorded yet. Add your first one above!'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              expenses.map(expense => (
                <tr key={expense.id} className="expense-row">
                  <td className="col-date">
                    <time dateTime={expense.date}>{formatDate(expense.date)}</time>
                  </td>
                  <td className="col-category">
                    <span
                      className="category-badge"
                      style={{
                        background: `${CATEGORY_COLORS[expense.category]}22`,
                        color:      CATEGORY_COLORS[expense.category] || '#6b7280',
                        borderColor:`${CATEGORY_COLORS[expense.category]}44`,
                      }}
                    >
                      {expense.category}
                    </span>
                  </td>
                  <td className="col-desc">
                    <span className="desc-text">
                      {expense.description || <em className="no-desc">—</em>}
                    </span>
                  </td>
                  <td className="col-amount">
                    <span className="amount-value">{formatCurrency(expense.amount)}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Subtle overlay when re-fetching with existing data */}
      {loading && expenses.length > 0 && (
        <div className="list-refetch-overlay" aria-live="polite" aria-label="Refreshing expenses">
          <span className="spinner spinner--sm" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
