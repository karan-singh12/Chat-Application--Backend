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
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) { }

  afterInit() {
    console.log(" PresenceGateway initialized.");
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.query?.token;

      if (!token) {
        console.warn(`[WS-Presence] Connection rejected: Token missing for socket ${client.id}`);
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || "super-secret-key-12345",
      });

      const userId = payload.userId || payload.sub;
      client.data.userId = userId;

      // Join personal room and await to ensure state is populated
      await client.join(`user:${userId}`);

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
      console.log(`[WS-Presence] Connected: user ${userId} (${client.id}), total sessions: ${onlineCount}`);
    } catch (err) {
      console.error(`[WS-Presence] Connection verification failed for socket ${client.id}:`, err);
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
          // Socket.io has already removed this socket from the room on disconnect.
          // Therefore, the size of localSockets is exactly the number of OTHER active sessions/tabs.
          const localSockets = (this.server as any).adapter.rooms.get(`user:${userId}`);
          onlineCount = localSockets ? localSockets.size : 0;
        }
      } catch (err) {
        const localSockets = (this.server as any).adapter.rooms.get(`user:${userId}`);
        onlineCount = localSockets ? localSockets.size : 0;
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
