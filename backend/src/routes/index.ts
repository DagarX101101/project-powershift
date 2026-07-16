import { Router } from 'express';
import authRoutes from './auth.routes';
import usersRoutes from './users.routes';
import strapDataRoutes from './strap-data.routes';
import calculationEngineRoutes from '../calculation-engine/CalculationRoutes';
import dashboardRoutes from '../dashboard/DashboardRoutes';
import accessRequestRoutes from './access-request.routes';
import accessRequestsRoutes from './access-requests.routes';
import profileRoutes from './profile.routes';
import settingsRoutes from './settings.routes';
import reportsRoutes from '../reports/reports.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/profile', profileRoutes);
router.use('/settings', settingsRoutes);
router.use('/strap-data', strapDataRoutes);
router.use('/calculation-engine', calculationEngineRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/access-request', accessRequestRoutes);
router.use('/access-requests', accessRequestsRoutes);
router.use('/reports', reportsRoutes);

export default router;
