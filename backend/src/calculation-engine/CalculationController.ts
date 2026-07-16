/**
 * CalculationController.ts
 * Express request handlers for the Calculation Engine API.
 *
 * Routes:
 *   POST /api/calculation-engine/run        — Trigger calculation for one or all mines
 *   GET  /api/calculation-engine/:mineId    — Get results for all FYs of a mine
 *   GET  /api/calculation-engine/:mineId/:financialYear — Get result for specific FY
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import logger from '../utils/logger';
import { CalculationEngineError } from './CalculationEngine';
import {
  calculateAll,
  calculateForMine,
  calculateForMineAndYear,
  getPersistedResult,
  getPersistedResultsForMine,
} from './CalculationService';
import { FINANCIAL_YEAR_KEYS, FinancialYearKey, MASTER_SHEET_ROW_CONFIGS } from './FormulaConstants';
import { ApiResponse } from './CalculationTypes';

/**
 * GET /api/calculation-engine/layout
 * Returns the centralized Master Sheet row definitions.
 */
export const getLayoutConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    data: MASTER_SHEET_ROW_CONFIGS,
  });
};


function isValidFinancialYear(fy: string): fy is FinancialYearKey {
  return (FINANCIAL_YEAR_KEYS as readonly string[]).includes(fy.toLowerCase());
}

function buildErrorResponse(
  code: 'VALIDATION_ERROR' | 'DATA_MISSING' | 'CALCULATION_ERROR' | 'NOT_FOUND',
  message: string,
  details?: string[]
): ApiResponse<never> {
  return { success: false, error: { code, message, details } };
}

/**
 * POST /api/calculation-engine/run
 * Body (optional): { mineId?: string, financialYear?: string }
 *
 * - No body → recalculate everything
 * - mineId only → recalculate all FYs for that mine
 * - mineId + financialYear → recalculate that specific cell
 */
export const runCalculation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const start = Date.now();
  const { mineId, financialYear } = req.body ?? {};

  try {
    // Case 1: Specific mine + specific FY
    if (mineId && financialYear) {
      const fy = (financialYear as string).toLowerCase();
      if (!isValidFinancialYear(fy)) {
        res.status(400).json(buildErrorResponse(
          'VALIDATION_ERROR',
          `Invalid financialYear "${financialYear}". Valid values: ${FINANCIAL_YEAR_KEYS.join(', ')}.`
        ));
        return;
      }

      const result = await calculateForMineAndYear(mineId, fy);
      res.status(200).json({
        success: true,
        data: result,
        meta: { executionTimeMs: Date.now() - start, calculatedAt: result.calculatedAt },
      } as ApiResponse<typeof result>);
      return;
    }

    // Case 2: Specific mine, all FYs
    if (mineId) {
      const resultSet = await calculateForMine(mineId);
      res.status(200).json({
        success: true,
        data: resultSet,
        meta: { executionTimeMs: Date.now() - start, calculatedAt: resultSet.lastCalculatedAt },
      } as ApiResponse<typeof resultSet>);
      return;
    }

    // Case 3: All mines + all FYs
    const allResults = await calculateAll();
    res.status(200).json({
      success: true,
      data: allResults,
      meta: { executionTimeMs: Date.now() - start, calculatedAt: new Date().toISOString() },
    } as ApiResponse<typeof allResults>);
  } catch (err: any) {
    logger.error(`[CalculationController.runCalculation] Error: ${err.message}`);

    if (err instanceof CalculationEngineError) {
      res.status(422).json(buildErrorResponse('VALIDATION_ERROR', err.message, err.validationErrors));
      return;
    }

    if (err.message?.includes('not found')) {
      res.status(404).json(buildErrorResponse('NOT_FOUND', err.message));
      return;
    }

    if (err.message?.includes('not found') || err.message?.includes('Required Strap Data')) {
      res.status(404).json(buildErrorResponse('DATA_MISSING', err.message));
      return;
    }

    res.status(500).json(buildErrorResponse('CALCULATION_ERROR', 'Calculation failed due to an internal error.'));
  }
};

/**
 * GET /api/calculation-engine/:mineId
 * Returns latest persisted results for all financial years of a mine.
 * Does NOT trigger a recalculation. Use POST /run to refresh.
 */
export const getResultsForMine = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const start = Date.now();
  const { mineId } = req.params;

  try {
    const resultSet = await getPersistedResultsForMine(mineId);

    if (!resultSet) {
      res.status(404).json(buildErrorResponse(
        'NOT_FOUND',
        `No calculation results found for mine ${mineId}. Run a calculation first using POST /api/calculation-engine/run.`
      ));
      return;
    }

    res.status(200).json({
      success: true,
      data: resultSet,
      meta: { executionTimeMs: Date.now() - start, calculatedAt: resultSet.lastCalculatedAt },
    } as ApiResponse<typeof resultSet>);
  } catch (err: any) {
    logger.error(`[CalculationController.getResultsForMine] Error: ${err.message}`);
    res.status(500).json(buildErrorResponse('CALCULATION_ERROR', 'Failed to retrieve calculation results.'));
  }
};

/**
 * GET /api/calculation-engine/:mineId/:financialYear
 * Returns latest persisted result for a specific mine + financial year.
 * Does NOT trigger a recalculation.
 */
export const getResultForMineAndYear = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const start = Date.now();
  const { mineId, financialYear } = req.params;
  const fy = financialYear.toLowerCase();

  if (!isValidFinancialYear(fy)) {
    res.status(400).json(buildErrorResponse(
      'VALIDATION_ERROR',
      `Invalid financialYear "${financialYear}". Valid values: ${FINANCIAL_YEAR_KEYS.join(', ')}.`
    ));
    return;
  }

  try {
    const result = await getPersistedResult(mineId, fy);

    if (!result) {
      res.status(404).json(buildErrorResponse(
        'NOT_FOUND',
        `No calculation result found for mine ${mineId} and financial year ${fy}. Run a calculation first.`
      ));
      return;
    }

    res.status(200).json({
      success: true,
      data: result,
      meta: { executionTimeMs: Date.now() - start, calculatedAt: result.calculatedAt },
    } as ApiResponse<typeof result>);
  } catch (err: any) {
    logger.error(`[CalculationController.getResultForMineAndYear] Error: ${err.message}`);
    res.status(500).json(buildErrorResponse('CALCULATION_ERROR', 'Failed to retrieve calculation result.'));
  }
};
