import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { dashboardService } from './DashboardService';

export const getDashboardData = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const mineId = (req.query.mineId as string) || 'all';
    const financialYear = (req.query.financialYear as string) || 'all';

    const summary = await dashboardService.getDashboardSummary(mineId, financialYear);
    res.status(200).json(summary);
  } catch (error: any) {
    console.error('[DashboardController.getDashboardData] Error:', error);
    res.status(500).json({ error: 'Internal server error generating dashboard summary' });
  }
};
