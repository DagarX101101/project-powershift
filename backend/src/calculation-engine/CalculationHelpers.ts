/**
 * CalculationHelpers.ts
 * Pure mathematical utility functions for the Calculation Engine.
 * All functions are deterministic and have no side-effects.
 */

/**
 * CEILING function — rounds a number up to the nearest integer.
 * Equivalent to Excel's CEILING.MATH(n, 1).
 * @param value The number to round up
 * @returns The smallest integer >= value
 */
export function ceiling(value: number): number {
  return Math.ceil(value);
}

/**
 * Safe division — returns 0 when divisor is zero instead of Infinity or NaN.
 * Use this anywhere division is performed on user-supplied data.
 * @param numerator
 * @param denominator
 * @returns numerator / denominator, or 0 if denominator is 0
 */
export function safeDivide(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return numerator / denominator;
}

/**
 * Applies a percentage (0–100) to a value, returning the proportional fraction.
 * @param value Base value
 * @param percentage A number between 0 and 100
 * @returns value × (percentage / 100)
 */
export function applyPercentage(value: number, percentage: number): number {
  return value * (percentage / 100);
}

/**
 * Rounds a floating-point number to a fixed number of decimal places.
 * Prevents floating-point drift in intermediate display values.
 * @param value Number to round
 * @param decimals Number of decimal places (default: 4)
 */
export function roundTo(value: number, decimals: number = 4): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Determines if two numbers are approximately equal within a tolerance.
 * @param a First value
 * @param b Second value
 * @param tolerance Maximum allowed absolute difference (default: 0.001)
 */
export function approxEqual(a: number, b: number, tolerance: number = 0.001): boolean {
  return Math.abs(a - b) <= tolerance;
}
