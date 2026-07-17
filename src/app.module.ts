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
// import { CacheModule } from "./cache/cache.module";

/** Build the throttler storage: Redis when available, in-memory as fallback */
function buildThrottlerStorage() {
  const host = process.env.REDIS_HOST || "127.0.0.1";
  const port = parseInt(process.env.REDIS_PORT ?? "6379", 10);

  try {
    const client = new Redis({
      host,
      port,
      connectTimeout: 1500,
      maxRetriesPerRequest: 0,
      lazyConnect: true,
    });
    // Silence connection errors so a missing Redis doesn't crash the app
    client.on("error", () => {});
    return new ThrottlerStorageRedisService(client);
  } catch {
    // Redis unavailable — ThrottlerModule will use its built-in in-memory store
    return undefined;
  }
}

@Module({
  imports: [
    // ─── Rate Limiting ───────────────────────────────────────────────────────
    // Three named throttler tiers applied globally via ThrottlerBehindProxyGuard.
    // Use @Throttle({ auth: {} }) / @Throttle({ upload: {} }) on specific routes,
    // or @SkipThrottle() to opt out entirely.
    ThrottlerModule.forRoot({
      throttlers: [
        {
          // default — general API calls
          name: "default",
          ttl: 60_000,   // 1 minute window (ms)
          limit: 100,    // 100 requests / min per IP
        },
        {
          // auth — strict limit for login/signup/password endpoints
          name: "auth",
          ttl: 60_000,   // 1 minute window
          limit: 10,     // 10 attempts / min per IP
        },
        {
          // upload — generous window for media uploads
          name: "upload",
          ttl: 60_000,
          limit: 20,     // 20 uploads / min per IP
        },
      ],
      // Use Redis store (shared across instances); falls back to in-memory if Redis is offline
      storage: buildThrottlerStorage(),
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
export class AppModule {}

