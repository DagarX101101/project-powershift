/**
 * ConsumptionCalculations.ts
 * Formulas 12–23 of the Project PowerShift Calculation Engine.
 *
 * Computes EV energy consumption, mine infrastructure consumption,
 * total consumption, and their Time-of-Day period breakdowns.
 */

import {
  CalculationInputBundle,
  ConsumptionCalculationResult,
} from './CalculationTypes';
import {
  EV_CONSUMPTION_FACTOR,
  MINE_INFRASTRUCTURE_FACTOR,
} from './FormulaConstants';
import { applyPercentage } from './CalculationHelpers';

/**
 * Formula 12: EV Consumption
 * Available EV Power × EV_CONSUMPTION_FACTOR
 */
export function calculateEVConsumption(availableEVPower: number): number {
  return availableEVPower * EV_CONSUMPTION_FACTOR;
}

/**
 * Formula 13: Mine Infrastructure Consumption
 * CHP Requirement × MINE_INFRASTRUCTURE_FACTOR
 */
export function calculateMineInfrastructureConsumption(chpRequirement: number): number {
  return chpRequirement * MINE_INFRASTRUCTURE_FACTOR;
}

/**
 * Formula 14: Total Consumption
 * EV Consumption + Mine Infrastructure Consumption
 */
export function calculateTotalConsumption(evConsumption: number, mineInfraConsumption: number): number {
  return evConsumption + mineInfraConsumption;
}

/**
 * Formulas 15–17: EV Consumption by TOD period
 */
export function calculateEVConsumptionByTOD(
  evConsumption: number,
  normalPct: number,
  offPeakPct: number,
  peakPct: number
): { normal: number; offPeak: number; peak: number } {
  return {
    normal: applyPercentage(evConsumption, normalPct),
    offPeak: applyPercentage(evConsumption, offPeakPct),
    peak: applyPercentage(evConsumption, peakPct),
  };
}

/**
 * Formulas 18–20: Mine Infrastructure Consumption by TOD period
 */
export function calculateMineConsumptionByTOD(
  mineConsumption: number,
  normalPct: number,
  offPeakPct: number,
  peakPct: number
): { normal: number; offPeak: number; peak: number } {
  return {
    normal: applyPercentage(mineConsumption, normalPct),
    offPeak: applyPercentage(mineConsumption, offPeakPct),
    peak: applyPercentage(mineConsumption, peakPct),
  };
}

/**
 * Formulas 21–23: Total Consumption by TOD period
 */
export function calculateTotalConsumptionByTOD(
  totalConsumption: number,
  normalPct: number,
  offPeakPct: number,
  peakPct: number
): { normal: number; offPeak: number; peak: number } {
  return {
    normal: applyPercentage(totalConsumption, normalPct),
    offPeak: applyPercentage(totalConsumption, offPeakPct),
    peak: applyPercentage(totalConsumption, peakPct),
  };
}

/**
 * Runs all twelve consumption formulas against the input bundle and returns
 * the complete ConsumptionCalculationResult.
 * @param input Validated CalculationInputBundle
 * @param availableEVPower Resolved from Power calculations (Formula 7)
 * @param chpRequirement Resolved from Power calculations (Formula 10)
 */
export function runConsumptionCalculations(
  input: CalculationInputBundle,
  availableEVPower: number,
  chpRequirement: number
): ConsumptionCalculationResult {
  const { normalPercentage, offPeakPercentage, peakPercentage } = input.tod;

  const evConsumption = calculateEVConsumption(availableEVPower);
  const mineInfrastructureConsumption = calculateMineInfrastructureConsumption(chpRequirement);
  const totalConsumption = calculateTotalConsumption(evConsumption, mineInfrastructureConsumption);

  const evByTOD = calculateEVConsumptionByTOD(evConsumption, normalPercentage, offPeakPercentage, peakPercentage);
  const mineByTOD = calculateMineConsumptionByTOD(mineInfrastructureConsumption, normalPercentage, offPeakPercentage, peakPercentage);
  const totalByTOD = calculateTotalConsumptionByTOD(totalConsumption, normalPercentage, offPeakPercentage, peakPercentage);

  return {
    evConsumption,
    mineInfrastructureConsumption,
    totalConsumption,
    normalEVConsumption: evByTOD.normal,
    offPeakEVConsumption: evByTOD.offPeak,
    peakEVConsumption: evByTOD.peak,
    normalMineConsumption: mineByTOD.normal,
    offPeakMineConsumption: mineByTOD.offPeak,
    peakMineConsumption: mineByTOD.peak,
    normalTotalConsumption: totalByTOD.normal,
    offPeakTotalConsumption: totalByTOD.offPeak,
    peakTotalConsumption: totalByTOD.peak,
  };
}
