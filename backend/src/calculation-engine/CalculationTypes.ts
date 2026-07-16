/**
 * CalculationTypes.ts
 * Shared TypeScript interfaces and types for the Project PowerShift Calculation Engine.
 * All modules import from this file to maintain a single source of type truth.
 */

import { FinancialYearKey } from './FormulaConstants';

// ---------------------------------------------------------------------------
// INPUT TYPES (consumed from Strap Data)
// ---------------------------------------------------------------------------

/** Productivity row for a single equipment type, for a single financial year. */
export interface ProductivityInput {
  equipment: string;
  /** Productivity value for the financial year (units: MT/Year or Mcum/Year) */
  value: number;
}

/**
 * All required Strap Data inputs for a single mine and a single financial year.
 * This is the canonical "input bundle" passed to the Calculation Engine.
 */
export interface CalculationInputBundle {
  mineId: string;
  mineName: string;
  clusterId: string;
  financialYear: FinancialYearKey;

  /** Coal production target in MT */
  coalProduction: number;
  /** OB production target in Mcum */
  obProduction: number;
  /** CHP, Washery & Mining requirement in MVA */
  chpRequirement: number;
  /** Total available EV power in MVA */
  availableEVPower: number;

  /** FEL productivity for one unit (MT/Year) */
  felProductivity: number;
  /** Coal Dumper productivity for one unit (MT/Year) */
  coalDumperProductivity: number;
  /** OB Dumper productivity for one unit (Mcum/Year) */
  obDumperProductivity: number;

  /** TOD period breakdowns (percentages summing to 100%) */
  tod: TODBundle;
}

/** Time-of-Day tariff period data. */
export interface TODBundle {
  normalPercentage: number;   // 0–100
  offPeakPercentage: number;  // 0–100
  peakPercentage: number;     // 0–100
}

// ---------------------------------------------------------------------------
// INTERMEDIATE & OUTPUT TYPES
// ---------------------------------------------------------------------------

/** Results of the Vehicle (EV fleet count) calculations – Formulas 1–4 */
export interface VehicleCalculationResult {
  /** Formula 1: CEILING(Coal Production / FEL Productivity) */
  felEV: number;
  /** Formula 2: CEILING(Coal Production / Coal Dumper Productivity) */
  coalDumperEV: number;
  /** Formula 3: CEILING(OB Production / OB Dumper Productivity) */
  obDumperEV: number;
  /** Formula 4: FEL EV + Coal Dumper EV + OB Dumper EV */
  totalEVFleet: number;
}

/** Results of the Power calculations – Formulas 5–11 */
export interface PowerCalculationResult {
  /** Formula 5: CEILING(Total EV Fleet × 0.13 × 0.85) */
  chargersRequired: number;
  /** Formula 6: Chargers Required × 630 × 0.85 / 1000  (MW) */
  requiredEVPower: number;
  /** Formula 7: From Strap Data (MVA) */
  availableEVPower: number;
  /** Formula 8: CEILING(Available EV Power / (630 × 0.85 / 1000)) */
  chargersDeployable: number;
  /** Formula 9: CEILING(Chargers Deployable / (0.13 × 0.85)) */
  vehiclesDeployable: number;
  /** Formula 10: From Strap Data (MVA) */
  chpRequirement: number;
  /** Formula 11: Required EV Power + CHP Requirement (MW) */
  totalRequiredPower: number;
}

/** Results of the Consumption calculations – Formulas 12–23 */
export interface ConsumptionCalculationResult {
  /** Formula 12: Available EV Power × 6.8985 */
  evConsumption: number;
  /** Formula 13: CHP Requirement × 4.599 */
  mineInfrastructureConsumption: number;
  /** Formula 14: EV Consumption + Mine Infrastructure Consumption */
  totalConsumption: number;

  // Formulas 15–17: EV Consumption split by TOD
  normalEVConsumption: number;
  offPeakEVConsumption: number;
  peakEVConsumption: number;

  // Formulas 18–20: Mine Infrastructure Consumption split by TOD
  normalMineConsumption: number;
  offPeakMineConsumption: number;
  peakMineConsumption: number;

  // Formulas 21–23: Total Consumption split by TOD
  normalTotalConsumption: number;
  offPeakTotalConsumption: number;
  peakTotalConsumption: number;
}

/** Full compound result for a single mine + financial year calculation run. */
export interface CalculationResult {
  mineId: string;
  mineName: string;
  financialYear: FinancialYearKey;
  calculatedAt: string; // ISO string
  vehicle: VehicleCalculationResult;
  power: PowerCalculationResult;
  consumption: ConsumptionCalculationResult;
}

/** Result set for all financial years for a single mine. */
export interface MineCalculationResultSet {
  mineId: string;
  mineName: string;
  years: Partial<Record<FinancialYearKey, CalculationResult>>;
  lastCalculatedAt: string;
}

// ---------------------------------------------------------------------------
// API REQUEST / RESPONSE TYPES
// ---------------------------------------------------------------------------

/** Body for POST /api/calculation-engine/run */
export interface RunCalculationRequest {
  mineId?: string;
  financialYear?: FinancialYearKey;
}

/** Structured API error */
export interface CalculationError {
  code: 'VALIDATION_ERROR' | 'DATA_MISSING' | 'CALCULATION_ERROR' | 'NOT_FOUND';
  message: string;
  details?: string[];
}

/** Wrapper for API responses */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: CalculationError;
  meta?: {
    executionTimeMs: number;
    calculatedAt: string;
  };
}
