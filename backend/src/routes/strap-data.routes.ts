import { Router } from 'express';
import { strapDataController } from '../controllers/strap-data.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  updateVehicleProductivitySchema,
  updateMinePlanningInputsSchema,
  updateElectricalTodSchema,
} from '../validators/strap-data.validators';

const router = Router();

// Apply auth to all endpoints
router.use(requireAuth);

// Common endpoints
router.get('/clusters', strapDataController.getClustersAndMines);
router.get('/metadata', strapDataController.getMetadata);

// 1. Vehicle Productivity
router.get('/vehicle-productivity', strapDataController.getVehicleProductivity);
router.patch(
  '/vehicle-productivity',
  requireRole(['ADMIN']),
  validate(updateVehicleProductivitySchema),
  strapDataController.updateVehicleProductivity
);

// 2. Mine Planning Inputs
router.get('/mine-planning-inputs', strapDataController.getMinePlanningInputs);
router.patch(
  '/mine-planning-inputs/:mineId',
  requireRole(['ADMIN', 'ENGINEER']),
  validate(updateMinePlanningInputsSchema),
  strapDataController.updateMinePlanningInputs
);

// 3. Electrical TOD
router.get('/electrical-tod', strapDataController.getElectricalTod);
router.patch(
  '/electrical-tod/:clusterId',
  requireRole(['ADMIN']),
  validate(updateElectricalTodSchema),
  strapDataController.updateElectricalTod
);

export default router;
