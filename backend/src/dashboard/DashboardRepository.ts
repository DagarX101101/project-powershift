import { prisma } from '../config/database';

export class DashboardRepository {
  async getClustersAndMines() {
    return prisma.cluster.findMany({
      include: {
        mines: true
      }
    });
  }

  async getCalculationResults() {
    return prisma.calculationResult.findMany();
  }

  async getMinePlanningInputsCountByMine() {
    const inputs = await prisma.minePlanningInput.groupBy({
      by: ['mineId'],
      _count: {
        id: true
      }
    });
    
    return inputs.reduce((acc, curr) => {
      acc[curr.mineId] = curr._count.id;
      return acc;
    }, {} as Record<string, number>);
  }
}

export const dashboardRepository = new DashboardRepository();
