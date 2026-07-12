import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { UseGuards } from "@nestjs/common";
import { WsJwtGuard } from "../guards/ws-jwt.guard";
import { ChatService } from "../service/chat.service";
import { SendMessageDto, TypingDto, ReadReceiptDto } from "../dto";

@WebSocketGateway({
  cors: { origin: "*" },
  namespace: "/",
})
@UseGuards(WsJwtGuard)
export class ChatGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  // Track active typing timeouts: "roomId:userId" -> Timeout
  private typingTimeouts = new Map<string, NodeJS.Timeout>();

  // In-memory rate limiting map: "userId" -> { count, windowStart }
  private rateLimits = new Map<string, { count: number; windowStart: number }>();

  constructor(private readonly chatService: ChatService) {}

  afterInit() {
    console.log("✅ ChatGateway initialized.");
  }

  // ─── Room Management ────────────────────────────────────────────────────────

  @SubscribeMessage("joinConversation")
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string }
  ) {
    if (!data.conversationId) return;
    const roomName = `conversation:${data.conversationId}`;
    client.join(roomName);
    console.log(`[WS-Chat] Socket ${client.id} joined room ${roomName}`);
  }

  @SubscribeMessage("leaveConversation")
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string }
  ) {
    if (!data.conversationId) return;
    const roomName = `conversation:${data.conversationId}`;
    client.leave(roomName);
    console.log(`[WS-Chat] Socket ${client.id} left room ${roomName}`);
  }

  @SubscribeMessage("joinGroup")
  handleJoinGroup(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string }
  ) {
    if (!data.groupId) return;
    const roomName = `group:${data.groupId}`;
    client.join(roomName);
    console.log(`[WS-Chat] Socket ${client.id} joined room ${roomName}`);
  }

  @SubscribeMessage("leaveGroup")
  handleLeaveGroup(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string }
  ) {
    if (!data.groupId) return;
    const roomName = `group:${data.groupId}`;
    client.leave(roomName);
    console.log(`[WS-Chat] Socket ${client.id} left room ${roomName}`);
  }

  // ─── Messaging ──────────────────────────────────────────────────────────────

  @SubscribeMessage("sendMessage")
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto
  ) {
    const userId = client.data.userId;

    // Rate Limiting (20 messages / 10 seconds)
    if (this.isRateLimited(userId, 20, 10000)) {
      client.emit("error", {
        success: false,
        code: "RATE_LIMIT_EXCEEDED",
        message: "You are sending messages too fast. Please slow down.",
      });
      return;
    }

    try {
      const saved = await this.chatService.sendMessage(userId, dto);
      const room = dto.conversationId
        ? `conversation:${dto.conversationId}`
        : `group:${dto.groupId}`;

      // Broadcast new message to the room
      this.server.to(room).emit("receiveMessage", saved);

      // Also push to personal user rooms for real-time sidebar updates
      if (dto.conversationId) {
        const conv = await this.chatService.prisma.conversation.findUnique({
          where: { id: dto.conversationId },
          select: { userAId: true, userBId: true },
        });
        if (conv) {
          this.server.to(`user:${conv.userAId}`).emit("receiveMessage", saved);
          this.server.to(`user:${conv.userBId}`).emit("receiveMessage", saved);
        }
      } else if (dto.groupId) {
        const groupMembers = await this.chatService.prisma.groupMember.findMany({
          where: { groupId: dto.groupId },
          select: { userId: true },
        });
        groupMembers.forEach((member) => {
          this.server.to(`user:${member.userId}`).emit("receiveMessage", saved);
        });
      }
    } catch (err) {
      client.emit("error", {
        success: false,
        message: err.message || "Failed to send message",
        code: err.response?.code || "MESSAGE_ERROR",
      });
    }
  }

  @SubscribeMessage("editMessage")
  async handleEditMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; content: string }
  ) {
    const userId = client.data.userId;
    try {
      const updated = await this.chatService.editMessage(data.messageId, userId, data.content);
      const room = updated.conversationId
        ? `conversation:${updated.conversationId}`
        : `group:${updated.groupId}`;

      this.server.to(room).emit("messageEdited", updated);
    } catch (err) {
      client.emit("error", { success: false, message: err.message });
    }
  }

  @SubscribeMessage("deleteMessage")
  async handleDeleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string }
  ) {
    const userId = client.data.userId;
    try {
      const deleted = await this.chatService.deleteMessage(data.messageId, userId);
      const room = deleted.conversationId
        ? `conversation:${deleted.conversationId}`
        : `group:${deleted.groupId}`;

      this.server.to(room).emit("messageDeleted", { messageId: data.messageId });
    } catch (err) {
      client.emit("error", { success: false, message: err.message });
    }
  }

  // ─── Typing Indicators ───────────────────────────────────────────────────────

  @SubscribeMessage("typingStart")
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId?: string; groupId?: string }
  ) {
    const userId = client.data.userId;
    const roomId = data.conversationId ? data.conversationId : data.groupId;
    if (!roomId) return;

    const roomName = data.conversationId
      ? `conversation:${data.conversationId}`
      : `group:${data.groupId}`;

    const timeoutKey = `${roomId}:${userId}`;

    // Clear existing timeout if any
    if (this.typingTimeouts.has(timeoutKey)) {
      clearTimeout(this.typingTimeouts.get(timeoutKey));
    }

    // Broadcast typing start
    client.to(roomName).emit("typingStart", { userId, conversationId: data.conversationId, groupId: data.groupId });

    // Set auto-expire timeout (4 seconds)
    const timeout = setTimeout(() => {
      this.typingTimeouts.delete(timeoutKey);
      client.to(roomName).emit("typingStop", { userId, conversationId: data.conversationId, groupId: data.groupId });
    }, 4000);

    this.typingTimeouts.set(timeoutKey, timeout);
  }

  @SubscribeMessage("typingStop")
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId?: string; groupId?: string }
  ) {
    const userId = client.data.userId;
    const roomId = data.conversationId ? data.conversationId : data.groupId;
    if (!roomId) return;

    const roomName = data.conversationId
      ? `conversation:${data.conversationId}`
      : `group:${data.groupId}`;

    const timeoutKey = `${roomId}:${userId}`;

    if (this.typingTimeouts.has(timeoutKey)) {
      clearTimeout(this.typingTimeouts.get(timeoutKey));
      this.typingTimeouts.delete(timeoutKey);
    }

    client.to(roomName).emit("typingStop", { userId, conversationId: data.conversationId, groupId: data.groupId });
  }

  // ─── Receipts ──────────────────────────────────────────────────────────────

  @SubscribeMessage("messageRead")
  async handleMessageRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: ReadReceiptDto
  ) {
    const userId = client.data.userId;
    try {
      const receipt = await this.chatService.markAsRead(dto.messageId, userId);
      const msg = await this.chatService.prisma.message.findUnique({
        where: { id: dto.messageId },
      });
      if (msg) {
        const room = msg.conversationId
          ? `conversation:${msg.conversationId}`
          : `group:${msg.groupId}`;

        this.server.to(room).emit("messageRead", {
          messageId: dto.messageId,
          userId,
          readAt: receipt.readAt,
        });
      }
    } catch (err) {
      // Fail silently for receipts to keep UI uninterrupted
    }
  }

  @SubscribeMessage("messageDelivered")
  async handleMessageDelivered(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: { messageId: string }
  ) {
    const userId = client.data.userId;
    try {
      const receipt = await this.chatService.markAsDelivered(dto.messageId, userId);
      const msg = await this.chatService.prisma.message.findUnique({
        where: { id: dto.messageId },
      });
      if (msg) {
        const room = msg.conversationId
          ? `conversation:${msg.conversationId}`
          : `group:${msg.groupId}`;

        this.server.to(room).emit("messageDelivered", {
          messageId: dto.messageId,
          userId,
          deliveredAt: receipt.deliveredAt,
        });
      }
    } catch (err) {
      // Fail silently
    }
  }

  // ─── WebRTC Signaling ───────────────────────────────────────────────────────

  @SubscribeMessage("call_offer")
  handleCallOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetUserId: string; offer: any; callType: string }
  ) {
    const fromUserId = client.data.userId;
    this.server.to(`user:${data.targetUserId}`).emit("incoming_call", {
      fromUserId,
      offer: data.offer,
      callType: data.callType,
    });
  }

  @SubscribeMessage("call_answer")
  handleCallAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetUserId: string; answer: any }
  ) {
    this.server.to(`user:${data.targetUserId}`).emit("call_answered", {
      answer: data.answer,
    });
  }

  @SubscribeMessage("ice_candidate")
  handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetUserId: string; candidate: any }
  ) {
    this.server.to(`user:${data.targetUserId}`).emit("ice_candidate", {
      candidate: data.candidate,
    });
  }

  @SubscribeMessage("call_rejected")
  handleCallRejected(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetUserId: string }
  ) {
    this.server.to(`user:${data.targetUserId}`).emit("call_rejected");
  }

  @SubscribeMessage("call_ended")
  handleCallEnded(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetUserId: string }
  ) {
    this.server.to(`user:${data.targetUserId}`).emit("call_ended");
  }

  @SubscribeMessage("friendRequest")
  handleFriendRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetUserId: string; request: any }
  ) {
    this.server.to(`user:${data.targetUserId}`).emit("friendRequest", data.request);
  }

  @SubscribeMessage("acceptFriendRequest")
  handleAcceptFriendRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetUserId: string; request: any }
  ) {
    this.server.to(`user:${data.targetUserId}`).emit("acceptFriendRequest", data.request);
  }

  // ─── Rate Limiter Helper ───

  private isRateLimited(userId: string, maxRequests: number, timeWindowMs: number): boolean {
    const now = Date.now();
    const limitInfo = this.rateLimits.get(userId);

    if (!limitInfo) {
      this.rateLimits.set(userId, { count: 1, windowStart: now });
      return false;
    }

    if (now - limitInfo.windowStart > timeWindowMs) {
      limitInfo.count = 1;
      limitInfo.windowStart = now;
      return false;
    }

    limitInfo.count++;
    return limitInfo.count > maxRequests;
  }
}
