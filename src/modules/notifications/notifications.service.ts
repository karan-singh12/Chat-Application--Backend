import { Injectable } from "@nestjs/common";
import { PushNotificationGateway } from "./gateways/push-notification.gateway";

@Injectable()
export class NotificationsService {
  constructor(private readonly pushGateway: PushNotificationGateway) {}

  /** Sends a generic socket notification to a specific user */
  async sendNotification(userId: string, event: string, payload: Record<string, any>) {
    this.pushGateway.notify(userId, event, payload);
  }

  /** Sends a socket notification for a new friend request */
  async sendFriendRequestNotification(targetUserId: string, request: Record<string, any>) {
    this.pushGateway.notifyFriendRequest(targetUserId, request);
  }

  /** Sends a socket notification for a accepted friend request */
  async sendFriendAcceptedNotification(targetUserId: string, friendship: Record<string, any>) {
    this.pushGateway.notifyFriendAccepted(targetUserId, friendship);
  }

  /** Sends a socket notification for a new message */
  async sendNewMessageNotification(targetUserId: string, message: Record<string, any>) {
    this.pushGateway.notifyNewMessage(targetUserId, message);
  }
}

