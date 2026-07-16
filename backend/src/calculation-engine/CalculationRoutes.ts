/**
 * CalculationRoutes.ts
 * Express router for the Calculation Engine API.
 *
 * All endpoints require authentication (requireAuth).
 * The POST /run endpoint is further restricted to ADMIN and ENGINEER roles.
 * GET endpoints are available to all authenticated roles (including VIEWER).
 */

import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import {
  runCalculation,
  getResultsForMine,
  getResultForMineAndYear,
  getLayoutConfig,
} from './CalculationController';

const router = Router();

// Apply auth to all Calculation Engine routes
router.use(requireAuth);

/**
 * GET /api/calculation-engine/layout
 * Returns the Master Sheet table layout/row definitions.
 * Available to all authenticated roles.
 */
router.get('/layout', getLayoutConfig);


/**
 * POST /api/calculation-engine/run
 * Triggers a calculation run. Body is optional.
 * Restricted to ADMIN and ENGINEER — viewers cannot trigger recalculations.
 */
router.post('/run', requireRole(['ADMIN', 'ENGINEER']), runCalculation);

/**
 * GET /api/calculation-engine/:mineId
 * Returns persisted results for all financial years for a mine.
 * Available to all authenticated roles.
 */
router.get('/:mineId', getResultsForMine);

/**
 * GET /api/calculation-engine/:mineId/all
 * Explicit alias to return all years.
 */
router.get('/:mineId/all', getResultsForMine);

/**
 * GET /api/calculation-engine/:mineId/:financialYear
 * Returns persisted result for a specific mine + financial year.
 * Available to all authenticated roles.
 */
router.get('/:mineId/:financialYear', getResultForMineAndYear);


export default router;
