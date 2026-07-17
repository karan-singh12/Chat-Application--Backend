import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminUserFilterDto, AdminTrafficFilterDto, AdminUpdateUserDto } from './dto/admin.dto';
import { MESSAGES } from '../../common/constants/messages.constant';
import { APP_CONSTANTS } from '../../common/constants/app.constant';
import { AppLogger } from '../../shared/logger/logger.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLogger,
  ) {}

  // ─── Dashboard Stats ───────────────────────────────────────────────────────

  async getDashboardStats() {
    const [
      totalUsers,
      onlineUsers,
      totalMessages,
      totalConversations,
      totalGroups,
      totalCalls,
      totalPosts,
      totalTrafficLogs,
      suspiciousTraffic,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isOnline: true } }),
      this.prisma.message.count({ where: { deletedAt: null } }),
      this.prisma.conversation.count(),
      this.prisma.groupConversation.count({ where: { isDeleted: false } }),
      this.prisma.callLog.count(),
      this.prisma.post.count(),
      this.prisma.trafficLog.count(),
      this.prisma.trafficLog.count({ where: { suspicious: true } }),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [newUsersToday, messagestoday] = await Promise.all([
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.prisma.message.count({ where: { sentAt: { gte: today }, deletedAt: null } }),
    ]);

    return {
      users: {
        total:        totalUsers,
        online:       onlineUsers,
        offline:      totalUsers - onlineUsers,
        newToday:     newUsersToday,
      },
      messages: {
        total:        totalMessages,
        today:        messagestoday,
      },
      conversations: { total: totalConversations },
      groups:        { total: totalGroups },
      calls:         { total: totalCalls },
      posts:         { total: totalPosts },
      security: {
        totalRequests:    totalTrafficLogs,
        suspiciousAlerts: suspiciousTraffic,
      },
    };
  }

  // ─── User Management ──────────────────────────────────────────────────────

  async getUsers(filter: AdminUserFilterDto) {
    const page  = filter.page  ?? 1;
    const limit = Math.min(filter.limit ?? APP_CONSTANTS.pagination.adminLimit, APP_CONSTANTS.pagination.maxLimit);
    const skip  = (page - 1) * limit;

    const where: any = {};

    if (filter.search) {
      where.OR = [
        { email:    { contains: filter.search, mode: 'insensitive' } },
        { username: { contains: filter.search, mode: 'insensitive' } },
      ];
    }
    if (filter.role)     where.role     = filter.role;
    if (filter.isOnline !== undefined) where.isOnline = filter.isOnline;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id:        true,
          email:     true,
          username:  true,
          role:      true,
          isOnline:  true,
          lastSeen:  true,
          createdAt: true,
          avatar:    true,
          _count: {
            select: {
              sentMessages:     true,
              groupMemberships: true,
              posts:            true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext:    page < Math.ceil(total / limit),
        hasPrev:    page > 1,
      },
    };
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id:        true,
        email:     true,
        username:  true,
        role:      true,
        isOnline:  true,
        lastSeen:  true,
        createdAt: true,
        updatedAt: true,
        avatar:    true,
        bio:       true,
        phone:     true,
        location:  true,
        _count: {
          select: {
            sentMessages:     true,
            groupMemberships: true,
            posts:            true,
            sentCallLogs:     true,
            receivedCallLogs: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException(MESSAGES.admin.userNotFound);
    return user;
  }

  async updateUser(userId: string, dto: AdminUpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(MESSAGES.admin.userNotFound);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data:  { role: dto.role as any },
      select: {
        id:    true,
        email: true,
        role:  true,
      },
    });

    this.logger.info('AdminService', 'User role updated', { userId, newRole: dto.role });
    return updated;
  }

  // ─── Traffic Logs ─────────────────────────────────────────────────────────

  async getTrafficLogs(filter: AdminTrafficFilterDto) {
    const page  = filter.page  ?? 1;
    const limit = Math.min(filter.limit ?? APP_CONSTANTS.pagination.adminLimit, APP_CONSTANTS.pagination.maxLimit);
    const skip  = (page - 1) * limit;

    const where: any = {};

    if (filter.suspicious !== undefined) where.suspicious = filter.suspicious;
    if (filter.ip)                       where.ip = { contains: filter.ip };
    if (filter.dateFrom || filter.dateTo) {
      where.timestamp = {};
      if (filter.dateFrom) where.timestamp.gte = new Date(filter.dateFrom);
      if (filter.dateTo)   where.timestamp.lte = new Date(filter.dateTo);
    }

    const [logs, total] = await Promise.all([
      this.prisma.trafficLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.trafficLog.count({ where }),
    ]);

    return {
      logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext:    page < Math.ceil(total / limit),
        hasPrev:    page > 1,
      },
    };
  }

  async getSuspiciousTraffic(filter: AdminTrafficFilterDto) {
    return this.getTrafficLogs({ ...filter, suspicious: true });
  }
}
