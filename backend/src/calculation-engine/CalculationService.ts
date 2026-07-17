/**
 * CalculationService.ts
 * Database orchestration layer for the Calculation Engine.
 *
 * Responsibilities:
 *  1. Fetch Strap Data from the database for a given mine + financial year.
 *  2. Assemble a CalculationInputBundle from those records.
 *  3. Check the in-memory result cache to avoid redundant computation.
 *  4. Invoke the CalculationEngine to run formulas.
 *  5. Store computed results in the CalculationResult DB table.
 *  6. Return persisted results for API consumption.
 *
 * The cache strategy uses a composite key of mineId + financialYear and
 * invalidates entries when the Strap Data updatedAt timestamp is newer than
 * the cached calculatedAt timestamp. This gives the "calculate only what changed"
 * behaviour required by the specification without an additional hash column.
 */

import { prisma } from '../config/database';
import logger from '../utils/logger';
import { runCalculation, CalculationEngineError } from './CalculationEngine';
import { runVehicleCalculations } from './VehicleCalculations';
import { runPowerCalculations } from './PowerCalculations';
import { runConsumptionCalculations } from './ConsumptionCalculations';
import { validateInputBundle } from './CalculationValidation';
import { dashboardService } from '../dashboard/DashboardService';
import {
  CalculationInputBundle,
  CalculationResult,
  MineCalculationResultSet,
} from './CalculationTypes';
import {
  FINANCIAL_YEAR_KEYS,
  FinancialYearKey,
  PARTICULARS,
  EQUIPMENT_IDENTIFIERS,
  TOD_PERIODS,
} from './FormulaConstants';


// ---------------------------------------------------------------------------
// Strap Data loader
// ---------------------------------------------------------------------------

/**
 * Loads all Strap Data required to calculate a single mine × financial year
 * from the database. Returns null if any required data is completely missing.
 */
async function loadInputBundle(
  mineId: string,
  fy: FinancialYearKey
): Promise<CalculationInputBundle | null> {
  // 1. Load mine to get cluster
  const mine = await prisma.mine.findUnique({
    where: { id: mineId },
    include: { cluster: true },
  });
  if (!mine) return null;

  // 2. Load mine planning inputs in a single query
  const planningInputs = await prisma.minePlanningInput.findMany({
    where: { mineId },
  });
  if (planningInputs.length === 0) return null;

  const getInput = (particular: string): number => {
    const row = planningInputs.find(r => r.particular === particular);
    return row ? (row[fy as keyof typeof row] as number) : 0;
  };

  // 3. Load vehicle productivities in a single query
  const vps = await prisma.vehicleProductivity.findMany();
  if (vps.length === 0) return null;

  const getVP = (identifierSubstring: string): number => {
    const row = vps.find(v => v.equipment.includes(identifierSubstring));
    return row ? (row[fy as keyof typeof row] as number) : 0;
  };

  // 4. Load electrical TOD for this mine's cluster in a single query
  const tods = await prisma.electricalTOD.findMany({
    where: { clusterId: mine.clusterId },
  });
  if (tods.length === 0) return null;

  const getTODPct = (period: string): number => {
    const row = tods.find(t => t.period === period);
    return row ? row.consumptionPercentage : 0;
  };

  return {
    mineId,
    mineName: mine.name,
    clusterId: mine.clusterId,
    financialYear: fy,
    coalProduction: getInput(PARTICULARS.COAL_PRODUCTION),
    obProduction: getInput(PARTICULARS.OB_PRODUCTION),
    chpRequirement: getInput(PARTICULARS.CHP_REQUIREMENT),
    availableEVPower: getInput(PARTICULARS.AVAILABLE_POWER),
    felProductivity: getVP(EQUIPMENT_IDENTIFIERS.FEL),
    coalDumperProductivity: getVP(EQUIPMENT_IDENTIFIERS.COAL_DUMPER),
    obDumperProductivity: getVP(EQUIPMENT_IDENTIFIERS.OB_DUMPER),
    tod: {
      normalPercentage: getTODPct(TOD_PERIODS.NORMAL),
      offPeakPercentage: getTODPct(TOD_PERIODS.OFF_PEAK),
      peakPercentage: getTODPct(TOD_PERIODS.PEAK),
    },
  };
}

