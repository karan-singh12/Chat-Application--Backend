import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { JwtStrategy } from '../../auth/strategies/jwt.strategy';
import { MESSAGES } from '../../common/constants/messages.constant';

/**
 * WebSocket JWT Guard.
 * Uses the shared JwtStrategy to verify the socket handshake token.
 * Attaches the typed JwtPayload to client.data.
 */
@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly jwtStrategy: JwtStrategy) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const token =
      client.handshake.auth?.token ||
      client.handshake.query?.token;

    if (!token) {
      throw new WsException(MESSAGES.auth.wsTokenMissing);
    }

    const payload = await this.jwtStrategy.verifyWs(token as string);
    if (!payload) {
      throw new WsException(MESSAGES.auth.wsTokenInvalid);
    }

    // Attach typed payload to socket data
    client.data.userId = payload.userId;
    client.data.user = payload;
    return true;
  }
}
