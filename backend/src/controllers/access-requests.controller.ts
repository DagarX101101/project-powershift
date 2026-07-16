import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

export class AccessRequestsController {
  
  // GET /api/access-requests
  async getAccessRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { status } = req.query;
      
      const whereClause: any = {};
      if (status) {
        whereClause.status = status;
      } else {
        whereClause.status = 'PENDING';
      }

      const requests = await prisma.accessRequest.findMany({
        where: whereClause,
        orderBy: { requestedAt: 'desc' },
      });

      res.status(200).json(requests);
    } catch (error) {
      console.error('[AccessRequestsController] Error fetching requests:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET /api/access-requests/history
  async getAccessRequestHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const requests = await prisma.accessRequest.findMany({
        where: {
          status: { in: ['APPROVED', 'REJECTED'] },
        },
        orderBy: { reviewedAt: 'desc' },
      });

      res.status(200).json(requests);
    } catch (error) {
      console.error('[AccessRequestsController] Error fetching history:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET /api/access-requests/summary
  // We'll just return everything or frontend can fetch all.
  async getAllRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const requests = await prisma.accessRequest.findMany({
        orderBy: { requestedAt: 'desc' },
      });
      res.status(200).json(requests);
    } catch (error) {
      console.error('[AccessRequestsController] Error fetching all requests:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET /api/access-requests/:id
  async getAccessRequestById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const request = await prisma.accessRequest.findUnique({ where: { id } });
      
      if (!request) {
        res.status(404).json({ error: 'Request not found' });
        return;
      }
      
      res.status(200).json(request);
    } catch (error) {
      console.error('[AccessRequestsController] Error fetching request:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // PATCH /api/access-requests/:id/approve
  async approveRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { role, mineIds } = req.body;
      const adminId = req.user!.userId;
      const adminUser = await prisma.user.findUnique({ where: { id: adminId } });
      const adminName = adminUser?.name || 'Unknown Admin';

      if (!role) {
        res.status(400).json({ error: 'Role must be selected' });
        return;
      }

      if (role === 'ENGINEER' && (!mineIds || mineIds.length === 0)) {
        res.status(400).json({ error: 'Engineers must be assigned at least one mine' });
        return;
      }

      const accessRequest = await prisma.accessRequest.findUnique({ where: { id } });
      
      if (!accessRequest) {
        res.status(404).json({ error: 'Request not found' });
        return;
      }

      if (accessRequest.status !== 'PENDING') {
        res.status(400).json({ error: 'Only pending requests can be approved' });
        return;
      }

      // Ensure no existing active user with this email
      const existingUser = await prisma.user.findUnique({ where: { email: accessRequest.email } });
      if (existingUser) {
        res.status(409).json({ error: 'An active user with this email already exists' });
        return;
      }

      // Transaction: Create User + Update Request
      await prisma.$transaction(async (tx) => {
        // 1. Create User
        const newUser = await tx.user.create({
          data: {
            email: accessRequest.email,
            name: accessRequest.fullName,
            passwordHash: accessRequest.passwordHash,
            role: role as Role,
            status: 'ACTIVE',
            mustChangePassword: true,
            mines: mineIds && mineIds.length > 0 ? {
              connect: mineIds.map((mineId: string) => ({ id: mineId }))
            } : undefined
          }
        });

        // 2. Update Access Request
        await tx.accessRequest.update({
          where: { id },
          data: {
            status: 'APPROVED',
            reviewedAt: new Date(),
            reviewedBy: `${adminName} (${adminId})`,
            assignedRole: role as Role,
            assignedMines: mineIds || [],
          }
        });
      });

      res.status(200).json({ message: 'Request approved and user created successfully' });
    } catch (error) {
      console.error('[AccessRequestsController] Error approving request:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // PATCH /api/access-requests/:id/reject
  async rejectRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminId = req.user!.userId;
      const adminUser = await prisma.user.findUnique({ where: { id: adminId } });
      const adminName = adminUser?.name || 'Unknown Admin';

      const accessRequest = await prisma.accessRequest.findUnique({ where: { id } });
      
      if (!accessRequest) {
        res.status(404).json({ error: 'Request not found' });
        return;
      }

      if (accessRequest.status !== 'PENDING') {
        res.status(400).json({ error: 'Only pending requests can be rejected' });
        return;
      }

      await prisma.accessRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          reviewedAt: new Date(),
          reviewedBy: `${adminName} (${adminId})`,
          rejectionReason: reason || null,
        }
      });

      res.status(200).json({ message: 'Request rejected successfully' });
    } catch (error) {
      console.error('[AccessRequestsController] Error rejecting request:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const accessRequestsController = new AccessRequestsController();
