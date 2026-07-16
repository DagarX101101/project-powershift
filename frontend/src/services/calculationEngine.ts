/**
 * calculationEngine.ts
 * Frontend API service for the Calculation Engine.
 * ONLY reads data — never performs calculations.
 * All calculation logic lives exclusively in the backend.
 */

import api from './api';

// -----------------------------------------------------------------------
// Types mirroring backend CalculationTypes.ts (presentation only)
// -----------------------------------------------------------------------

export type FinancialYearKey = 'fy27' | 'fy28' | 'fy29' | 'fy30' | 'fy31';

export const FINANCIAL_YEARS: FinancialYearKey[] = ['fy27', 'fy28', 'fy29', 'fy30', 'fy31'];

export const FINANCIAL_YEAR_LABELS: Record<FinancialYearKey, string> = {
  fy27: "FY'27",
  fy28: "FY'28",
  fy29: "FY'29",
  fy30: "FY'30",
  fy31: "FY'31",
};

/** Vehicle fleet calculation results (Formulas 1–4) */
export interface VehicleResult {
  felEV: number;
  coalDumperEV: number;
  obDumperEV: number;
  totalEVFleet: number;
}

/** Power and charger calculation results (Formulas 5–11) */
export interface PowerResult {
  chargersRequired: number;
  requiredEVPower: number;
  availableEVPower: number;
  chargersDeployable: number;
  vehiclesDeployable: number;
  chpRequirement: number;
  totalRequiredPower: number;
}

/** Energy consumption results (Formulas 12–23) */
export interface ConsumptionResult {
  evConsumption: number;
  mineInfrastructureConsumption: number;
  totalConsumption: number;
  normalEVConsumption: number;
  offPeakEVConsumption: number;
  peakEVConsumption: number;
  normalMineConsumption: number;
  offPeakMineConsumption: number;
  peakMineConsumption: number;
  normalTotalConsumption: number;
  offPeakTotalConsumption: number;
  peakTotalConsumption: number;
}

/** Full result for one mine × one financial year */
export interface CalculationResult {
  mineId: string;
  mineName: string;
  financialYear: FinancialYearKey;
  calculatedAt: string;
  vehicle: VehicleResult;
  power: PowerResult;
  consumption: ConsumptionResult;
}

/** API wrapper shape */
export interface CalculationApiResponse {
  success: boolean;
  data: CalculationResult;
  meta?: { executionTimeMs: number; calculatedAt: string };
  error?: { code: string; message: string; details?: string[] };
}

// -----------------------------------------------------------------------
// Cluster / Mine types (reused from strap-data response)
// -----------------------------------------------------------------------

export interface Mine {
  id: string;
  name: string;
  clusterId: string;
}

export interface Cluster {
  id: string;
  name: string;
  mines: Mine[];
}

export interface MasterSheetRowConfig {
  id: string;
  type: 'section-header' | 'data' | 'total';
  label: string;
  unit?: string;
  path?: string;
  indent?: boolean;
}

export interface LayoutConfigApiResponse {
  success: boolean;
  data: MasterSheetRowConfig[];
}

export interface MineCalculationResultSet {
  mineId: string;
  mineName: string;
  years: Record<FinancialYearKey, CalculationResult>;
  lastCalculatedAt: string;
}

export interface MineCalculationAllApiResponse {
  success: boolean;
  data: MineCalculationResultSet;
  meta?: { executionTimeMs: number; calculatedAt: string };
  error?: { code: string; message: string; details?: string[] };
}

// -----------------------------------------------------------------------
// API call — GET /api/calculation-engine/:mineId/:financialYear
// -----------------------------------------------------------------------

/**
 * Fetches the pre-computed calculation result for a specific mine and
 * financial year. Does NOT trigger a recalculation.
 * Throws an AxiosError if the request fails (handled by callers).
 */
export async function fetchCalculationResult(
  mineId: string,
  financialYear: FinancialYearKey
): Promise<CalculationResult> {
  const response = await api.get<CalculationApiResponse>(
    `/calculation-engine/${mineId}/${financialYear}`
  );
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || 'Calculation data not available');
  }
  return response.data.data;
}

/**
 * Fetches the pre-computed calculation results for all five financial years of a mine.
 * Does NOT trigger a recalculation.
 */
export async function fetchCalculationResultAll(
  mineId: string
): Promise<MineCalculationResultSet> {
  const response = await api.get<MineCalculationAllApiResponse>(
    `/calculation-engine/${mineId}/all`
  );
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || 'Calculation data not available');
  }
  return response.data.data;
}

/**
 * Fetches the centralized Master Sheet layout/row definitions from the backend.
 */
export async function fetchLayoutConfig(): Promise<MasterSheetRowConfig[]> {
  const response = await api.get<LayoutConfigApiResponse>(
    '/calculation-engine/layout'
  );
  if (!response.data.success || !response.data.data) {
    throw new Error('Failed to retrieve layout definitions');
  }
  return response.data.data;
}

/**
 * Fetches all clusters and their mines from the strap-data endpoint.
 * Used to populate the Mine Selector dropdown.
 */
export async function fetchClustersAndMines(): Promise<Cluster[]> {
  const response = await api.get<Cluster[]>('/strap-data/clusters');
  return response.data;
}

