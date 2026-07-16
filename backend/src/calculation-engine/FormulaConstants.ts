/**
 * FormulaConstants.ts
 * Centralized engineering constants for the Project PowerShift Calculation Engine.
 * These values are defined by the engineering specification and must not be derived from
 * any database or runtime input. Change them only via engineering sign-off.
 */

/** Charger rating in KVA for each EV fast-charger unit. */
export const CHARGER_RATING_KVA = 630 as const;

/** Charger utilization factor (dimensionless). Represents demand efficiency. */
export const CHARGER_UTILIZATION_FACTOR = 0.85 as const;

/** Fraction of the total EV fleet simultaneously charging at any given time. */
export const CHARGING_PERCENTAGE = 0.13 as const;

/** EV energy consumption factor (MWh per MVA per year). */
export const EV_CONSUMPTION_FACTOR = 6.8985 as const;

/** Mine infrastructure energy consumption factor (MWh per MVA per year). */
export const MINE_INFRASTRUCTURE_FACTOR = 4.599 as const;

/**
 * Financial year column keys as they appear in the database.
 * Ordered chronologically for iteration.
 */
export const FINANCIAL_YEAR_KEYS = ['fy27', 'fy28', 'fy29', 'fy30', 'fy31'] as const;
export type FinancialYearKey = typeof FINANCIAL_YEAR_KEYS[number];

/** Human-readable labels mapped to DB column keys */
export const FINANCIAL_YEAR_LABELS: Record<FinancialYearKey, string> = {
  fy27: "FY'27",
  fy28: "FY'28",
  fy29: "FY'29",
  fy30: "FY'30",
  fy31: "FY'31",
};

/** Mine Planning Input particular names. Must match seed data exactly. */
export const PARTICULARS = {
  COAL_PRODUCTION: 'Coal Production',
  OB_PRODUCTION: 'OB Production',
  CHP_REQUIREMENT: 'CHP, Washery & Mining Requirement',
  AVAILABLE_POWER: 'Total Available Power for EV',
} as const;

/** Vehicle equipment name substrings used to identify row roles. Must match seed data. */
export const EQUIPMENT_IDENTIFIERS = {
  FEL: 'FEL EV',
  COAL_DUMPER: 'Coal Dumper EV',
  OB_DUMPER: 'OB Dumper EV',
} as const;

/** TOD period names as stored in the database. Must match seed data exactly. */
export const TOD_PERIODS = {
  NORMAL: 'Normal Hours',
  OFF_PEAK: 'Off Peak Hours',
  PEAK: 'Peak Hours',
} as const;

/** Tolerance used for floating-point percentage sum comparison. */
export const PERCENTAGE_TOLERANCE = 0.001 as const;

export interface MasterSheetRowConfig {
  id: string;
  type: 'section-header' | 'data' | 'total';
  label: string;
  unit?: string;
  path?: string; // Dot-separated path inside CalculationResult, e.g. "vehicle.felEV"
  indent?: boolean;
}

