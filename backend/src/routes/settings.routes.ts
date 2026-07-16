import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { settingsController } from '../controllers/settings.controller';

const router = Router();

router.use(requireAuth);

router.get('/', settingsController.getSettings.bind(settingsController));
router.patch('/theme', settingsController.updateTheme.bind(settingsController));

export default router;
