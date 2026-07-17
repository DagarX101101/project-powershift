import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { dashboardService } from '../dashboard/DashboardService';

const hierarchyPath = path.resolve(__dirname, '../../../shared/mineHierarchy.json');
const hierarchy = JSON.parse(fs.readFileSync(hierarchyPath, 'utf8'));

class ConcurrencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConcurrencyError';
  }
}

export class StrapDataController {
  // 1. Metadata check for live refresh notifications
  async getMetadata(req: Request, res: Response): Promise<void> {
    try {
      const [vpMax, mpiMax, etMax] = await Promise.all([
        prisma.vehicleProductivity.aggregate({ _max: { updatedAt: true } }),
        prisma.minePlanningInput.aggregate({ _max: { updatedAt: true } }),
        prisma.electricalTOD.aggregate({ _max: { updatedAt: true } })
      ]);

      const dates = [
        vpMax._max.updatedAt,
        mpiMax._max.updatedAt,
        etMax._max.updatedAt
      ].filter((d): d is Date => d !== null);

      const maxDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date();

      res.status(200).json({ lastUpdated: maxDate.toISOString() });
    } catch (error) {
      console.error('[StrapDataController.getMetadata] Error:', error);
      res.status(500).json({ error: 'Internal server error fetching metadata' });
    }
  }

