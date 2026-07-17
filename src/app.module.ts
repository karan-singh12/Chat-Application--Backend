import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { ThrottlerStorageRedisService } from "@nest-lab/throttler-storage-redis";
import Redis from "ioredis";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { AdminModule } from "./modules/admin/admin.module";
import { ChatModule } from "./chat/chat.module";
import { RoomsModule } from "./modules/rooms/rooms.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { UploadsModule } from "./modules/uploads/uploads.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { JobsModule } from "./jobs/jobs.module";
import { TrafficMonitorInterceptor } from "./common/interceptors/traffic-monitor.interceptor";
import { ThrottlerBehindProxyGuard } from "./common/guards/throttler-behind-proxy.guard";
import { PostsModule } from "./modules/posts/posts.module";
import { ScheduleModule } from "@nestjs/schedule";



@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      useFactory: async () => {
        const host = process.env.REDIS_HOST || "127.0.0.1";
        const port = parseInt(process.env.REDIS_PORT ?? "6379", 10);

        let storage: any = undefined;

        // Verify connection with a quick ping
        const checkClient = new Redis({
          host,
          port,
          connectTimeout: 1000,
          maxRetriesPerRequest: 0,
        });
        checkClient.on("error", () => { });

        try {
          await checkClient.ping();

          // Redis is online! Create a real client
          const client = new Redis({
            host,
            port,
            retryStrategy(times) {
              return Math.min(times * 100, 3000); // retry delay
            },
          });
          client.on("error", () => { });
          storage = new ThrottlerStorageRedisService(client);
        } catch {
          // Redis offline: fall back to built-in in-memory store
        } finally {
          checkClient.disconnect();
        }

        return {
          throttlers: [
            {
              name: "default",
              ttl: 60_000,
              limit: 100,
            },
            {
              name: "auth",
              ttl: 60_000,
              limit: 10,
            },
            {
              name: "upload",
              ttl: 60_000,
              limit: 20,
            },
          ],
          storage,
        };
      },
    }),


    // ─── Task Scheduling ─────────────────────────────────────────────────────
    ScheduleModule.forRoot(),

    // ─── Feature Modules ─────────────────────────────────────────────────────
    PrismaModule,
    AuthModule,
    UsersModule,
    AdminModule,
    ChatModule,
    RoomsModule,
    NotificationsModule,
    UploadsModule,
    PaymentsModule,
    JobsModule,
    PostsModule,
    // CacheModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global HTTP rate-limit guard (proxy-aware, reads x-forwarded-for)
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
    // Global request/traffic logging interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: TrafficMonitorInterceptor,
    },
  ],
})
export class AppModule { }

