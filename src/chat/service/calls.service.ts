import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ChatGateway } from "../gateway/chat.gateway";

@Injectable()
export class CallsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
  ) {}

  async createCallLog(
    callerId: string,
    data: { receiverId: string; status: string; video: boolean; duration: number }
  ) {
    const callLog = await this.prisma.callLog.create({
      data: {
        callerId,
        receiverId: data.receiverId,
        status: data.status,
        video: data.video,
        duration: data.duration,
      },
    });

    try {
      // Find or create conversation for the DM chat call log
      const [minId, maxId] = [callerId, data.receiverId].sort();
      let conversation = await this.prisma.conversation.findUnique({
        where: { userAId_userBId: { userAId: minId, userBId: maxId } },
      });

      if (!conversation) {
        conversation = await this.prisma.conversation.create({
          data: { userAId: minId, userBId: maxId },
        });
      }

      // Format a user-friendly system message for the chat bubble
      const callTypeWord = data.video ? "Video call" : "Voice call";
      let content = "";
      if (data.status === "completed") {
        const minutes = Math.floor(data.duration / 60);
        const seconds = data.duration % 60;
        const durationText = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
        content = `${callTypeWord} ended (${durationText})`;
      } else if (data.status === "missed") {
        content = `Missed ${callTypeWord.toLowerCase()}`;
      } else if (data.status === "rejected") {
        content = `Declined ${callTypeWord.toLowerCase()}`;
      }

      // Create message in conversation
      const message = await this.prisma.message.create({
        data: {
          senderId: callerId,
          conversationId: conversation.id,
          content,
          metadata: {
            type: "call",
            callStatus: data.status,
            video: data.video,
            duration: data.duration,
          },
        },
        include: {
          sender: { select: { id: true, username: true, email: true, avatar: true } },
        },
      });

      // Update conversation's last message info
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: message.sentAt,
          lastMessageId: message.id,
          isDeletedA: false,
          isDeletedB: false,
        },
      });

      // Broadcast new message in real-time through ChatGateway
      if (this.chatGateway && this.chatGateway.server) {
        const room = `conversation:${conversation.id}`;
        this.chatGateway.server.to(room).emit("receiveMessage", message);
        this.chatGateway.server.to(`user:${conversation.userAId}`).emit("receiveMessage", message);
        this.chatGateway.server.to(`user:${conversation.userBId}`).emit("receiveMessage", message);
      }
    } catch (msgErr) {
      console.error("Failed to append call log message to conversation:", msgErr);
    }

    return callLog;
  }

  async getCallHistory(userId: string) {
    const logs = await this.prisma.callLog.findMany({
      where: {
        OR: [
          { callerId: userId },
          { receiverId: userId },
        ],
      },
      include: {
        caller: {
          select: {
            id: true,
            username: true,
            avatar: true,
            email: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            avatar: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform logs to match the frontend expectations
    return logs.map((log) => {
      const isCaller = log.callerId === userId;
      const otherUser = isCaller ? log.receiver : log.caller;
      const otherName = otherUser.username || otherUser.email.split("@")[0];

      return {
        id: log.id,
        userId: otherUser.id,
        name: otherName,
        avatar: otherUser.avatar || null,
        type: isCaller ? "outgoing" : "incoming",
        status: log.status,
        timestamp: log.createdAt.toISOString(),
        duration: log.duration,
        video: log.video,
      };
    });
  }

  async clearCallHistory(userId: string) {
    return this.prisma.callLog.deleteMany({
      where: {
        OR: [
          { callerId: userId },
          { receiverId: userId },
        ],
      },
    });
  }
}
