/**
 * CalculationValidation.ts
 * Input validation logic for the Project PowerShift Calculation Engine.
 *
 * Validates a CalculationInputBundle BEFORE any formulas are executed.
 * Returns a structured list of validation errors so all problems can be
 * reported to the caller in a single response, rather than failing on the
 * first issue encountered.
 */

import { CalculationInputBundle } from './CalculationTypes';
import { PERCENTAGE_TOLERANCE } from './FormulaConstants';
import { approxEqual } from './CalculationHelpers';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates every required field in a CalculationInputBundle.
 * Checks for:
 *  - Null / undefined values
 *  - Negative numbers
 *  - Zero productivities (would cause division-by-zero in Vehicle formulas)
 *  - TOD percentages not summing to exactly 100 %
 */
export function validateInputBundle(input: CalculationInputBundle): ValidationResult {
  const errors: string[] = [];

  // --- Helper lambdas ---
  const requirePositive = (value: number, label: string): void => {
    if (value === null || value === undefined || isNaN(value)) {
      errors.push(`${label} is required and must be a valid number.`);
    } else if (value < 0) {
      errors.push(`${label} must not be negative (got ${value}).`);
    }
  };

  const requireStrictlyPositive = (value: number, label: string): void => {
    if (value === null || value === undefined || isNaN(value)) {
      errors.push(`${label} is required and must be a valid number.`);
    } else if (value <= 0) {
      errors.push(`${label} must be greater than zero (got ${value}). A zero value would cause division by zero.`);
    }
  };

  // --- Mine planning inputs ---
  requirePositive(input.coalProduction, 'Coal Production');
  requirePositive(input.obProduction, 'OB Production');
  requirePositive(input.chpRequirement, 'CHP, Washery & Mining Requirement');
  requirePositive(input.availableEVPower, 'Total Available Power for EV');

  // --- Vehicle productivities — must be strictly positive (used as divisors) ---
  requireStrictlyPositive(input.felProductivity, 'FEL EV Productivity');
  requireStrictlyPositive(input.coalDumperProductivity, 'Coal Dumper EV Productivity');
  requireStrictlyPositive(input.obDumperProductivity, 'OB Dumper EV Productivity');

  // --- TOD percentages ---
  const { normalPercentage, offPeakPercentage, peakPercentage } = input.tod;

  requirePositive(normalPercentage, 'TOD Normal Percentage');
  requirePositive(offPeakPercentage, 'TOD Off-Peak Percentage');
  requirePositive(peakPercentage, 'TOD Peak Percentage');

  if (normalPercentage > 100) errors.push(`TOD Normal Percentage must not exceed 100 (got ${normalPercentage}).`);
  if (offPeakPercentage > 100) errors.push(`TOD Off-Peak Percentage must not exceed 100 (got ${offPeakPercentage}).`);
  if (peakPercentage > 100) errors.push(`TOD Peak Percentage must not exceed 100 (got ${peakPercentage}).`);

  // Only check the sum if none of the individual values already failed
  if (errors.length === 0 || !errors.some(e => e.includes('TOD'))) {
    const todSum = normalPercentage + offPeakPercentage + peakPercentage;
    if (!approxEqual(todSum, 100, PERCENTAGE_TOLERANCE)) {
      errors.push(
        `TOD percentages must sum to exactly 100%. ` +
        `Current sum: ${todSum}% (Normal: ${normalPercentage}%, Off-Peak: ${offPeakPercentage}%, Peak: ${peakPercentage}%).`
      );
    }
  }

  // --- Identity fields ---
  if (!input.mineId) errors.push('mineId is required.');
  if (!input.financialYear) errors.push('financialYear is required.');

  return {
    valid: errors.length === 0,
    errors,
  };
}
