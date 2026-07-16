import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { loginSchema, changePasswordSchema } from '../validators/auth.validators';

const router = Router();

// Public routes
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

// Protected routes
router.get('/me', requireAuth, authController.getMe);
router.patch('/change-password', requireAuth, validate(changePasswordSchema), authController.changePassword);

export default router;
