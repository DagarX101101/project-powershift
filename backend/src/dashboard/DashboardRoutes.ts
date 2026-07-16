import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getDashboardData } from './DashboardController';

const router = Router();

router.use(requireAuth);
router.get('/', getDashboardData);

export default router;
