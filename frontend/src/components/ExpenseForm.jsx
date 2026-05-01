/**
 * ExpenseForm.jsx — Add Expense form component.
 *
 * Real-world concerns addressed here:
 *   1. MULTIPLE SUBMIT CLICKS — The submit button is disabled while the
 *      API call is in-flight.  The `submitting` state gate prevents double
 *      submissions even if the user manages to click before the UI updates.
 *
 *   2. IDEMPOTENCY — A UUID v4 is generated once when the user first starts
 *      filling the form (or on mount) and reused across retries.  If the
 *      network call fails and the user clicks again without changing the form,
 *      the same key is used.  Once the call succeeds, a fresh key is generated
 *      for the next submission.
 *
 *   3. API FAILURES — The error message from the API is displayed inline.
 *      The form is NOT cleared on failure so the user doesn't lose their input.
 *
 *   4. LOADING STATES — A spinner inside the button gives feedback during
 *      the API call, replacing the button text.
 */

import { useState, useRef } from 'react';
import { createExpense } from '../api/expenses';
import { CATEGORIES, generateIdempotencyKey } from '../utils/format';

const TODAY = new Date().toISOString().slice(0, 10);

const INITIAL_FORM = {
  amount:      '',
  category:    '',
  description: '',
  date:        TODAY,
};

export default function ExpenseForm({ onSuccess }) {
  const [form,       setForm]       = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [errors,     setErrors]     = useState([]);
  const [apiError,   setApiError]   = useState('');

  // Idempotency key is held in a ref (not state) so it doesn't trigger re-renders.
  // It's generated once per "logical submission attempt."
  const idempotencyKeyRef = useRef(generateIdempotencyKey());

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    // Clear field-level errors as the user types.
    if (errors.length > 0) setErrors([]);
    if (apiError) setApiError('');
  }

  function validateLocal() {
    const errs = [];
    const amt = parseFloat(form.amount);
    if (!form.amount)              errs.push('Amount is required.');
    else if (isNaN(amt) || amt <= 0) errs.push('Amount must be a positive number.');
    if (!form.category)            errs.push('Category is required.');
    if (!form.date)                errs.push('Date is required.');
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Client-side validation first — fast feedback, no network roundtrip.
    const localErrors = validateLocal();
    if (localErrors.length > 0) {
      setErrors(localErrors);
      return;
    }

    // Prevent duplicate submissions while the API call is running.
    if (submitting) return;

    setSubmitting(true);
    setErrors([]);
    setApiError('');

    try {
      await createExpense(
        {
          amount:      form.amount,
          category:    form.category,
          description: form.description,
          date:        form.date,
        },
        idempotencyKeyRef.current
      );

      // Success — reset form and generate a fresh idempotency key.
      setForm(INITIAL_FORM);
      idempotencyKeyRef.current = generateIdempotencyKey();
      onSuccess?.();
    } catch (err) {
      // Display server validation errors if available, otherwise generic message.
      const serverErrors = err?.data?.errors;
      if (serverErrors?.length > 0) {
        setErrors(serverErrors);
      } else {
        setApiError(err.message || 'Failed to save expense. Please try again.');
      }
      // NOTE: We do NOT generate a fresh idempotency key on failure.
      //       The user can retry the same data safely with the same key.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="expense-form" onSubmit={handleSubmit} noValidate>
      <h2 className="form-title">Add Expense</h2>

      {/* Error display */}
      {errors.length > 0 && (
        <div className="form-error-list" role="alert" aria-live="polite">
          <ul>
            {errors.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        </div>
      )}
      {apiError && (
        <div className="form-error-list api-error" role="alert" aria-live="polite">
          <p>⚠ {apiError}</p>
        </div>
      )}

      <div className="form-grid">
        {/* Amount */}
        <div className="form-group">
          <label htmlFor="amount">Amount ($)</label>
          <input
            id="amount"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            value={form.amount}
            onChange={handleChange}
            disabled={submitting}
            aria-required="true"
          />
        </div>

        {/* Category */}
        <div className="form-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={form.category}
            onChange={handleChange}
            disabled={submitting}
            aria-required="true"
          >
            <option value="">Select category…</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div className="form-group">
          <label htmlFor="date">Date</label>
          <input
            id="date"
            name="date"
            type="date"
            max={TODAY}
            value={form.date}
            onChange={handleChange}
            disabled={submitting}
            aria-required="true"
          />
        </div>

        {/* Description */}
        <div className="form-group form-group--full">
          <label htmlFor="description">Description <span className="optional">(optional)</span></label>
          <input
            id="description"
            name="description"
            type="text"
            maxLength={255}
            placeholder="e.g. Grocery run at Whole Foods"
            value={form.description}
            onChange={handleChange}
            disabled={submitting}
          />
        </div>
      </div>

      {/* Submit */}
      <button
        id="submit-expense-btn"
        type="submit"
        className={`btn btn-primary${submitting ? ' btn--loading' : ''}`}
        disabled={submitting}
        aria-busy={submitting}
      >
        {submitting ? (
          <>
            <span className="spinner" aria-hidden="true" />
            Saving…
          </>
        ) : (
          '+ Add Expense'
        )}
      </button>
    </form>
  );
}