/**
 * Returns the maximum updatedAt timestamp across all Strap Data tables for a
 * given mine. Used to determine if the cache entry is stale.
 */
async function getStrapDataMaxUpdatedAt(mineId: string, clusterId: string): Promise<Date> {
  const [vpMax, mpiMax, etMax] = await Promise.all([
    prisma.vehicleProductivity.aggregate({ _max: { updatedAt: true } }),
    prisma.minePlanningInput.aggregate({
      _max: { updatedAt: true },
      where: { mineId },
    }),
    prisma.electricalTOD.aggregate({
      _max: { updatedAt: true },
      where: { clusterId },
    }),
  ]);

  const dates = [
    vpMax._max.updatedAt,
    mpiMax._max.updatedAt,
    etMax._max.updatedAt,
  ].filter((d): d is Date => d !== null);

  if (dates.length === 0) return new Date(0);
  return new Date(Math.max(...dates.map(d => d.getTime())));
}

// ---------------------------------------------------------------------------
// Public service methods
// ---------------------------------------------------------------------------

/**
 * Calculates (or returns cached) results for a single mine and financial year.
 * If Strap Data has been updated since the last calculation, the cache entry
 * is invalidated and a fresh computation is performed.
 */
export async function calculateForMineAndYear(
  mineId: string,
  fy: FinancialYearKey
): Promise<CalculationResult> {
  // 1. Check if a valid database record cache exists
  const record = await prisma.calculationResult.findUnique({
    where: { mineId_financialYear: { mineId, financialYear: fy } },
  });

  if (record) {
    const mine = await prisma.mine.findUnique({ where: { id: mineId } });
    if (mine) {
      const maxStrapUpdatedAt = await getStrapDataMaxUpdatedAt(mineId, mine.clusterId);
      const calculatedAt = new Date(record.calculatedAt);
      if (maxStrapUpdatedAt <= calculatedAt) {
        logger.info(`[CalculationService] Database cache HIT for ${mineId}:${fy}`);
        return record.results as unknown as CalculationResult;
      }
      logger.info(`[CalculationService] Database cache STALE for ${mineId}:${fy} — recalculating`);
    }
  }

  // Calculate all years progressively to ensure monotonic vehicle requirements
  const resultSet = await calculateForMine(mineId);
  const result = resultSet.years[fy];
  if (!result) {
    throw new Error(`Failed to calculate progressive results for mineId=${mineId}, financialYear=${fy}`);
  }
  return result;
}

/**
 * Calculates all financial years for a single mine.
 * Computes raw vehicle metrics, applies monotonic non-decreasing bounds,
 * and updates dependent power and consumption outputs.
 */