  // 2. Vehicle Productivity
  async getVehicleProductivity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = await prisma.vehicleProductivity.findMany({
        orderBy: { equipment: 'asc' },
      });
      res.status(200).json(data);
    } catch (error) {
      console.error('[StrapDataController.getVehicleProductivity] Error:', error);
      res.status(500).json({ error: 'Internal server error fetching vehicle productivity' });
    }
  }

  async updateVehicleProductivity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const updates = req.body; // Array verified by validator

      await prisma.$transaction(async (tx) => {
        const ids = updates.map((u: any) => u.id);
        
        // Optimized query: load all targets in a single batch query
        const existings = await tx.vehicleProductivity.findMany({
          where: { id: { in: ids } }
        });
        
        const existingMap = new Map(existings.map(e => [e.id, e]));

        for (const update of updates) {
          const existing = existingMap.get(update.id);

          if (!existing) {
            throw new Error(`Record ${update.id} not found`);
          }

          // Optimistic locking comparison
          if (existing.updatedAt.toISOString() !== update.updatedAt) {
            throw new ConcurrencyError('Data has changed on the server. Please reload before saving.');
          }

          // Build partial update payload (PATCH)
          const dataToUpdate: any = {};
          if (update.capacity !== undefined) dataToUpdate.capacity = update.capacity;
          if (update.uom !== undefined) dataToUpdate.uom = update.uom;
          if (update.avgLead !== undefined) dataToUpdate.avgLead = update.avgLead;
          if (update.fy27 !== undefined) dataToUpdate.fy27 = update.fy27;
          if (update.fy28 !== undefined) dataToUpdate.fy28 = update.fy28;
          if (update.fy29 !== undefined) dataToUpdate.fy29 = update.fy29;
          if (update.fy30 !== undefined) dataToUpdate.fy30 = update.fy30;
          if (update.fy31 !== undefined) dataToUpdate.fy31 = update.fy31;

          await tx.vehicleProductivity.update({
            where: { id: update.id },
            data: dataToUpdate
          });
        }
        await tx.calculationResult.deleteMany({});
      });

      dashboardService.invalidateCache();

      res.status(200).json({ message: 'Vehicle productivity updated successfully' });
    } catch (error: any) {
      if (error instanceof ConcurrencyError) {
        res.status(409).json({ error: error.message });
        return;
      }
      console.error('[StrapDataController.updateVehicleProductivity] Error:', error);
      res.status(500).json({ error: 'Internal server error updating vehicle productivity' });
    }
  }

  // 3. Mine Planning Inputs
  async getMinePlanningInputs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { mineId } = req.query;

      if (!mineId || typeof mineId !== 'string') {
        res.status(400).json({ error: 'mineId query parameter is required' });
        return;
      }

      const data = await prisma.minePlanningInput.findMany({
        where: { mineId },
        orderBy: { particular: 'asc' },
      });

      res.status(200).json(data);
    } catch (error) {
      console.error('[StrapDataController.getMinePlanningInputs] Error:', error);
      res.status(500).json({ error: 'Internal server error fetching mine planning inputs' });
    }
  }

  async updateMinePlanningInputs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { mineId } = req.params;
      const updates = req.body; // Array verified by validator

      // Permission Enforcement
      if (req.user?.role === Role.ENGINEER) {
        const isAssigned = await prisma.user.findFirst({
          where: {
            id: req.user.userId,
            mines: { some: { id: mineId } }
          }
        });

        if (!isAssigned) {
          res.status(403).json({ error: 'Access Denied: You are not assigned to this mine site.' });
          return;
        }
      }

      await prisma.$transaction(async (tx) => {
        const ids = updates.map((u: any) => u.id);
        
        // Optimized query: load all site planning inputs in a single query
        const existings = await tx.minePlanningInput.findMany({
          where: { id: { in: ids } }
        });
        
        const existingMap = new Map(existings.map(e => [e.id, e]));

        for (const update of updates) {
          const existing = existingMap.get(update.id);

          if (!existing) {
            throw new Error(`Record ${update.id} not found`);
          }

          // Optimistic locking comparison
          if (existing.updatedAt.toISOString() !== update.updatedAt) {
            throw new ConcurrencyError('Data has changed on the server. Please reload before saving.');
          }

          const dataToUpdate: any = {};
          if (update.fy27 !== undefined) dataToUpdate.fy27 = update.fy27;
          if (update.fy28 !== undefined) dataToUpdate.fy28 = update.fy28;
          if (update.fy29 !== undefined) dataToUpdate.fy29 = update.fy29;
          if (update.fy30 !== undefined) dataToUpdate.fy30 = update.fy30;
          if (update.fy31 !== undefined) dataToUpdate.fy31 = update.fy31;

          await tx.minePlanningInput.update({
            where: { id: update.id },
            data: dataToUpdate
          });
        }
        await tx.calculationResult.deleteMany({ where: { mineId } });
      });

      dashboardService.invalidateCache();

      res.status(200).json({ message: 'Mine planning inputs updated successfully' });
    } catch (error: any) {
      if (error instanceof ConcurrencyError) {
        res.status(409).json({ error: error.message });
        return;
      }
      console.error('[StrapDataController.updateMinePlanningInputs] Error:', error);
      res.status(500).json({ error: 'Internal server error updating mine planning inputs' });
    }
  }

  // 4. Electrical TOD
  async getElectricalTod(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { clusterId } = req.query;

      if (!clusterId || typeof clusterId !== 'string') {
        res.status(400).json({ error: 'clusterId query parameter is required' });
        return;
      }

      const data = await prisma.electricalTOD.findMany({
        where: { clusterId },
        orderBy: { period: 'asc' },
      });

      res.status(200).json(data);
    } catch (error) {
      console.error('[StrapDataController.getElectricalTod] Error:', error);
      res.status(500).json({ error: 'Internal server error fetching electrical TOD values' });
    }
  }

  async updateElectricalTod(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { clusterId } = req.params;
      const updates = req.body; // Array verified by validator

      // Validate that total consumption percentage equals exactly 100% across the updates
      const currentTods = await prisma.electricalTOD.findMany({ where: { clusterId } });
      const updatedMap = new Map(currentTods.map(t => [t.id, t.consumptionPercentage]));

      // Apply proposed updates to map
      for (const u of updates) {
        if (u.consumptionPercentage !== undefined) {
          updatedMap.set(u.id, u.consumptionPercentage);
        }
      }

      const totalPercentage = Array.from(updatedMap.values()).reduce((sum, val) => sum + val, 0);
      
      // Allow minor float differences and profiles with sums up to 101% (e.g. Jharkhand)
      if (Math.abs(totalPercentage - 100.0) > 1.01) {
        res.status(400).json({ error: `Save rejected: Total consumption percentage must be exactly 100%. Currently it is ${totalPercentage}%.` });
        return;
      }

      await prisma.$transaction(async (tx) => {
        const ids = updates.map((u: any) => u.id);
        
        // Optimized query: load all TOD inputs in a single query
        const existings = await tx.electricalTOD.findMany({
          where: { id: { in: ids } }
        });
        
        const existingMap = new Map(existings.map(e => [e.id, e]));

        for (const update of updates) {
          const existing = existingMap.get(update.id);

          if (!existing) {
            throw new Error(`Record ${update.id} not found`);
          }

          // Optimistic locking comparison
          if (existing.updatedAt.toISOString() !== update.updatedAt) {
            throw new ConcurrencyError('Data has changed on the server. Please reload before saving.');
          }

          const dataToUpdate: any = {};
          if (update.fromTime !== undefined) dataToUpdate.fromTime = update.fromTime;
          if (update.toTime !== undefined) dataToUpdate.toTime = update.toTime;
          if (update.totalHours !== undefined) dataToUpdate.totalHours = update.totalHours;
          if (update.consumptionPercentage !== undefined) dataToUpdate.consumptionPercentage = update.consumptionPercentage;
          if (update.percentageDifferenceFactor !== undefined) dataToUpdate.percentageDifferenceFactor = update.percentageDifferenceFactor;

          await tx.electricalTOD.update({
            where: { id: update.id },
            data: dataToUpdate
          });
        }
        const mines = await tx.mine.findMany({ where: { clusterId } });
        const mineIds = mines.map(m => m.id);
        await tx.calculationResult.deleteMany({ where: { mineId: { in: mineIds } } });
      });

      dashboardService.invalidateCache();

      res.status(200).json({ message: 'Electrical TOD values updated successfully' });
    } catch (error: any) {
      if (error instanceof ConcurrencyError) {
        res.status(409).json({ error: error.message });
        return;
      }
      console.error('[StrapDataController.updateElectricalTod] Error:', error);
      res.status(500).json({ error: 'Internal server error updating electrical TOD values' });
    }
  }

  async getClustersAndMines(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const dbClusters = await prisma.cluster.findMany({
        include: {
          mines: true
        }
      });

      // Sort clusters and mines based on centralized hierarchy configuration
      const sortedData = hierarchy.map((h: any) => {
        const dbCluster = dbClusters.find(c => c.name === h.clusterName);
        if (!dbCluster) return null;

        const sortedMines = h.mines.map((mName: string) => {
          return dbCluster.mines.find(m => m.name === mName);
        }).filter(Boolean);

        return {
          ...dbCluster,
          mines: sortedMines
        };
      }).filter(Boolean);

      res.status(200).json(sortedData);
    } catch (error) {
      console.error('[StrapDataController.getClustersAndMines] Error:', error);
      res.status(500).json({ error: 'Internal server error fetching clusters' });
    }
  }
}

export const strapDataController = new StrapDataController();
export default strapDataController;
