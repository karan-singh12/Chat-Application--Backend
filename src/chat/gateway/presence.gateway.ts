import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../prisma/prisma.service";

@WebSocketGateway({
  cors: { origin: "*" },
  namespace: "/",
})
export class PresenceGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit() {
    console.log("✅ PresenceGateway initialized.");
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.query?.token;

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || "super-secret-key-12345",
      });

      const userId = payload.userId || payload.sub;
      client.data.userId = userId;

      // Join personal room
      client.join(`user:${userId}`);

      // Update database status
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          isOnline: true,
          socketId: client.id,
          lastSeen: new Date(),
        },
      });

      // Broadcast presence
      this.server.emit("userOnline", { userId });
      console.log(`[WS-Presence] Connected: user ${userId} (${client.id})`);
    } catch (err) {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId) {
      // Update database status
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          isOnline: false,
          socketId: null,
          lastSeen: new Date(),
        },
      });

      // Broadcast offline
      this.server.emit("userOffline", { userId });
      console.log(`[WS-Presence] Disconnected: user ${userId}`);
    }
  }
}
