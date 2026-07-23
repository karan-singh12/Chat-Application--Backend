import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { UseGuards } from "@nestjs/common";
import { WsJwtGuard } from "../guards/ws-jwt.guard";
import { ChatService } from "../service/chat.service";
import { SendMessageDto, TypingDto, ReadReceiptDto } from "../dto";
import { RedisService } from "../../cache/redis.service";

@WebSocketGateway({
  cors: { origin: "*" },
  namespace: "/",
})
@UseGuards(WsJwtGuard)
export class ChatGateway implements OnGatewayInit, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Track active typing timeouts: "roomId:userId" -> Timeout
  private typingTimeouts = new Map<string, NodeJS.Timeout>();

  // Fallback in-memory rate limiting map (used when Redis is offline)
  private localRateLimits = new Map<string, { count: number; windowStart: number }>();

  // Track active live streams: "broadcasterId" -> Stream details
  private activeStreams = new Map<string, {
    broadcasterId: string;
    socketId: string;
    username: string;
    avatar: string | null;
    title: string;
    startedAt: string;
    viewers: string[];
  }>();

  constructor(
    private readonly chatService: ChatService,
    private readonly redisService: RedisService,
  ) {}

  afterInit() {
    console.log("✅ ChatGateway initialized.");
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (!userId) return;

    // Check if the user is a broadcaster
    const stream = this.activeStreams.get(userId);
    if (stream && stream.socketId === client.id) {
      this.activeStreams.delete(userId);
      this.server.to(`live:${userId}`).emit("liveStreamEnded", { broadcasterId: userId });
      this.server.emit("liveStreamStopped", { broadcasterId: userId });
      console.log(`[WS-Live] Stream by broadcaster ${userId} automatically ended due to disconnect.`);
    }

    // Check if the user is a viewer in any stream
    for (const [broadcasterId, activeStream] of this.activeStreams.entries()) {
      if (activeStream.viewers.includes(userId)) {
        activeStream.viewers = activeStream.viewers.filter((id) => id !== userId);
        this.server.to(`user:${broadcasterId}`).emit("liveViewerLeft", { viewerId: userId });
        this.server.to(`live:${broadcasterId}`).emit("liveViewerCount", {
          broadcasterId,
          count: activeStream.viewers.length,
        });
      }
    }
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

    // Rate Limiting (20 messages / 10 seconds) — shared via Redis, local fallback
    if (await this.isRateLimited(userId, 20, 10000)) {
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
      // Use the conversation userIds already embedded in the saved message (no extra DB query)
      if (dto.conversationId && saved.conversation) {
        this.server.to(`user:${saved.conversation.userAId}`).emit("receiveMessage", saved);
        this.server.to(`user:${saved.conversation.userBId}`).emit("receiveMessage", saved);
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

  // ─── Live Streaming Broadcast & Signaling ───────────────────────────────────

  @SubscribeMessage("goLive")
  async handleGoLive(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { title?: string }
  ) {
    const userId = client.data.userId;
    try {
      const user = await this.chatService.prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, avatar: true },
      });

      const title = data.title?.trim() || `${user?.username || "User"}'s Live Stream`;
      const stream = {
        broadcasterId: userId,
        socketId: client.id,
        username: user?.username || "Broadcaster",
        avatar: user?.avatar || null,
        title,
        startedAt: new Date().toISOString(),
        viewers: [],
      };

      this.activeStreams.set(userId, stream);
      client.join(`live:${userId}`);

      // Broadcast globally that a stream has started
      this.server.emit("liveStreamStarted", stream);
      client.emit("goLiveSuccess", stream);
      console.log(`[WS-Live] User ${userId} is now LIVE: "${title}"`);
    } catch (err) {
      client.emit("error", { success: false, message: "Failed to go live" });
    }
  }

  @SubscribeMessage("stopLiveStream")
  handleStopLiveStream(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    const stream = this.activeStreams.get(userId);
    if (stream) {
      this.activeStreams.delete(userId);
      this.server.to(`live:${userId}`).emit("liveStreamEnded", { broadcasterId: userId });
      this.server.emit("liveStreamStopped", { broadcasterId: userId });
      console.log(`[WS-Live] Stream by broadcaster ${userId} stopped.`);
    }
  }

  @SubscribeMessage("getActiveStreams")
  handleGetActiveStreams(@ConnectedSocket() client: Socket) {
    client.emit("activeStreamsList", Array.from(this.activeStreams.values()));
  }

  @SubscribeMessage("joinLiveStream")
  async handleJoinLiveStream(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { broadcasterId: string }
  ) {
    const userId = client.data.userId;
    const stream = this.activeStreams.get(data.broadcasterId);
    if (!stream) {
      client.emit("error", { message: "Stream not found or already ended" });
      return;
    }

    client.join(`live:${data.broadcasterId}`);
    if (!stream.viewers.includes(userId)) {
      stream.viewers.push(userId);
    }

    const viewer = await this.chatService.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, avatar: true },
    });

    this.server.to(`user:${data.broadcasterId}`).emit("liveViewerJoined", {
      viewerId: userId,
      username: viewer?.username || "Viewer",
      avatar: viewer?.avatar || null,
    });

    this.server.to(`live:${data.broadcasterId}`).emit("liveViewerCount", {
      broadcasterId: data.broadcasterId,
      count: stream.viewers.length,
    });
  }

  @SubscribeMessage("leaveLiveStream")
  handleLeaveLiveStream(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { broadcasterId: string }
  ) {
    const userId = client.data.userId;
    client.leave(`live:${data.broadcasterId}`);

    const stream = this.activeStreams.get(data.broadcasterId);
    if (stream) {
      stream.viewers = stream.viewers.filter((id) => id !== userId);
      this.server.to(`user:${data.broadcasterId}`).emit("liveViewerLeft", { viewerId: userId });
      this.server.to(`live:${data.broadcasterId}`).emit("liveViewerCount", {
        broadcasterId: data.broadcasterId,
        count: stream.viewers.length,
      });
    }
  }

  @SubscribeMessage("liveOffer")
  handleLiveOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetUserId: string; offer: any }
  ) {
    const fromBroadcasterId = client.data.userId;
    this.server.to(`user:${data.targetUserId}`).emit("liveOffer", {
      fromBroadcasterId,
      offer: data.offer,
    });
  }

  @SubscribeMessage("liveAnswer")
  handleLiveAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetUserId: string; answer: any }
  ) {
    const fromViewerId = client.data.userId;
    this.server.to(`user:${data.targetUserId}`).emit("liveAnswer", {
      fromViewerId,
      answer: data.answer,
    });
  }

  @SubscribeMessage("liveIceCandidate")
  handleLiveIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetUserId: string; candidate: any }
  ) {
    this.server.to(`user:${data.targetUserId}`).emit("liveIceCandidate", {
      candidate: data.candidate,
      fromUserId: client.data.userId,
    });
  }

  // ─── Rate Limiter Helper ──────────────────────────────────────────────────
  // Uses Redis INCR/EXPIRE for a shared sliding-window counter across all
  // server instances. Falls back to the local in-memory Map if Redis is offline.

  private async isRateLimited(
    userId: string,
    maxRequests: number,
    timeWindowMs: number,
  ): Promise<boolean> {
    const windowSec = Math.ceil(timeWindowMs / 1000);
    const key = `ws_rate:${userId}`;

    try {
      const redisClient = this.redisService.getClient();

      if (redisClient.status === "ready") {
        // Atomic increment — returns new count
        const count = await redisClient.incr(key);
        if (count === 1) {
          // First request in this window — set the TTL
          await redisClient.expire(key, windowSec);
        }
        return count > maxRequests;
      }
    } catch {
      // Redis error: fall through to local fallback
    }

    // ── Local in-memory fallback ──────────────────────────────────────────
    const now = Date.now();
    const limitInfo = this.localRateLimits.get(userId);

    if (!limitInfo) {
      this.localRateLimits.set(userId, { count: 1, windowStart: now });
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

