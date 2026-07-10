import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { WsException } from "@nestjs/websockets";
import { Socket } from "socket.io";

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      const token =
        client.handshake.auth?.token ||
        client.handshake.query?.token;

      if (!token) {
        throw new WsException("Unauthorized: Token missing");
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || "super-secret-key-12345",
      });

      // Attach user details to socket data
      client.data.userId = payload.userId || payload.sub;
      client.data.user = payload;
      return true;
    } catch (err) {
      throw new WsException("Unauthorized: Token invalid or expired");
    }
  }
}
