import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
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
import { WebsocketModule } from "./websocket/websocket.module";
import { JobsModule } from "./jobs/jobs.module";
import { TrafficMonitorInterceptor } from "./common/interceptors/traffic-monitor.interceptor";
// import { CacheModule } from "./cache/cache.module";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    AdminModule,
    ChatModule,
    RoomsModule,
    NotificationsModule,
    UploadsModule,
    PaymentsModule,
    WebsocketModule,
    JobsModule,
    // CacheModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TrafficMonitorInterceptor,
    },
  ],
})
export class AppModule {}
