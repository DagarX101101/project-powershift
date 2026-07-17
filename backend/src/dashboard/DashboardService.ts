import { dashboardRepository } from './DashboardRepository';
import { aggregateDashboardData, DashboardFilters, DashboardSummaryResponse } from './DashboardAggregationHelpers';

export class DashboardService {
  async getDashboardSummary(mineId: string = 'all', financialYear: string = 'all'): Promise<DashboardSummaryResponse> {
    console.log(`[DashboardService] Fetching dashboard summary for mineId=${mineId}, financialYear=${financialYear}...`);

    const [dbClusters, dbCalcResults, inputsCount] = await Promise.all([
      dashboardRepository.getClustersAndMines(),
      dashboardRepository.getCalculationResults(),
      dashboardRepository.getMinePlanningInputsCountByMine()
    ]);

    const filters: DashboardFilters = { mineId, financialYear };
    return aggregateDashboardData(dbClusters, dbCalcResults, inputsCount, filters);
  }

  invalidateCache(): void {
    console.log('[DashboardService] Cache invalidation triggered (no-op now)');
  }
}

export const dashboardService = new DashboardService();
