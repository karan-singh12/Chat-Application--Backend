import { IoAdapter } from "@nestjs/platform-socket.io";
import { ServerOptions } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: any;

  async connectToRedis(): Promise<boolean> {
    const host = process.env.REDIS_HOST || "127.0.0.1";
    const port = parseInt(process.env.REDIS_PORT, 10) || 6379;

    // Create a fast-failing check client to verify connection without blocking startup
    const checkClient = new Redis({
      host,
      port,
      connectTimeout: 1000,
      maxRetriesPerRequest: 0,
    });
    checkClient.on("error", () => {});

    try {
      await checkClient.ping();
      
      // Redis is online! Create the real pub/sub clients
      const pubClient = new Redis({
        host,
        port,
        maxRetriesPerRequest: null,
      });
      pubClient.on("error", () => {});

      const subClient = pubClient.duplicate();
      subClient.on("error", () => {});

      this.adapterConstructor = createAdapter(pubClient, subClient);
      console.log(`[WS] Horizontal cluster: Socket.IO connected to Redis on ${host}:${port}`);
      return true;
    } catch (err) {
      console.warn(`[WS] Redis offline: falling back to single-instance in-memory adapter.`, err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      checkClient.disconnect();
    }
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
