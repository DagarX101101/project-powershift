/**
 * CalculationEngine.ts
 * Orchestrator for the Project PowerShift Calculation Engine.
 *
 * This is the single entry-point for running a full calculation.
 * It composes the three sub-modules (Vehicle, Power, Consumption)
 * in the correct dependency order and returns a unified result.
 *
 * This module has NO database awareness — it is purely computational.
 * Database interactions are the responsibility of CalculationService.
 */

import { CalculationInputBundle, CalculationResult } from './CalculationTypes';
import { validateInputBundle } from './CalculationValidation';
import { runVehicleCalculations } from './VehicleCalculations';
import { runPowerCalculations } from './PowerCalculations';
import { runConsumptionCalculations } from './ConsumptionCalculations';

export class CalculationEngineError extends Error {
  public readonly validationErrors: string[];

  constructor(message: string, validationErrors: string[] = []) {
    super(message);
    this.name = 'CalculationEngineError';
    this.validationErrors = validationErrors;
  }
}

/**
 * Runs the complete 23-formula calculation pipeline for a single mine
 * and financial year.
 *
 * @param input A fully populated CalculationInputBundle
 * @returns CalculationResult containing all computed values
 * @throws CalculationEngineError if validation fails
 */
export function runCalculation(input: CalculationInputBundle): CalculationResult {
  // 1. Validate all inputs before touching any formula
  const validation = validateInputBundle(input);
  if (!validation.valid) {
    throw new CalculationEngineError(
      `Calculation rejected: ${validation.errors.length} validation error(s).`,
      validation.errors
    );
  }

  // 2. Formulas 1–4: Vehicle fleet counts
  const vehicle = runVehicleCalculations(input);

  // 3. Formulas 5–11: Power and charger calculations
  //    Power calculations depend on totalEVFleet from vehicle step
  const power = runPowerCalculations(input, vehicle.totalEVFleet);

  // 4. Formulas 12–23: Consumption calculations
  //    Consumption uses availableEVPower and chpRequirement from power step
  const consumption = runConsumptionCalculations(
    input,
    power.availableEVPower,
    power.chpRequirement
  );

  return {
    mineId: input.mineId,
    mineName: input.mineName,
    financialYear: input.financialYear,
    calculatedAt: new Date().toISOString(),
    vehicle,
    power,
    consumption,
  };
}
