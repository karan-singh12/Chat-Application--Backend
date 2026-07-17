import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { AppLogger } from '../../../shared/logger/logger.service';

// Notification gateway to send real-time socket alerts to connected users
@WebSocketGateway({
  cors:      { origin: '*' },
  namespace: '/',
})
export class PushNotificationGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new AppLogger();

  afterInit() {
    this.logger.info('PushNotificationGateway', 'Initialized ✅');
  }

  // ─── Helpers called from Services ────────────────────────────────────────

  /** Send a generic notification to a specific user's socket room */
  notify(userId: string, event: string, payload: Record<string, unknown>): void {
    this.server.to(`user:${userId}`).emit(event, {
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }

  /** Notify a user about a new friend request */
  notifyFriendRequest(targetUserId: string, request: Record<string, unknown>): void {
    this.notify(targetUserId, 'notification:friendRequest', {
      type:    'FRIEND_REQUEST',
      message: 'You have a new friend request',
      data:    request,
    });
  }

  /** Notify a user that their friend request was accepted */
  notifyFriendAccepted(targetUserId: string, friendship: Record<string, unknown>): void {
    this.notify(targetUserId, 'notification:friendAccepted', {
      type:    'FRIEND_ACCEPTED',
      message: 'Your friend request was accepted',
      data:    friendship,
    });
  }

  /** Notify a user about a new message when they're not in the conversation */
  notifyNewMessage(targetUserId: string, message: Record<string, unknown>): void {
    this.notify(targetUserId, 'notification:message', {
      type:    'NEW_MESSAGE',
      message: 'You have a new message',
      data:    message,
    });
  }

  // @future FCM integration:
  // async sendFcmPush(deviceToken: string, title: string, body: string): Promise<void> {
  //   await admin.messaging().send({ token: deviceToken, notification: { title, body } });
  // }
}
