import { dashboardRepository } from './DashboardRepository';
import { aggregateDashboardData, DashboardFilters, DashboardSummaryResponse } from './DashboardAggregationHelpers';

const cache = new Map<string, DashboardSummaryResponse>();

export class DashboardService {
  async getDashboardSummary(mineId: string = 'all', financialYear: string = 'all'): Promise<DashboardSummaryResponse> {
    const cacheKey = `${mineId}_${financialYear}`;
    
    if (cache.has(cacheKey)) {
      console.log(`[DashboardService] Cache HIT for key: ${cacheKey}`);
      return cache.get(cacheKey)!;
    }

    console.log(`[DashboardService] Cache MISS for key: ${cacheKey}. Fetching data...`);

    const [dbClusters, dbCalcResults, inputsCount] = await Promise.all([
      dashboardRepository.getClustersAndMines(),
      dashboardRepository.getCalculationResults(),
      dashboardRepository.getMinePlanningInputsCountByMine()
    ]);

    const filters: DashboardFilters = { mineId, financialYear };
    const summary = aggregateDashboardData(dbClusters, dbCalcResults, inputsCount, filters);

    cache.set(cacheKey, summary);
    return summary;
  }

  invalidateCache(): void {
    console.log('[DashboardService] Cache invalidated and cleared');
    cache.clear();
  }
}

export const dashboardService = new DashboardService();
