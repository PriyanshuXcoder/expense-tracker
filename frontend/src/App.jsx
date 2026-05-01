/**
 * App.jsx — Root application component.
 *
 * State ownership:
 *   - `filters`      — category and sort state lives here and flows down.
 *   - `refreshKey`   — incremented after a successful expense creation to
 *                      trigger re-fetches in useExpenses and CategorySummary.
 *
 * WHY refreshKey instead of a shared state object?
 *   Incrementing a counter is a simple, predictable way to signal "data has
 *   changed, please refetch" without complex state synchronisation or a state
 *   management library.  The counter is passed as a dependency so React
 *   re-runs the effect that fetches data.
 */

import { useState, useCallback } from 'react';
import ExpenseForm      from './components/ExpenseForm';
import FilterBar        from './components/FilterBar';
import ExpenseList      from './components/ExpenseList';
import TotalDisplay     from './components/TotalDisplay';
import CategorySummary  from './components/CategorySummary';
import { useExpenses }  from './hooks/useExpenses';

export default function App() {
  const [filters, setFilters]       = useState({ category: '', sort: 'date_desc' });
  const [refreshKey, setRefreshKey] = useState(0);

  const { expenses, total, loading, error, refetch } = useExpenses(filters);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleExpenseAdded = useCallback(() => {
    // Refetch the current filter view immediately.
    refetch();
    // Increment refreshKey to trigger CategorySummary to refresh too.
    setRefreshKey(k => k + 1);
  }, [refetch]);

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon" aria-hidden="true">💳</span>
            <span className="logo-text">ExpenseTrack</span>
          </div>
          <p className="header-tagline">Understand where your money goes.</p>
        </div>
      </header>

      <main className="app-main">
        {/* Two-column layout on wider screens */}
        <div className="layout">
          {/* Left column: form */}
          <aside className="layout-sidebar">
            <ExpenseForm onSuccess={handleExpenseAdded} />
            <CategorySummary refreshKey={refreshKey} />
          </aside>

          {/* Right column: list + controls */}
          <section className="layout-content" aria-label="Expense list">
            <TotalDisplay
              total={total}
              expenses={expenses}
              activeCategory={filters.category}
            />

            <FilterBar
              filters={filters}
              onFilterChange={handleFilterChange}
              categorySummary={null}
            />

            <ExpenseList
              expenses={expenses}
              loading={loading}
              error={error}
              onRetry={refetch}
              activeCategory={filters.category}
            />
          </section>
        </div>
      </main>

      <footer className="app-footer">
        <p>ExpenseTrack · Built with Node.js, SQLite &amp; React</p>
      </footer>
    </div>
  );
}
