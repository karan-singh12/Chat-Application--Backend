import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { CacheModule } from "../cache/cache.module";
import { ChatController } from "./controller/chat.controller";
import { ChatService } from "./service/chat.service";
import { ChatGateway } from "./gateway/chat.gateway";
import { PresenceGateway } from "./gateway/presence.gateway";
import { NotificationGateway } from "./gateway/notification.gateway";

@Module({
  imports: [AuthModule, PrismaModule, CacheModule],
  controllers: [ChatController],
  providers: [
    ChatService,
    ChatGateway,
    PresenceGateway,
    NotificationGateway,
  ],
  exports: [
    ChatService,
    ChatGateway,
    PresenceGateway,
    NotificationGateway,
  ],
})
export class ChatModule {}