export const MASTER_SHEET_ROW_CONFIGS: MasterSheetRowConfig[] = [
  // ── SECTION 1: Vehicle Requirement ──────────────────────────────────────
  { id: 'sec-vehicle', type: 'section-header', label: 'Vehicle Requirement' },
  { id: 'felEV', type: 'data', label: 'FEL EV', unit: 'Nos.', path: 'vehicle.felEV' },
  { id: 'coalDumperEV', type: 'data', label: 'Coal Dumper EV', unit: 'Nos.', path: 'vehicle.coalDumperEV' },
  { id: 'obDumperEV', type: 'data', label: 'OB Dumper EV', unit: 'Nos.', path: 'vehicle.obDumperEV' },
  { id: 'totalEVFleet', type: 'total', label: 'Total EV Fleet', unit: 'Nos.', path: 'vehicle.totalEVFleet' },

  // ── SECTION 2: Power Requirement ────────────────────────────────────────
  { id: 'sec-power', type: 'section-header', label: 'Power Requirement' },
  { id: 'chargersRequired', type: 'data', label: 'Chargers Required', unit: 'Nos.', path: 'power.chargersRequired' },
  { id: 'requiredEVPower', type: 'data', label: 'Required EV Power', unit: 'MW', path: 'power.requiredEVPower' },
  { id: 'availableEVPower', type: 'data', label: 'Available EV Power', unit: 'MVA', path: 'power.availableEVPower' },
  { id: 'chargersDeployable', type: 'data', label: 'Chargers Deployable', unit: 'Nos.', path: 'power.chargersDeployable' },
  { id: 'vehiclesDeployable', type: 'data', label: 'Vehicles Deployable', unit: 'Nos.', path: 'power.vehiclesDeployable' },
  { id: 'chpRequirement', type: 'data', label: 'CHP, Washery & Mining Requirement', unit: 'MVA', path: 'power.chpRequirement' },
  { id: 'totalRequiredPower', type: 'total', label: 'Total Required Power', unit: 'MW', path: 'power.totalRequiredPower' },

  // ── SECTION 3: Consumption ───────────────────────────────────────────────
  { id: 'sec-consumption', type: 'section-header', label: 'Energy Consumption' },
  { id: 'evConsumption', type: 'data', label: 'EV Consumption', unit: 'MWh', path: 'consumption.evConsumption' },
  { id: 'mineInfraConsumption', type: 'data', label: 'Mine Infrastructure Consumption', unit: 'MWh', path: 'consumption.mineInfrastructureConsumption' },
  { id: 'totalConsumption', type: 'total', label: 'Total Consumption', unit: 'MWh', path: 'consumption.totalConsumption' },

  // ── SECTION 4: TOD Distribution — EV ────────────────────────────────────
  { id: 'sec-tod-ev', type: 'section-header', label: 'TOD Distribution — EV Consumption' },
  { id: 'normalEVConsumption', type: 'data', label: 'Normal Hours — EV', unit: 'MWh', path: 'consumption.normalEVConsumption', indent: true },
  { id: 'offPeakEVConsumption', type: 'data', label: 'Off Peak Hours — EV', unit: 'MWh', path: 'consumption.offPeakEVConsumption', indent: true },
  { id: 'peakEVConsumption', type: 'data', label: 'Peak Hours — EV', unit: 'MWh', path: 'consumption.peakEVConsumption', indent: true },

  // ── SECTION 5: TOD Distribution — Mine ──────────────────────────────────
  { id: 'sec-tod-mine', type: 'section-header', label: 'TOD Distribution — Mine Infrastructure Consumption' },
  { id: 'normalMineConsumption', type: 'data', label: 'Normal Hours — Mine', unit: 'MWh', path: 'consumption.normalMineConsumption', indent: true },
  { id: 'offPeakMineConsumption', type: 'data', label: 'Off Peak Hours — Mine', unit: 'MWh', path: 'consumption.offPeakMineConsumption', indent: true },
  { id: 'peakMineConsumption', type: 'data', label: 'Peak Hours — Mine', unit: 'MWh', path: 'consumption.peakMineConsumption', indent: true },

  // ── SECTION 6: TOD Distribution — Total ─────────────────────────────────
  { id: 'sec-tod-total', type: 'section-header', label: 'TOD Distribution — Total Consumption' },
  { id: 'normalTotalConsumption', type: 'data', label: 'Normal Hours — Total', unit: 'MWh', path: 'consumption.normalTotalConsumption', indent: true },
  { id: 'offPeakTotalConsumption', type: 'data', label: 'Off Peak Hours — Total', unit: 'MWh', path: 'consumption.offPeakTotalConsumption', indent: true },
  { id: 'peakTotalConsumption', type: 'total', label: 'Peak Hours — Total', unit: 'MWh', path: 'consumption.peakTotalConsumption', indent: true },
];

