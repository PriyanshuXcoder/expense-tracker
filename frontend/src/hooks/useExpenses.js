/**
 * useExpenses.js — Custom hook for fetching and managing the expense list.
 *
 * WHY a custom hook?
 *   Separates data-fetching concerns from UI concerns.  The hook owns:
 *     - Loading / error / data state
 *     - Refetch trigger (called after a new expense is created)
 *   Components just consume the state and call refetch() when needed.
 */

import { useState, useEffect, useCallback } from 'react';
import { getExpenses } from '../api/expenses';

/**
 * useExpenses
 * @param {object} filters — { category: string | null, sort: string }
 * @returns {{ expenses, total, loading, error, refetch }}
 */
export function useExpenses(filters) {
  const [expenses, setExpenses] = useState([]);
  const [total,    setTotal]    = useState('0.00');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getExpenses(filters);
      setExpenses(result.data || []);
      setTotal(result.meta?.total || '0.00');
    } catch (err) {
      setError(err.message || 'Failed to load expenses.');
    } finally {
      setLoading(false);
    }
  }, [filters.category, filters.sort]);  // eslint-disable-line

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  return { expenses, total, loading, error, refetch: fetchExpenses };
}
