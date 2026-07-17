import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FriendshipStatus } from '@prisma/client';
import { MESSAGES } from '../../common/constants/messages.constant';
import { APP_CONSTANTS } from '../../common/constants/app.constant';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}


  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(MESSAGES.user.profileNotFound);
    }

    const { password, ...result } = user;
    return result;
  }

  async getPublicProfile(idOrUsername: string) {
    let user = await this.prisma.user.findUnique({
      where: { id: idOrUsername },
    });

    if (!user) {
      user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { username: idOrUsername },
            { email: idOrUsername.toLowerCase() },
          ],
        },
      });
    }

    if (!user) {
      throw new NotFoundException(MESSAGES.user.profileNotFound);
    }

    const { password, ...result } = user;
    return result;
  }

  async updateProfile(
    userId: string,
    updateData: { username?: string; bio?: string; phone?: string; location?: string; avatar?: string }
  ) {
    if (updateData.username) {
      const existingUser = await this.prisma.user.findUnique({
        where: { username: updateData.username },
      });
      if (existingUser && existingUser.id !== userId) {
        throw new BadRequestException(MESSAGES.user.usernameTaken);
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    const { password, ...result } = updatedUser;
    return result;
  }

  async sendFriendRequest(senderId: string, targetIdentifier: string) {
    if (!targetIdentifier) {
      throw new BadRequestException("Target identifier is required");
    }

    // Find target user by username or email
    const targetUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: targetIdentifier.toLowerCase() },
          { username: targetIdentifier },
        ],
      },
    });

    if (!targetUser) {
      throw new NotFoundException(MESSAGES.user.notFound);
    }

    if (targetUser.id === senderId) {
      throw new BadRequestException(MESSAGES.user.cannotAddSelf);
    }

    // Find sender info to send in notification payload
    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      select: { id: true, email: true, username: true, avatar: true },
    });

    // Check if friendship relationship already exists in either direction
    const existingFriendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: senderId, receiverId: targetUser.id },
          { senderId: targetUser.id, receiverId: senderId },
        ],
      },
    });

    if (existingFriendship) {
      if (existingFriendship.status === FriendshipStatus.ACCEPTED) {
        throw new BadRequestException(MESSAGES.friendship.alreadyFriends);
      } else if (existingFriendship.status === FriendshipStatus.PENDING) {
        if (existingFriendship.senderId === senderId) {
          throw new BadRequestException(MESSAGES.friendship.pendingRequest);
        } else {
          // If the other user already sent a request, accept it automatically!
          const updated = await this.prisma.friendship.update({
            where: { id: existingFriendship.id },
            data: { status: FriendshipStatus.ACCEPTED },
          });

          // Dispatch notification that request was accepted
          if (sender) {
            await this.notificationsService.sendFriendAcceptedNotification(targetUser.id, {
              friendship: updated,
              friend: sender,
            });
          }

          const { password, ...result } = targetUser;
          return { friendship: updated, friend: result, accepted: true };
        }
      } else if (existingFriendship.status === FriendshipStatus.REJECTED) {
        // If it was rejected, we can reset it to PENDING
        const updated = await this.prisma.friendship.update({
          where: { id: existingFriendship.id },
          data: { senderId: senderId, receiverId: targetUser.id, status: FriendshipStatus.PENDING },
        });

        // Dispatch notification of new pending request
        if (sender) {
          await this.notificationsService.sendFriendRequestNotification(targetUser.id, {
            friendship: updated,
            sender,
          });
        }

        const { password, ...result } = targetUser;
        return { friendship: updated, friend: result, accepted: false };
      }
    }

    // Create new pending friendship
    const newFriendship = await this.prisma.friendship.create({
      data: {
        senderId: senderId,
        receiverId: targetUser.id,
        status: FriendshipStatus.PENDING,
      },
    });

    // Dispatch notification of new pending request
    if (sender) {
      await this.notificationsService.sendFriendRequestNotification(targetUser.id, {
        friendship: newFriendship,
        sender,
      });
    }

    const { password, ...result } = targetUser;
    return { friendship: newFriendship, friend: result, accepted: false };
  }

  async getFriendRequests(userId: string, type: 'received' | 'sent' | 'all' = 'all') {
    const whereClause: any = {};

    if (type === 'received') {
      whereClause.receiverId = userId;
      whereClause.status = FriendshipStatus.PENDING;
    } else if (type === 'sent') {
      whereClause.senderId = userId;
      whereClause.status = FriendshipStatus.PENDING;
    } else {
      whereClause.OR = [
        { senderId: userId },
        { receiverId: userId },
      ];
      whereClause.status = FriendshipStatus.PENDING;
    }

    const requests = await this.prisma.friendship.findMany({
      where: whereClause,
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            username: true,
            avatar: true,
            bio: true,
          },
        },
        receiver: {
          select: {
            id: true,
            email: true,
            username: true,
            avatar: true,
            bio: true,
          },
        },
      },
    });

    return requests;
  }

  async respondToFriendRequest(userId: string, friendshipId: string, status: FriendshipStatus) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new NotFoundException(MESSAGES.friendship.notFound);
    }

    // Only the receiver can accept or decline a pending request
    if (friendship.receiverId !== userId) {
      throw new BadRequestException(MESSAGES.friendship.notReceiver);
    }

    if (friendship.status !== FriendshipStatus.PENDING) {
      throw new BadRequestException(MESSAGES.friendship.alreadyHandled);
    }

    const updatedFriendship = await this.prisma.friendship.update({
      where: { id: friendshipId },
      data: { status },
    });

    if (status === FriendshipStatus.ACCEPTED) {
      // Find receiver info to send in notification
      const receiver = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, username: true, avatar: true },
      });

      if (receiver) {
        // Notify original sender that their request was accepted
        await this.notificationsService.sendFriendAcceptedNotification(friendship.senderId, {
          friendship: updatedFriendship,
          friend: receiver,
        });
      }
    }

    return updatedFriendship;
  }

  async getFriendsList(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [
          { senderId: userId },
          { receiverId: userId },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            username: true,
            avatar: true,
            bio: true,
            location: true,
            phone: true,
          },
        },
        receiver: {
          select: {
            id: true,
            email: true,
            username: true,
            avatar: true,
            bio: true,
            location: true,
            phone: true,
          },
        },
      },
    });

    // Map friendships to friend objects (excluding current user)
    return friendships.map((f) => {
      const friend = f.senderId === userId ? f.receiver : f.sender;
      return {
        friendshipId: f.id,
        senderId: f.senderId,
        receiverId: f.receiverId,
        updatedAt: f.updatedAt,
        ...friend,
      };
    });
  }

  async removeFriend(userId: string, friendId: string) {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [
          { senderId: userId, receiverId: friendId },
          { senderId: friendId, receiverId: userId },
        ],
      },
    });

    if (!friendship) {
      throw new NotFoundException(MESSAGES.friendship.friendNotFound);
    }

    await this.prisma.friendship.delete({
      where: { id: friendship.id },
    });

    return { success: true, message: "Friend removed successfully" };
  }

  async getFriendSuggestions(userId: string) {
    // Find IDs of users who are already friends or have pending requests
    const existingFriendships = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId },
        ],
      },
      select: {
        senderId: true,
        receiverId: true,
      },
    });

    const excludedUserIds = new Set<string>();
    excludedUserIds.add(userId);
    existingFriendships.forEach((f) => {
      excludedUserIds.add(f.senderId);
      excludedUserIds.add(f.receiverId);
    });

    // Find all users not in the excluded set
    const suggestions = await this.prisma.user.findMany({
      where: {
        id: {
          notIn: Array.from(excludedUserIds),
        },
      },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        bio: true,
      },
      take: APP_CONSTANTS.friends.suggestionsLimit,
    });

    return suggestions.map((sug) => ({
      id: sug.id,
      name: sug.username || sug.email.split("@")[0],
      avatar: sug.avatar,
      detail: sug.bio || "NexusChat Member",
      added: false,
    }));
  }
}