export async function calculateForMine(mineId: string): Promise<MineCalculationResultSet> {
  const mine = await prisma.mine.findUnique({ where: { id: mineId } });
  if (!mine) {
    throw new Error(`Mine not found: ${mineId}`);
  }

  // 1. Load input bundles for all years
  const bundles: Record<FinancialYearKey, CalculationInputBundle> = {} as any;
  for (const fy of FINANCIAL_YEAR_KEYS) {
    const bundle = await loadInputBundle(mineId, fy);
    if (!bundle) {
      throw new Error(`Required Strap Data not found for mineId=${mineId}, financialYear=${fy}`);
    }
    // Validate bundle inputs
    const validation = validateInputBundle(bundle);
    if (!validation.valid) {
      throw new CalculationEngineError(
        `Calculation rejected for ${fy}: ${validation.errors.length} validation error(s).`,
        validation.errors
      );
    }
    bundles[fy] = bundle;
  }

  // 2. Calculate raw vehicle requirements first
  const rawVehicles: Record<FinancialYearKey, { felEV: number; coalDumperEV: number; obDumperEV: number; }> = {} as any;
  for (const fy of FINANCIAL_YEAR_KEYS) {
    rawVehicles[fy] = runVehicleCalculations(bundles[fy]);
  }

  // 3. Apply progressive running maximum constraint across financial years
  const progressiveVehicles: Record<FinancialYearKey, { felEV: number; coalDumperEV: number; obDumperEV: number; totalEVFleet: number; }> = {} as any;
  let lastFel = 0;
  let lastCoal = 0;
  let lastOb = 0;

  for (const fy of FINANCIAL_YEAR_KEYS) {
    const currentRaw = rawVehicles[fy];
    const fel = Math.max(lastFel, currentRaw.felEV);
    const coal = Math.max(lastCoal, currentRaw.coalDumperEV);
    const ob = Math.max(lastOb, currentRaw.obDumperEV);

    progressiveVehicles[fy] = {
      felEV: fel,
      coalDumperEV: coal,
      obDumperEV: ob,
      totalEVFleet: fel + coal + ob
    };

    lastFel = fel;
    lastCoal = coal;
    lastOb = ob;
  }

  const results: Record<FinancialYearKey, CalculationResult> = {} as any;
  const calculatedAt = new Date().toISOString();

  // 4. Run the rest of the formulas for each year using progressive counts
  for (const fy of FINANCIAL_YEAR_KEYS) {
    const bundle = bundles[fy];
    const vehicle = progressiveVehicles[fy];
    const power = runPowerCalculations(bundle, vehicle.totalEVFleet);
    const consumption = runConsumptionCalculations(bundle, power.availableEVPower, power.chpRequirement);

    const result: CalculationResult = {
      mineId: bundle.mineId,
      mineName: bundle.mineName,
      financialYear: fy,
      calculatedAt,
      vehicle,
      power,
      consumption
    };

    results[fy] = result;

    // Persist result in DB
    await prisma.calculationResult.upsert({
      where: { mineId_financialYear: { mineId, financialYear: fy } },
      update: {
        results: result as any,
        calculatedAt: new Date(calculatedAt),
      },
      create: {
        mineId,
        financialYear: fy,
        results: result as any,
        calculatedAt: new Date(calculatedAt),
      },
    });


  }

  // Invalidate dashboard summary cache
  dashboardService.invalidateCache();

  return {
    mineId,
    mineName: mine.name,
    years: results,
    lastCalculatedAt: calculatedAt,
  };
}

/**
 * Runs calculations for ALL mines and ALL financial years.
 * Used by the POST /run endpoint without a body.
 */
export async function calculateAll(): Promise<MineCalculationResultSet[]> {
  const mines = await prisma.mine.findMany({ orderBy: { name: 'asc' } });

  const results = await Promise.allSettled(
    mines.map(mine => calculateForMine(mine.id))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<MineCalculationResultSet> => r.status === 'fulfilled')
    .map(r => r.value);
}

/**
 * Retrieves the most recent persisted result from the database for a single
 * mine + financial year without triggering a recalculation.
 * Returns null if no result has ever been persisted.
 */
export async function getPersistedResult(
  mineId: string,
  fy: FinancialYearKey
): Promise<CalculationResult | null> {
  const record = await prisma.calculationResult.findUnique({
    where: { mineId_financialYear: { mineId, financialYear: fy } },
  });

  if (!record) return null;
  return record.results as unknown as CalculationResult;
}

/**
 * Retrieves persisted results for ALL financial years for a mine.
 * Returns only years that have previously been calculated.
 */
export async function getPersistedResultsForMine(
  mineId: string
): Promise<MineCalculationResultSet | null> {
  const mine = await prisma.mine.findUnique({ where: { id: mineId } });
  if (!mine) return null;

  const records = await prisma.calculationResult.findMany({
    where: { mineId },
    orderBy: { financialYear: 'asc' },
  });

  const years: Partial<Record<FinancialYearKey, CalculationResult>> = {};
  for (const rec of records) {
    const fy = rec.financialYear as FinancialYearKey;
    years[fy] = rec.results as unknown as CalculationResult;
  }

  const timestamps = records.map(r => r.calculatedAt);
  const lastCalculatedAt = timestamps.length > 0
    ? new Date(Math.max(...timestamps.map(t => t.getTime()))).toISOString()
    : new Date().toISOString();

  return { mineId, mineName: mine.name, years, lastCalculatedAt };
}
