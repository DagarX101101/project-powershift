import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/admin.middleware';
import { usersController } from '../controllers/users.controller';

const router = Router();

// Secure all users endpoints with Auth and Admin middlewares
router.use(requireAuth, requireAdmin);

router.get('/', usersController.getAllUsers.bind(usersController));
router.get('/:id', usersController.getUserById.bind(usersController));
router.patch('/:id', usersController.updateUserDetails.bind(usersController));
router.patch('/:id/status', usersController.updateUserStatus.bind(usersController));
router.patch('/:id/role', usersController.updateUserRole.bind(usersController));
router.patch('/:id/mines', usersController.updateUserMines.bind(usersController));
router.patch('/:id/reset-password', usersController.resetPassword.bind(usersController));

export default router;
