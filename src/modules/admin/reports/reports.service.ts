import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a comprehensive summary report of user registration, messages, and call activities.
   */
  async getUserActivityReport() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            sentMessages: true,
            posts: true,
            sentCallLogs: true,
            receivedCallLogs: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format output
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      username: user.username || 'N/A',
      role: user.role,
      joinedAt: user.createdAt.toISOString(),
      messagesSent: user._count.sentMessages,
      postsCreated: user._count.posts,
      callsInitiated: user._count.sentCallLogs,
      callsReceived: user._count.receivedCallLogs,
      totalCalls: user._count.sentCallLogs + user._count.receivedCallLogs,
    }));
  }

  /**
   * Generates a message activity report grouped by conversation rooms.
   */
  async getChatActivityReport() {
    const conversations = await this.prisma.conversation.findMany({
      include: {
        userA: { select: { email: true, username: true } },
        userB: { select: { email: true, username: true } },
        _count: { select: { messages: true } },
      },
    });

    const groupConversations = await this.prisma.groupConversation.findMany({
      where: { isDeleted: false },
      include: {
        creator: { select: { email: true, username: true } },
        _count: {
          select: {
            members: true,
            messages: true,
          },
        },
      },
    });

    const dmReports = conversations.map((conv) => ({
      id: conv.id,
      type: 'DirectMessage',
      label: `${conv.userA.username || conv.userA.email} <-> ${conv.userB.username || conv.userB.email}`,
      messageCount: conv._count.messages,
      createdAt: conv.createdAt.toISOString(),
    }));

    const groupReports = groupConversations.map((group) => ({
      id: group.id,
      type: 'Group',
      label: group.name,
      creator: group.creator?.username || group.creator?.email || 'N/A',
      memberCount: group._count.members,
      messageCount: group._count.messages,
      createdAt: group.createdAt.toISOString(),
    }));

    return [...dmReports, ...groupReports];
  }

  /**
   * Generates a security and system traffic analytics summary report.
   */
  async getSystemTrafficReport() {
    const logs = await this.prisma.trafficLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 1000, // Limit report to last 1000 requests
    });

    // Aggregate statistics
    const totalRequests = logs.length;
    const suspiciousRequests = logs.filter(l => l.suspicious).length;
    
    // Group by status codes
    const statusCodes: Record<number, number> = {};
    // Group by request methods
    const methods: Record<string, number> = {};
    // Group by IP
    const ipCounts: Record<string, number> = {};

    logs.forEach((log) => {
      statusCodes[log.statusCode] = (statusCodes[log.statusCode] || 0) + 1;
      methods[log.method] = (methods[log.method] || 0) + 1;
      ipCounts[log.ip] = (ipCounts[log.ip] || 0) + 1;
    });

    // Get top 5 active IPs
    const topIps = Object.entries(ipCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([ip, count]) => ({ ip, count }));

    return {
      totalRequestsAnalyzed: totalRequests,
      suspiciousRequestCount: suspiciousRequests,
      suspiciousRatio: totalRequests > 0 ? (suspiciousRequests / totalRequests).toFixed(4) : '0',
      statusCodes,
      methods,
      topActiveIps: topIps,
    };
  }
}
