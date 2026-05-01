/**
 * moneyUtils.test.js — Unit tests for the money-handling utilities.
 *
 * These are the most critical tests in the project.
 * A bug in dollarsToCents or centsToDollars would corrupt every record.
 */

const { dollarsToCents, centsToDollars } = require('../models/expenseModel');

describe('dollarsToCents', () => {
  test('converts whole dollars', () => {
    expect(dollarsToCents(10)).toBe(1000);
  });

  test('converts dollars with cents', () => {
    expect(dollarsToCents('12.99')).toBe(1299);
  });

  test('handles floating-point classic pitfall: 0.1 + 0.2', () => {
    // 0.1 + 0.2 = 0.30000000000000004 in JS — Math.round handles this.
    expect(dollarsToCents(0.1 + 0.2)).toBe(30);
  });

  test('handles 1 cent', () => {
    expect(dollarsToCents('0.01')).toBe(1);
  });

  test('handles large amount', () => {
    expect(dollarsToCents('999999.99')).toBe(99999999);
  });

  test('throws on non-numeric input', () => {
    expect(() => dollarsToCents('abc')).toThrow();
  });
});

describe('centsToDollars', () => {
  test('converts cents to formatted string', () => {
    expect(centsToDollars(1299)).toBe('12.99');
  });

  test('formats zero cents', () => {
    expect(centsToDollars(0)).toBe('0.00');
  });

  test('always returns 2 decimal places', () => {
    expect(centsToDollars(100)).toBe('1.00');
    expect(centsToDollars(1001)).toBe('10.01');
  });

  test('returns a string, not a number', () => {
    expect(typeof centsToDollars(1299)).toBe('string');
  });
});
