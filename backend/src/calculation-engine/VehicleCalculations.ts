/**
 * VehicleCalculations.ts
 * Formulas 1–4 of the Project PowerShift Calculation Engine.
 *
 * Computes the number of EVs required for FEL, Coal Dumper, and OB Dumper
 * operations, plus the total fleet size.
 *
 * All inputs must be pre-validated by CalculationValidation before calling
 * these functions. No validation is performed here (Single Responsibility).
 */

import { CalculationInputBundle, VehicleCalculationResult } from './CalculationTypes';
import { ceiling, safeDivide } from './CalculationHelpers';

/**
 * Formula 1: FEL EV Count
 * FEL EV = CEILING(Coal Production / FEL Productivity)
 */
export function calculateFELEV(coalProduction: number, felProductivity: number): number {
  return ceiling(safeDivide(coalProduction, felProductivity));
}

/**
 * Formula 2: Coal Dumper EV Count
 * Coal Dumper EV = CEILING(Coal Production / Coal Dumper Productivity)
 */
export function calculateCoalDumperEV(coalProduction: number, coalDumperProductivity: number): number {
  return ceiling(safeDivide(coalProduction, coalDumperProductivity));
}

/**
 * Formula 3: OB Dumper EV Count
 * OB Dumper EV = CEILING(OB Production / OB Dumper Productivity)
 */
export function calculateOBDumperEV(obProduction: number, obDumperProductivity: number): number {
  return ceiling(safeDivide(obProduction, obDumperProductivity));
}

/**
 * Formula 4: Total EV Fleet
 * Total EV Fleet = FEL EV + Coal Dumper EV + OB Dumper EV
 */
export function calculateTotalEVFleet(felEV: number, coalDumperEV: number, obDumperEV: number): number {
  return felEV + coalDumperEV + obDumperEV;
}

/**
 * Runs all four vehicle formulas against the input bundle and returns the
 * complete VehicleCalculationResult.
 * @param input Validated CalculationInputBundle
 */
export function runVehicleCalculations(input: CalculationInputBundle): VehicleCalculationResult {
  const felEV = calculateFELEV(input.coalProduction, input.felProductivity);
  const coalDumperEV = calculateCoalDumperEV(input.coalProduction, input.coalDumperProductivity);
  const obDumperEV = calculateOBDumperEV(input.obProduction, input.obDumperProductivity);
  const totalEVFleet = calculateTotalEVFleet(felEV, coalDumperEV, obDumperEV);

  return { felEV, coalDumperEV, obDumperEV, totalEVFleet };
}
