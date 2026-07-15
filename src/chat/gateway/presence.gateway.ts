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
import { RedisService } from "../../cache/redis.service";

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
    private readonly redisService: RedisService,
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

      let onlineCount = 1;
      try {
        const clientRedis = this.redisService.getClient();
        if (clientRedis.status === "ready") {
          await clientRedis.sadd(`online_user:${userId}`, client.id);
          onlineCount = await clientRedis.scard(`online_user:${userId}`);
        } else {
          const localSockets = (this.server as any).adapter.rooms.get(`user:${userId}`);
          onlineCount = localSockets ? localSockets.size : 1;
        }
      } catch (err) {
        const localSockets = (this.server as any).adapter.rooms.get(`user:${userId}`);
        onlineCount = localSockets ? localSockets.size : 1;
      }

      // Update database status
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          isOnline: true,
          socketId: client.id,
          lastSeen: new Date(),
        },
      });

      // Send the list of currently online user IDs to the connected client
      const onlineUsers = await this.prisma.user.findMany({
        where: { isOnline: true },
        select: { id: true },
      });
      client.emit("initialOnlineUsers", onlineUsers.map((u) => u.id));

      // Broadcast presence only if it is the first tab connecting
      if (onlineCount === 1) {
        this.server.emit("userOnline", { userId });
      }
      console.log(`[WS-Presence] Connected: user ${userId} (${client.id})`);
    } catch (err) {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId) {
      let onlineCount = 0;
      try {
        const clientRedis = this.redisService.getClient();
        if (clientRedis.status === "ready") {
          await clientRedis.srem(`online_user:${userId}`, client.id);
          onlineCount = await clientRedis.scard(`online_user:${userId}`);
        } else {
          const localSockets = (this.server as any).adapter.rooms.get(`user:${userId}`);
          const localSize = localSockets ? localSockets.size : 1;
          onlineCount = Math.max(0, localSize - 1);
        }
      } catch (err) {
        const localSockets = (this.server as any).adapter.rooms.get(`user:${userId}`);
        const localSize = localSockets ? localSockets.size : 1;
        onlineCount = Math.max(0, localSize - 1);
      }

      // If no active socket sessions remain, update DB and broadcast offline
      if (onlineCount === 0) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            isOnline: false,
            socketId: null,
            lastSeen: new Date(),
          },
        });

        this.server.emit("userOffline", { userId });
        console.log(`[WS-Presence] Disconnected last session: user ${userId}`);
      } else {
        console.log(`[WS-Presence] Disconnected session: user ${userId} (remaining tabs: ${onlineCount})`);
      }
    }
  }
}
