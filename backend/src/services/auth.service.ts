import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export interface TokenPayload {
  userId: string;
  role: string;
}

export class AuthService {
  private getJwtSecret(): string {
    return process.env.JWT_SECRET || 'powershift_fallback_access_secret_2026';
  }

  private getRefreshSecret(): string {
    return process.env.REFRESH_SECRET || 'powershift_fallback_refresh_secret_2026';
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.getJwtSecret(), { expiresIn: '15m' });
  }

  generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.getRefreshSecret(), {
      expiresIn: '7d',
      jwtid: crypto.randomUUID(),
    });
  }

  verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, this.getJwtSecret()) as TokenPayload;
  }

  verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(token, this.getRefreshSecret()) as TokenPayload;
  }
}

export const authService = new AuthService();
export default authService;
