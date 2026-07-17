import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtStrategy } from '../../auth/strategies/jwt.strategy';
import { MESSAGES } from '../constants/messages.constant';
import { AuthenticatedUser } from '../interfaces/jwt-payload.interface';

/**
 * HTTP JWT Authentication Guard.
 * Uses the shared JwtStrategy to verify the Bearer token.
 * Attaches the typed JwtPayload to request.user.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtStrategy: JwtStrategy) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token   = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException(MESSAGES.auth.tokenMissing);
    }

    // JwtStrategy.verify() throws UnauthorizedException on invalid token
    const payload = await this.jwtStrategy.verify(token);
    request['user'] = payload as AuthenticatedUser;
    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const authHeader = request.headers?.authorization;
    if (!authHeader) return undefined;
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
