import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { prisma } from '../config/database';

export class SettingsController {
  // GET /api/settings
  async getSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { themePreference: true }
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Check DB connectivity
      let dbConnected = false;
      try {
        await prisma.$queryRaw`SELECT 1`;
        dbConnected = true;
      } catch (e) {}

      res.status(200).json({
        themePreference: user.themePreference,
        applicationInfo: {
          name: 'Project PowerShift',
          version: '1.0.0', // Could be dynamic via process.env
          environment: process.env.NODE_ENV || 'development',
          backendStatus: 'Connected',
          databaseStatus: dbConnected ? 'Connected' : 'Disconnected',
          calculationEngineStatus: 'Operational',
          authenticationStatus: 'Connected'
        }
      });
    } catch (error) {
      console.error('[SettingsController] Error getting settings:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // PATCH /api/settings/theme
  async updateTheme(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { themePreference } = req.body;

      if (!themePreference) {
        res.status(400).json({ error: 'Theme preference is required' });
        return;
      }

      await prisma.user.update({
        where: { id: userId },
        data: { themePreference }
      });

      res.status(200).json({ message: 'Theme updated successfully', themePreference });
    } catch (error) {
      console.error('[SettingsController] Error updating theme:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const settingsController = new SettingsController();
