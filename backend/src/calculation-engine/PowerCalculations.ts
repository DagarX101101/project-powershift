/**
 * PowerCalculations.ts
 * Formulas 5–11 of the Project PowerShift Calculation Engine.
 *
 * Computes charger requirements, power requirements, charger/vehicle
 * deployability, and total required power.
 *
 * All inputs must be pre-validated by CalculationValidation before calling
 * these functions.
 */

import { CalculationInputBundle, PowerCalculationResult } from './CalculationTypes';
import {
  CHARGER_RATING_KVA,
  CHARGER_UTILIZATION_FACTOR,
  CHARGING_PERCENTAGE,
} from './FormulaConstants';
import { ceiling, safeDivide } from './CalculationHelpers';

/** Power capacity of one charger in MW: 630 KVA × 0.85 / 1000 */
const CHARGER_POWER_MW = (CHARGER_RATING_KVA * CHARGER_UTILIZATION_FACTOR) / 1000;

/**
 * Formula 5: Chargers Required
 * CEILING(Total EV Fleet × CHARGING_PERCENTAGE × CHARGER_UTILIZATION_FACTOR)
 */
export function calculateChargersRequired(totalEVFleet: number): number {
  return ceiling(totalEVFleet * CHARGING_PERCENTAGE * CHARGER_UTILIZATION_FACTOR);
}

/**
 * Formula 6: Required EV Power (MW)
 * Chargers Required × 630 × 0.85 / 1000
 */
export function calculateRequiredEVPower(chargersRequired: number): number {
  return chargersRequired * CHARGER_POWER_MW;
}

/**
 * Formula 7: Available EV Power — comes directly from Strap Data (pass-through).
 * Included as a named formula function for traceability.
 */
export function getAvailableEVPower(availableEVPowerFromStrapData: number): number {
  return availableEVPowerFromStrapData;
}

/**
 * Formula 8: Chargers Deployable
 * CEILING(Available EV Power / (630 × 0.85 / 1000))
 */
export function calculateChargersDeployable(availableEVPower: number): number {
  return ceiling(safeDivide(availableEVPower, CHARGER_POWER_MW));
}

/**
 * Formula 9: Vehicles Deployable
 * CEILING(Chargers Deployable / (CHARGING_PERCENTAGE × CHARGER_UTILIZATION_FACTOR))
 */
export function calculateVehiclesDeployable(chargersDeployable: number): number {
  const denominator = CHARGING_PERCENTAGE * CHARGER_UTILIZATION_FACTOR;
  return ceiling(safeDivide(chargersDeployable, denominator));
}

/**
 * Formula 10: CHP Requirement — comes directly from Strap Data (pass-through).
 * Included as a named formula function for traceability.
 */
export function getCHPRequirement(chpRequirementFromStrapData: number): number {
  return chpRequirementFromStrapData;
}

/**
 * Formula 11: Total Required Power (MW)
 * Required EV Power + CHP Requirement
 */
export function calculateTotalRequiredPower(requiredEVPower: number, chpRequirement: number): number {
  return requiredEVPower + chpRequirement;
}

/**
 * Runs all seven power formulas against the input bundle and vehicle results,
 * then returns the complete PowerCalculationResult.
 * @param input Validated CalculationInputBundle
 * @param totalEVFleet Result of Formula 4
 */
export function runPowerCalculations(
  input: CalculationInputBundle,
  totalEVFleet: number
): PowerCalculationResult {
  const chargersRequired = calculateChargersRequired(totalEVFleet);
  const requiredEVPower = calculateRequiredEVPower(chargersRequired);
  const availableEVPower = getAvailableEVPower(input.availableEVPower);
  const chargersDeployable = calculateChargersDeployable(availableEVPower);
  const vehiclesDeployable = calculateVehiclesDeployable(chargersDeployable);
  const chpRequirement = getCHPRequirement(input.chpRequirement);
  const totalRequiredPower = calculateTotalRequiredPower(requiredEVPower, chpRequirement);

  return {
    chargersRequired,
    requiredEVPower,
    availableEVPower,
    chargersDeployable,
    vehiclesDeployable,
    chpRequirement,
    totalRequiredPower,
  };
}
