import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class CallsService {
  constructor(private readonly prisma: PrismaService) {}

  async createCallLog(
    callerId: string,
    data: { receiverId: string; status: string; video: boolean; duration: number }
  ) {
    return this.prisma.callLog.create({
      data: {
        callerId,
        receiverId: data.receiverId,
        status: data.status,
        video: data.video,
        duration: data.duration,
      },
    });
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
