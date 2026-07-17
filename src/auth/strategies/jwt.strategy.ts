import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { MESSAGES } from '../../common/constants/messages.constant';
import { APP_CONSTANTS } from '../../common/constants/app.constant';

// Shared service to handle JWT verification consistently
@Injectable()
export class JwtStrategy {
  private readonly secret: string;

  constructor(private readonly jwtService: JwtService) {
    this.secret = process.env.JWT_SECRET || APP_CONSTANTS.jwt.fallbackSecret;
  }

  // Verifies HTTP headers token and returns payload or throws
  async verify(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.secret,
      });
      return payload;
    } catch {
      throw new UnauthorizedException(MESSAGES.auth.tokenInvalid);
    }
  }

  // Verifies WebSocket connection token; returns null on error
  async verifyWs(token: string): Promise<JwtPayload | null> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.secret,
      });
    } catch {
      return null;
    }
  }
}
