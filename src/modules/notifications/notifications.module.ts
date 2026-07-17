import { Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { PushNotificationGateway } from "./gateways/push-notification.gateway";
import { AppLogger } from "../../shared/logger/logger.service";

@Module({
  providers: [NotificationsService, PushNotificationGateway, AppLogger],
  exports: [NotificationsService, PushNotificationGateway],
})
export class NotificationsModule {}

