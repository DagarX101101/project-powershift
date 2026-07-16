import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { Role, UserStatus } from '@prisma/client';
import { authService } from '../services/auth.service';
import crypto from 'crypto';

export class UsersController {
  
  private async logAudit(adminId: string, action: string, targetUserId: string | null, targetUserEmail: string | null, oldValue: string | null, newValue: string | null) {
    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    await prisma.auditLog.create({
      data: {
        adminId,
        adminName: admin?.name || 'Unknown Admin',
        action,
        targetUserId,
        targetUserEmail,
        oldValue,
        newValue
      }
    });
  }

  // GET /api/users
  async getAllUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const users = await prisma.user.findMany({
        include: { mines: true },
        orderBy: { createdAt: 'desc' }
      });

      // Exclude passwordHash
      const safeUsers = users.map(user => {
        const { passwordHash, ...rest } = user;
        return rest;
      });

      res.status(200).json(safeUsers);
    } catch (error) {
      console.error('[UsersController] Error fetching users:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET /api/users/:id
  async getUserById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await prisma.user.findUnique({
        where: { id },
        include: { mines: true }
      });
      
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const { passwordHash, ...safeUser } = user;
      res.status(200).json(safeUser);
    } catch (error) {
      console.error('[UsersController] Error fetching user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // PATCH /api/users/:id
  async updateUserDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, department, mobileNumber } = req.body;
      const adminId = req.user!.userId;

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: { name, department, mobileNumber }
      });

      await this.logAudit(
        adminId,
        'EDIT_USER_DETAILS',
        user.id,
        user.email,
        JSON.stringify({ name: user.name, dept: user.department, mob: user.mobileNumber }),
        JSON.stringify({ name: updatedUser.name, dept: updatedUser.department, mob: updatedUser.mobileNumber })
      );

      const { passwordHash, ...safeUser } = updatedUser;
      res.status(200).json(safeUser);
    } catch (error) {
      console.error('[UsersController] Error updating user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // PATCH /api/users/:id/status
  async updateUserStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const adminId = req.user!.userId;

      if (!['ACTIVE', 'SUSPENDED', 'DELETED'].includes(status)) {
        res.status(400).json({ error: 'Invalid status' });
        return;
      }

      if (id === adminId && (status === 'SUSPENDED' || status === 'DELETED')) {
        res.status(403).json({ error: 'You cannot suspend or delete your own account' });
        return;
      }

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: { status: status as UserStatus }
      });

      // If suspended or deleted, we should ideally invalidate refresh tokens (omitted for simplicity or can be added)
      if (status !== 'ACTIVE') {
        await prisma.refreshToken.deleteMany({ where: { userId: id } });
      }

      await this.logAudit(adminId, 'CHANGE_USER_STATUS', user.id, user.email, user.status, updatedUser.status);

      res.status(200).json({ message: 'Status updated successfully', status: updatedUser.status });
    } catch (error) {
      console.error('[UsersController] Error updating status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // PATCH /api/users/:id/role
  async updateUserRole(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const adminId = req.user!.userId;

      if (!['ADMIN', 'ENGINEER', 'VIEWER'].includes(role)) {
        res.status(400).json({ error: 'Invalid role' });
        return;
      }

      if (id === adminId && role !== 'ADMIN') {
        res.status(403).json({ error: 'You cannot remove your own Administrator role' });
        return;
      }

      const user = await prisma.user.findUnique({ where: { id }, include: { mines: true } });
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      if (role === 'ENGINEER' && user.mines.length === 0) {
        res.status(400).json({ error: 'Engineers must have at least one assigned mine. Please assign a mine first.' });
        return;
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: { role: role as Role }
      });

      // Token invalidation ensures immediate permission application
      await prisma.refreshToken.deleteMany({ where: { userId: id } });

      await this.logAudit(adminId, 'CHANGE_USER_ROLE', user.id, user.email, user.role, updatedUser.role);

      res.status(200).json({ message: 'Role updated successfully', role: updatedUser.role });
    } catch (error) {
      console.error('[UsersController] Error updating role:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // PATCH /api/users/:id/mines
  async updateUserMines(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { mineIds } = req.body;
      const adminId = req.user!.userId;

      if (!Array.isArray(mineIds)) {
        res.status(400).json({ error: 'mineIds must be an array' });
        return;
      }

      const user = await prisma.user.findUnique({ where: { id }, include: { mines: true } });
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      if (user.role === 'ENGINEER' && mineIds.length === 0) {
        res.status(400).json({ error: 'Engineers must have at least one assigned mine.' });
        return;
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          mines: {
            set: mineIds.map(mineId => ({ id: mineId }))
          }
        },
        include: { mines: true }
      });

      const oldMines = user.mines.map(m => m.name).join(', ');
      const newMines = updatedUser.mines.map(m => m.name).join(', ');

      await this.logAudit(adminId, 'CHANGE_USER_MINES', user.id, user.email, oldMines || 'None', newMines || 'None');

      res.status(200).json({ message: 'Assigned mines updated successfully', mines: updatedUser.mines });
    } catch (error) {
      console.error('[UsersController] Error updating mines:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // PATCH /api/users/:id/reset-password
  async resetPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = req.user!.userId;

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Generate a temporary 12-char password
      const tempPassword = crypto.randomBytes(8).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 10) + '!1aA';
      
      const passwordHash = await authService.hashPassword(tempPassword);

      await prisma.user.update({
        where: { id },
        data: { 
          passwordHash,
          mustChangePassword: true
        }
      });

      // Force logout
      await prisma.refreshToken.deleteMany({ where: { userId: id } });

      await this.logAudit(adminId, 'RESET_PASSWORD', user.id, user.email, '***', '***');

      res.status(200).json({ 
        message: 'Password reset successfully', 
        temporaryPassword: tempPassword 
      });
    } catch (error) {
      console.error('[UsersController] Error resetting password:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const usersController = new UsersController();
