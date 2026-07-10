import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from "@nestjs/websockets";
import { Server } from "socket.io";

@WebSocketGateway({
  cors: { origin: "*" },
  namespace: "/",
})
export class NotificationGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  afterInit() {
    console.log("✅ NotificationGateway initialized.");
  }

  // Helper method to send targeted events
  sendNotification(userId: string, event: string, payload: any) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }
}
