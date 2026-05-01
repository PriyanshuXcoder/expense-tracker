/**
 * FilterBar.jsx — Category filter + sort controls.
 *
 * Props:
 *   - filters: { category: string, sort: string }
 *   - onFilterChange: (key, value) => void
 *   - categorySummary: [{ category, count, total }]
 *
 * Design choice: the filter bar shows category counts from the UNFILTERED
 * dataset so the user always sees how many expenses exist in each category.
 */

import { CATEGORIES, CATEGORY_COLORS, formatCurrency } from '../utils/format';

export default function FilterBar({ filters, onFilterChange, categorySummary }) {
  const summaryMap = {};
  if (categorySummary) {
    categorySummary.forEach(s => { summaryMap[s.category] = s; });
  }

  return (
    <div className="filter-bar">
      {/* Category pills */}
      <div className="filter-section">
        <span className="filter-label">Category</span>
        <div className="filter-pills" role="group" aria-label="Filter by category">
          <button
            className={`pill${!filters.category ? ' pill--active' : ''}`}
            onClick={() => onFilterChange('category', '')}
            aria-pressed={!filters.category}
          >
            All
          </button>
          {CATEGORIES.map(cat => {
            const summary = summaryMap[cat];
            const isActive = filters.category === cat;
            return (
              <button
                key={cat}
                className={`pill${isActive ? ' pill--active' : ''}`}
                style={isActive ? { borderColor: CATEGORY_COLORS[cat], color: CATEGORY_COLORS[cat] } : {}}
                onClick={() => onFilterChange('category', cat)}
                aria-pressed={isActive}
                title={summary ? `${summary.count} expense(s) · ${formatCurrency(summary.total)}` : ''}
              >
                <span
                  className="pill-dot"
                  style={{ background: CATEGORY_COLORS[cat] }}
                  aria-hidden="true"
                />
                {cat}
                {summary && (
                  <span className="pill-count">{summary.count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sort select */}
      <div className="filter-section filter-section--sort">
        <label htmlFor="sort-select" className="filter-label">Sort</label>
        <select
          id="sort-select"
          className="sort-select"
          value={filters.sort}
          onChange={e => onFilterChange('sort', e.target.value)}
        >
          <option value="date_desc">Newest first</option>
          <option value="date_asc">Oldest first</option>
        </select>
      </div>
    </div>
  );
}
