import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/admin.middleware';
import { accessRequestsController } from '../controllers/access-requests.controller';

const router = Router();

// Secure all access requests endpoints with both Auth and Admin middlewares
router.use(requireAuth, requireAdmin);

router.get('/', accessRequestsController.getAccessRequests);
router.get('/history', accessRequestsController.getAccessRequestHistory);
router.get('/:id', accessRequestsController.getAccessRequestById);
router.patch('/:id/approve', accessRequestsController.approveRequest);
router.patch('/:id/reject', accessRequestsController.rejectRequest);

export default router;
