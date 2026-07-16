import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { authService } from '../services/auth.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

// Helper to manually parse cookies
const getCookie = (req: Request, name: string): string | null => {
  const cookies = req.headers.cookie;
  if (!cookies) return null;
  const parts = cookies.split(';');
  for (const part of parts) {
    const [k, v] = part.split('=');
    if (k.trim() === name) return decodeURIComponent(v);
  }
  return null;
};

// Memory cache to handle concurrent token rotation race conditions (e.g. React StrictMode)
const rotatedTokensCache = new Map<string, {
  newAccessToken: string;
  newRefreshToken: string;
  rotatedAt: number;
}>();

// Periodically prune rotation cache to prevent memory leaks in production
const pruneRotationCache = (): void => {
  const now = Date.now();
  for (const [key, value] of rotatedTokensCache.entries()) {
    if (now - value.rotatedAt > 15000) { // Keep entries for 15s to cover concurrency window
      rotatedTokensCache.delete(key);
    }
  }
};

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        const accessRequest = await prisma.accessRequest.findUnique({
          where: { email: email.toLowerCase() }
        });

        if (accessRequest) {
          if (accessRequest.status === 'PENDING') {
            res.status(401).json({ error: 'Your access request is still pending administrator approval.' });
            return;
          }
          if (accessRequest.status === 'REJECTED') {
            res.status(401).json({ error: 'Your request has been rejected. Please contact your administrator.' });
            return;
          }
        }

        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      if (user.status === 'SUSPENDED') {
        res.status(403).json({ error: 'Your account is suspended. Please contact your administrator.' });
        return;
      }
      if (user.status === 'DELETED') {
        res.status(403).json({ error: 'Your account has been deactivated.' });
        return;
      }

      const isMatch = await authService.comparePassword(password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const accessToken = authService.generateAccessToken({ userId: user.id, role: user.role });
      const refreshToken = authService.generateRefreshToken({ userId: user.id, role: user.role });

      // Save refresh token in DB and update lastLoginAt
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await prisma.$transaction([
        prisma.refreshToken.create({
          data: {
            token: refreshToken,
            userId: user.id,
            expiresAt,
          }
        }),
        prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        })
      ]);

      // Set cookie header
      const cookieOptions = [
        `refreshToken=${encodeURIComponent(refreshToken)}`,
        `Max-Age=${7 * 24 * 60 * 60}`,
        'Path=/',
        'HttpOnly',
        process.env.NODE_ENV === 'production' ? 'SameSite=None' : 'SameSite=Lax'
      ];
      if (process.env.NODE_ENV === 'production') {
        cookieOptions.push('Secure');
      }
      res.setHeader('Set-Cookie', cookieOptions.join('; '));

      res.status(200).json({
        message: 'Login successful',
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          mustChangePassword: user.mustChangePassword
        }
      });
    } catch (error) {
      console.error('[AuthController.login] Error:', error);
      res.status(500).json({ error: 'Internal server error during login' });
    }
  }

  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const tokenFromCookie = getCookie(req, 'refreshToken');
      const tokenFromBody = req.body.refreshToken;
      const token = tokenFromCookie || tokenFromBody;

      if (!token) {
        res.status(400).json({ error: 'Refresh token is required' });
        return;
      }

      try {
        authService.verifyRefreshToken(token);
      } catch (err) {
        res.status(401).json({ error: 'Invalid or expired refresh token' });
        return;
      }

      // Concurrency handle for dual react triggers
      const cached = rotatedTokensCache.get(token);
      if (cached && (Date.now() - cached.rotatedAt) < 10000) {
        const cookieOptions = [
          `refreshToken=${encodeURIComponent(cached.newRefreshToken)}`,
          `Max-Age=${7 * 24 * 60 * 60}`,
          'Path=/',
          'HttpOnly',
          process.env.NODE_ENV === 'production' ? 'SameSite=None' : 'SameSite=Lax'
        ];
        if (process.env.NODE_ENV === 'production') {
          cookieOptions.push('Secure');
        }
        res.setHeader('Set-Cookie', cookieOptions.join('; '));
        res.status(200).json({
          accessToken: cached.newAccessToken,
          refreshToken: cached.newRefreshToken
        });
        return;
      }

      const dbToken = await prisma.refreshToken.findUnique({
        where: { token },
        include: { user: true }
      });

      if (!dbToken || dbToken.expiresAt < new Date() || dbToken.user.status === 'SUSPENDED' || dbToken.user.status === 'DELETED') {
        res.status(401).json({ error: 'Expired, invalid, or deactivated refresh token' });
        return;
      }

      const newAccessToken = authService.generateAccessToken({ userId: dbToken.user.id, role: dbToken.user.role });
      const newRefreshToken = authService.generateRefreshToken({ userId: dbToken.user.id, role: dbToken.user.role });

      try {
        await prisma.refreshToken.delete({ where: { id: dbToken.id } });
      } catch (e) {
        // Concurrency catch
      }

      await prisma.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: dbToken.user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      pruneRotationCache();
      rotatedTokensCache.set(token, {
        newAccessToken,
        newRefreshToken,
        rotatedAt: Date.now()
      });

      const cookieOptions = [
        `refreshToken=${encodeURIComponent(newRefreshToken)}`,
        `Max-Age=${7 * 24 * 60 * 60}`,
        'Path=/',
        'HttpOnly',
        process.env.NODE_ENV === 'production' ? 'SameSite=None' : 'SameSite=Lax'
      ];
      if (process.env.NODE_ENV === 'production') {
        cookieOptions.push('Secure');
      }
      res.setHeader('Set-Cookie', cookieOptions.join('; '));

      res.status(200).json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      });
    } catch (error) {
      console.error('[AuthController.refresh] Error:', error);
      res.status(500).json({ error: 'Internal server error during token refresh' });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const tokenFromCookie = getCookie(req, 'refreshToken');
      const tokenFromBody = req.body.refreshToken;
      const token = tokenFromCookie || tokenFromBody;

      if (token) {
        await prisma.refreshToken.deleteMany({
          where: { token }
        });
      }

      const cookieOptions = [
        'refreshToken=',
        'Max-Age=0',
        'Path=/',
        'HttpOnly',
        process.env.NODE_ENV === 'production' ? 'SameSite=None' : 'SameSite=Lax'
      ];
      if (process.env.NODE_ENV === 'production') {
        cookieOptions.push('Secure');
      }
      res.setHeader('Set-Cookie', cookieOptions.join('; '));

      res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
      console.error('[AuthController.logout] Error:', error);
      res.status(500).json({ error: 'Internal server error during logout' });
    }
  }

  async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId }
      });

      if (!user) {
        res.status(404).json({ error: 'User profile not found' });
        return;
      }

      if (user.status === 'SUSPENDED' || user.status === 'DELETED') {
        res.status(403).json({ error: 'Your account is deactivated' });
        return;
      }

      res.status(200).json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        mustChangePassword: user.mustChangePassword,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      });
    } catch (error) {
      console.error('[AuthController.getMe] Error:', error);
      res.status(500).json({ error: 'Internal server error fetching profile' });
    }
  }

  async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { oldPassword, newPassword } = req.body;
      if (!oldPassword || !newPassword || newPassword.length < 6) {
        res.status(400).json({ error: 'Passwords must be provided and new password must be at least 6 characters long' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId }
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const isMatch = await authService.comparePassword(oldPassword, user.passwordHash);
      if (!isMatch) {
        res.status(400).json({ error: 'Current password is incorrect' });
        return;
      }

      const newHash = await authService.hashPassword(newPassword);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newHash,
          mustChangePassword: false
        }
      });

      res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('[AuthController.changePassword] Error:', error);
      res.status(500).json({ error: 'Internal server error updating password' });
    }
  }
}

export const authController = new AuthController();
export default authController;
