import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { authService } from '../services/auth.service';

export class AccessRequestController {
  async createAccessRequest(req: Request, res: Response): Promise<void> {
    try {
      const { fullName, email, password, department, mobileNumber, reason } = req.body;

      // Basic validation
      if (!fullName || !email || !password) {
        res.status(400).json({ error: 'Full Name, Email, and Password are required.' });
        return;
      }

      const emailLower = email.toLowerCase();

      // Check if active user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: emailLower },
      });

      if (existingUser) {
        res.status(409).json({ error: 'An active user with this email already exists.' });
        return;
      }

      // Check if access request already exists
      const existingRequest = await prisma.accessRequest.findUnique({
        where: { email: emailLower },
      });

      if (existingRequest) {
        res.status(409).json({ error: 'An access request with this email has already been submitted.' });
        return;
      }

      // Hash password
      const passwordHash = await authService.hashPassword(password);

      // Create access request
      await prisma.accessRequest.create({
        data: {
          fullName,
          email: emailLower,
          passwordHash,
          department,
          mobileNumber,
          reason,
        },
      });

      res.status(201).json({ message: 'Access request submitted successfully.' });
    } catch (error) {
      console.error('[AccessRequestController] Error creating access request:', error);
      res.status(500).json({ error: 'Internal server error processing access request.' });
    }
  }

  async getAccessRequestStatus(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.query;

      if (!email || typeof email !== 'string') {
        res.status(400).json({ error: 'Email parameter is required.' });
        return;
      }

      const emailLower = email.toLowerCase();

      const accessRequest = await prisma.accessRequest.findUnique({
        where: { email: emailLower },
        select: { status: true, requestedAt: true, reviewedAt: true },
      });

      if (!accessRequest) {
        res.status(404).json({ error: 'No access request found for this email.' });
        return;
      }

      res.status(200).json({
        status: accessRequest.status,
        requestedAt: accessRequest.requestedAt,
        reviewedAt: accessRequest.reviewedAt,
      });
    } catch (error) {
      console.error('[AccessRequestController] Error fetching access request status:', error);
      res.status(500).json({ error: 'Internal server error fetching status.' });
    }
  }
}

export const accessRequestController = new AccessRequestController();
