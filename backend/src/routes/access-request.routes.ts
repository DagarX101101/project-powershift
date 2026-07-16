import { Router } from 'express';
import { accessRequestController } from '../controllers/access-request.controller';

const router = Router();

// POST /api/access-request -> Submit a new access request
router.post('/', accessRequestController.createAccessRequest);

// GET /api/access-request/status -> Check status of a request by email
router.get('/status', accessRequestController.getAccessRequestStatus);

export default router;
