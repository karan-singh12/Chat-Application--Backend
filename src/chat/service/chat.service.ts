import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { GroupRole, FriendshipStatus } from "@prisma/client";
import { SendMessageDto, CreateGroupDto, UpdateGroupDto } from "../dto";

@Injectable()
export class ChatService {
  constructor(public readonly prisma: PrismaService) {}

  // ─── One-to-One Conversations ──────────────────────────────────────────────

  /** Get or create a 1:1 conversation between two users */
  async getOrCreateConversation(userAId: string, userBId: string) {
    if (userAId === userBId) {
      throw new BadRequestException({
        success: false,
        code: "SELF_CONVERSATION",
        message: "You cannot start a conversation with yourself",
      });
    }

    // Verify both users exist
    const users = await this.prisma.user.findMany({
      where: { id: { in: [userAId, userBId] } },
    });
    if (users.length !== 2) {
      throw new NotFoundException({
        success: false,
        code: "USER_NOT_FOUND",
        message: "One or both users do not exist",
      });
    }

    const [minId, maxId] = [userAId, userBId].sort();

    let conversation = await this.prisma.conversation.findUnique({
      where: { userAId_userBId: { userAId: minId, userBId: maxId } },
      include: {
        userA: { select: { id: true, username: true, email: true, avatar: true, isOnline: true } },
        userB: { select: { id: true, username: true, email: true, avatar: true, isOnline: true } },
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: { userAId: minId, userBId: maxId },
        include: {
          userA: { select: { id: true, username: true, email: true, avatar: true, isOnline: true } },
          userB: { select: { id: true, username: true, email: true, avatar: true, isOnline: true } },
        },
      });
    }

    // Reset deleted flags if it was previously soft deleted
    const isUserA = conversation.userAId === userAId;
    if ((isUserA && conversation.isDeletedA) || (!isUserA && conversation.isDeletedB)) {
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          isDeletedA: isUserA ? false : conversation.isDeletedA,
          isDeletedB: !isUserA ? false : conversation.isDeletedB,
        },
      });
    }

    return conversation;
  }

  /** Get conversation details by id, verifying participation */
  async getConversationById(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        userA: { select: { id: true, username: true, email: true, avatar: true, isOnline: true, lastSeen: true } },
        userB: { select: { id: true, username: true, email: true, avatar: true, isOnline: true, lastSeen: true } },
      },
    });

    if (!conversation) {
      throw new NotFoundException({
        success: false,
        code: "CONVERSATION_NOT_FOUND",
        message: "Conversation not found",
      });
    }

    if (conversation.userAId !== userId && conversation.userBId !== userId) {
      throw new ForbiddenException({
        success: false,
        code: "NOT_A_PARTICIPANT",
        message: "You are not a participant in this conversation",
      });
    }

    const isUserA = conversation.userAId === userId;
    if (isUserA ? conversation.isDeletedA : conversation.isDeletedB) {
      throw new NotFoundException({
        success: false,
        code: "CONVERSATION_DELETED",
        message: "Conversation has been deleted",
      });
    }

    return conversation;
  }

  /** Get user's conversation list (sidebar), sorted by lastMessageAt */
  async getUserConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [
          { userAId: userId, isDeletedA: false },
          { userBId: userId, isDeletedB: false },
        ],
      },
      include: {
        userA: { select: { id: true, username: true, email: true, avatar: true, isOnline: true } },
        userB: { select: { id: true, username: true, email: true, avatar: true, isOnline: true } },
        messages: {
          orderBy: { sentAt: "desc" },
          take: 1,
          where: { deletedAt: null },
        },
      },
      orderBy: { lastMessageAt: "desc" },
    });

    return conversations.map((conv) => {
      const isUserA = conv.userAId === userId;
      const otherUser = isUserA ? conv.userB : conv.userA;
      const lastMsg = conv.messages[0];
      return {
        id: `conv_${conv.id}`,
        conversationId: conv.id,
        type: "dm" as const,
        name: otherUser.username || otherUser.email.split("@")[0],
        avatar: otherUser.avatar || null,
        otherId: otherUser.id,
        lastMessage: lastMsg?.content || "",
        lastMessageAt: lastMsg?.sentAt || conv.lastMessageAt || conv.createdAt,
        online: otherUser.isOnline,
        isMuted: isUserA ? conv.isMutedA : conv.isMutedB,
        isPinned: isUserA ? conv.isPinnedA : conv.isPinnedB,
        isArchived: isUserA ? conv.isArchivedA : conv.isArchivedB,
      };
    });
  }

  /** Soft delete conversation for a specific user */
  async deleteConversation(conversationId: string, userId: string) {
    const conv = await this.getConversationById(conversationId, userId);
    const isUserA = conv.userAId === userId;

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        isDeletedA: isUserA ? true : conv.isDeletedA,
        isDeletedB: !isUserA ? true : conv.isDeletedB,
      },
    });

    return { success: true, message: "Conversation deleted successfully" };
  }

  /** Archive or unarchive conversation */
  async archiveConversation(conversationId: string, userId: string, isArchived: boolean) {
    const conv = await this.getConversationById(conversationId, userId);
    const isUserA = conv.userAId === userId;

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        isArchivedA: isUserA ? isArchived : conv.isArchivedA,
        isArchivedB: !isUserA ? isArchived : conv.isArchivedB,
      },
    });

    return { success: true, message: isArchived ? "Conversation archived" : "Conversation unarchived" };
  }

  /** Mute or unmute conversation */
  async muteConversation(conversationId: string, userId: string, isMuted: boolean) {
    const conv = await this.getConversationById(conversationId, userId);
    const isUserA = conv.userAId === userId;

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        isMutedA: isUserA ? isMuted : conv.isMutedA,
        isMutedB: !isUserA ? isMuted : conv.isMutedB,
      },
    });

    return { success: true, message: isMuted ? "Conversation muted" : "Conversation unmuted" };
  }

  /** Pin or unpin conversation */
  async pinConversation(conversationId: string, userId: string, isPinned: boolean) {
    const conv = await this.getConversationById(conversationId, userId);
    const isUserA = conv.userAId === userId;

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        isPinnedA: isUserA ? isPinned : conv.isPinnedA,
        isPinnedB: !isUserA ? isPinned : conv.isPinnedB,
      },
    });

    return { success: true, message: isPinned ? "Conversation pinned" : "Conversation unpinned" };
  }

  // ─── Group Conversations ────────────────────────────────────────────────────

  /** Create a group conversation, creator becomes ADMIN */
  async createGroup(creatorId: string, dto: CreateGroupDto) {
    const allMemberIds = Array.from(new Set([creatorId, ...dto.memberIds]));

    // Check if other members exist
    const users = await this.prisma.user.findMany({
      where: { id: { in: allMemberIds } },
    });
    if (users.length !== allMemberIds.length) {
      throw new NotFoundException({
        success: false,
        code: "MEMBERS_NOT_FOUND",
        message: "One or more members do not exist",
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const group = await tx.groupConversation.create({
        data: {
          name: dto.name,
          description: dto.description || null,
          avatar: dto.avatar || null,
          createdBy: creatorId,
          members: {
            create: allMemberIds.map((userId) => ({
              userId,
              role: userId === creatorId ? GroupRole.ADMIN : GroupRole.MEMBER,
            })),
          },
        },
        include: {
          members: {
            include: {
              user: { select: { id: true, username: true, email: true, avatar: true } },
            },
          },
        },
      });

      return group;
    });
  }

  /** Get user's groups, sorted by lastMessageAt */
  async getUserGroups(userId: string) {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId, group: { isDeleted: false } },
      include: {
        group: {
          include: {
            messages: {
              orderBy: { sentAt: "desc" },
              take: 1,
              where: { deletedAt: null },
            },
            members: {
              include: { user: { select: { id: true, username: true, email: true, avatar: true } } },
            },
          },
        },
      },
    });

    return memberships.map((m) => {
      const group = m.group;
      const lastMsg = group.messages[0];
      return {
        id: `group_${group.id}`,
        groupId: group.id,
        type: "group" as const,
        name: group.name,
        avatar: group.avatar || null,
        description: group.description || "",
        isArchived: group.isArchived,
        isMuted: m.mutedUntil ? m.mutedUntil.getTime() > Date.now() : false,
        role: m.role,
        memberCount: group.members.length,
        members: group.members.map((gm) => ({
          id: gm.user.id,
          name: gm.user.username || gm.user.email.split("@")[0],
          avatar: gm.user.avatar,
        })),
        lastMessage: lastMsg?.content || "",
        lastMessageAt: lastMsg?.sentAt || group.lastMessageAt || group.createdAt,
      };
    });
  }

  /** Get group details, verifying membership */
  async getGroupById(groupId: string, userId: string) {
    const group = await this.prisma.groupConversation.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: { select: { id: true, username: true, email: true, avatar: true, isOnline: true } },
          },
        },
      },
    });

    if (!group || group.isDeleted) {
      throw new NotFoundException({
        success: false,
        code: "GROUP_NOT_FOUND",
        message: "Group not found",
      });
    }

    const isMember = group.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException({
        success: false,
        code: "NOT_A_MEMBER",
        message: "You are not a member of this group",
      });
    }

    return group;
  }

  /** Update group properties (requires ADMIN role) */
  async updateGroup(groupId: string, userId: string, dto: UpdateGroupDto) {
    await this.verifyGroupRole(groupId, userId, [GroupRole.ADMIN]);

    const updated = await this.prisma.groupConversation.update({
      where: { id: groupId },
      data: dto,
    });

    return updated;
  }

  /** Delete group (requires ADMIN role) */
  async deleteGroup(groupId: string, userId: string) {
    await this.verifyGroupRole(groupId, userId, [GroupRole.ADMIN]);

    await this.prisma.groupConversation.update({
      where: { id: groupId },
      data: { isDeleted: true },
    });

    return { success: true, message: "Group deleted successfully" };
  }

  /** Leave group */
  async leaveGroup(groupId: string, userId: string) {
    const group = await this.getGroupById(groupId, userId);
    const membership = group.members.find((m) => m.userId === userId);

    if (!membership) {
      throw new BadRequestException("You are not a member of this group");
    }

    await this.prisma.$transaction(async (tx) => {
      // Delete membership
      await tx.groupMember.delete({
        where: { groupId_userId: { groupId, userId } },
      });

      // If user was the last member, soft-delete group
      if (group.members.length === 1) {
        await tx.groupConversation.update({
          where: { id: groupId },
          data: { isDeleted: true },
        });
        return;
      }

      // If user was the only ADMIN, promote another member to ADMIN
      if (membership.role === GroupRole.ADMIN) {
        const otherAdmins = group.members.filter((m) => m.userId !== userId && m.role === GroupRole.ADMIN);
        if (otherAdmins.length === 0) {
          const nextMember = group.members.find((m) => m.userId !== userId);
          if (nextMember) {
            await tx.groupMember.update({
              where: { groupId_userId: { groupId, userId: nextMember.userId } },
              data: { role: GroupRole.ADMIN },
            });
          }
        }
      }
    });

    return { success: true, message: "Left group successfully" };
  }

  /** Add members to a group (requires ADMIN) */
  async addGroupMembers(groupId: string, adminId: string, memberIds: string[]) {
    await this.verifyGroupRole(groupId, adminId, [GroupRole.ADMIN]);

    // Check if new members exist
    const users = await this.prisma.user.findMany({
      where: { id: { in: memberIds } },
    });
    if (users.length !== memberIds.length) {
      throw new NotFoundException("One or more target users do not exist");
    }

    // Check for existing members
    const existing = await this.prisma.groupMember.findMany({
      where: { groupId, userId: { in: memberIds } },
    });
    if (existing.length > 0) {
      throw new ConflictException("One or more users are already members of this group");
    }

    await this.prisma.groupMember.createMany({
      data: memberIds.map((userId) => ({
        groupId,
        userId,
        role: GroupRole.MEMBER,
      })),
    });

    return { success: true, message: "Members added successfully" };
  }

  /** Remove member from a group (requires ADMIN) */
  async removeGroupMember(groupId: string, adminId: string, targetUserId: string) {
    await this.verifyGroupRole(groupId, adminId, [GroupRole.ADMIN]);

    if (adminId === targetUserId) {
      throw new BadRequestException("You cannot remove yourself; use leave endpoint instead.");
    }

    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: targetUserId } },
    });
    if (!membership) {
      throw new NotFoundException("Target user is not a member of this group");
    }

    await this.prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId: targetUserId } },
    });

    return { success: true, message: "Member removed successfully" };
  }

  /** Promote/Demote group member (requires ADMIN) */
  async updateMemberRole(groupId: string, adminId: string, targetUserId: string, role: GroupRole) {
    await this.verifyGroupRole(groupId, adminId, [GroupRole.ADMIN]);

    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: targetUserId } },
    });
    if (!membership) {
      throw new NotFoundException("Target user is not a member of this group");
    }

    await this.prisma.groupMember.update({
      where: { groupId_userId: { groupId, userId: targetUserId } },
      data: { role },
    });

    return { success: true, message: `Member role updated to ${role}` };
  }

  // ─── Messages ──────────────────────────────────────────────────────────────

  /** Send a message (1:1 or Group) */
  async sendMessage(senderId: string, dto: SendMessageDto) {
    const { conversationId, groupId, content, replyToMessageId, attachmentUrl, attachmentType, metadata } = dto;

    if (!conversationId && !groupId) {
      throw new BadRequestException("Message must belong to either a conversation or group");
    }
    if (conversationId && groupId) {
      throw new BadRequestException("Message cannot belong to both conversation and group");
    }

    // Verify membership & access permissions
    if (conversationId) {
      await this.getConversationById(conversationId, senderId);
    } else if (groupId) {
      await this.getGroupById(groupId, senderId);
    }

    // Spam protection check (prevent exact same message sent by same user within 2 seconds)
    const recentMessage = await this.prisma.message.findFirst({
      where: {
        senderId,
        content,
        sentAt: { gte: new Date(Date.now() - 2000) },
      },
    });
    if (recentMessage) {
      throw new BadRequestException({
        success: false,
        code: "SPAM_PREVENTION",
        message: "Duplicate message detected. Please wait a moment.",
      });
    }

    return this.prisma.$transaction(async (tx) => {
      // Create message
      const message = await tx.message.create({
        data: {
          senderId,
          content,
          conversationId: conversationId || null,
          groupId: groupId || null,
          replyToMessageId: replyToMessageId || null,
          attachmentUrl: attachmentUrl || null,
          attachmentType: attachmentType || null,
          metadata: metadata || null,
        },
        include: {
          sender: { select: { id: true, username: true, email: true, avatar: true } },
        },
      });

      // Update conversation/group conversation ordering pointer
      if (conversationId) {
        await tx.conversation.update({
          where: { id: conversationId },
          data: {
            lastMessageAt: message.sentAt,
            lastMessageId: message.id,
            isDeletedA: false,
            isDeletedB: false,
          },
        });
      } else if (groupId) {
        await tx.groupConversation.update({
          where: { id: groupId },
          data: {
            lastMessageAt: message.sentAt,
          },
        });
      }

      return message;
    });
  }

  /** Edit a message */
  async editMessage(messageId: string, senderId: string, content: string) {
    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!msg) {
      throw new NotFoundException("Message not found");
    }
    if (msg.senderId !== senderId) {
      throw new ForbiddenException("You can only edit your own messages");
    }
    if (msg.deletedAt) {
      throw new BadRequestException("Cannot edit a deleted message");
    }

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        content,
        edited: true,
        editedAt: new Date(),
      },
      include: {
        sender: { select: { id: true, username: true, email: true, avatar: true } },
      },
    });

    return updated;
  }

  /** Soft-delete a message */
  async deleteMessage(messageId: string, userId: string) {
    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!msg) {
      throw new NotFoundException("Message not found");
    }

    // Verify authority (sender of message, or admin if it is a group message)
    let isAuthorized = msg.senderId === userId;
    if (!isAuthorized && msg.groupId) {
      const groupAdmin = await this.prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: msg.groupId, userId } },
      });
      isAuthorized = groupAdmin?.role === GroupRole.ADMIN;
    }

    if (!isAuthorized) {
      throw new ForbiddenException("You do not have permission to delete this message");
    }

    const softDeleted = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        deletedAt: new Date(),
      },
    });

    return softDeleted;
  }

  /** Get paginated messages for 1:1 conversation */
  async getConversationMessages(
    conversationId: string,
    userId: string,
    take?: number,
    cursor?: string,
    before?: string,
    after?: string
  ) {
    await this.getConversationById(conversationId, userId);
    return this.paginateMessages({ conversationId }, take, cursor, before, after);
  }

  /** Get paginated messages for a group */
  async getGroupMessages(
    groupId: string,
    userId: string,
    take?: number,
    cursor?: string,
    before?: string,
    after?: string
  ) {
    await this.getGroupById(groupId, userId);
    return this.paginateMessages({ groupId }, take, cursor, before, after);
  }

  /** Soft-delete filtering cursor pagination algorithm */
  private async paginateMessages(
    whereClause: { conversationId?: string; groupId?: string },
    take = 50,
    cursor?: string,
    before?: string,
    after?: string
  ) {
    const queryOptions: any = {
      where: {
        ...whereClause,
      },
      take: take,
      orderBy: { sentAt: "asc" },
      include: {
        sender: { select: { id: true, username: true, email: true, avatar: true } },
        reactions: {
          include: {
            user: { select: { id: true, username: true } },
          },
        },
        reads: true,
        deliveries: true,
      },
    };

    if (cursor) {
      queryOptions.cursor = { id: cursor };
      queryOptions.skip = 1;
    } else if (before) {
      queryOptions.cursor = { id: before };
      queryOptions.skip = 1;
      queryOptions.orderBy = { sentAt: "desc" };
    } else if (after) {
      queryOptions.cursor = { id: after };
      queryOptions.skip = 1;
      queryOptions.orderBy = { sentAt: "asc" };
    }

    let messages = await this.prisma.message.findMany(queryOptions);

    if (before) {
      // Since it was desc, reverse back to ascending
      messages.reverse();
    }

    // Mask deleted message contents
    return messages.map((m) => {
      if (m.deletedAt) {
        return {
          ...m,
          content: "This message was deleted.",
          attachmentUrl: null,
          attachmentType: null,
          metadata: null,
        };
      }
      return m;
    });
  }

  // ─── Reactions & Receipts ──────────────────────────────────────────────────

  /** Add or update reaction */
  async addReaction(messageId: string, userId: string, emoji: string) {
    // Check message existence & access
    const msg = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundException("Message not found");

    if (msg.conversationId) {
      await this.getConversationById(msg.conversationId, userId);
    } else if (msg.groupId) {
      await this.getGroupById(msg.groupId, userId);
    }

    const reaction = await this.prisma.messageReaction.upsert({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
      create: { messageId, userId, emoji },
      update: {},
    });

    return reaction;
  }

  /** Remove emoji reaction */
  async removeReaction(messageId: string, userId: string, emoji: string) {
    const reaction = await this.prisma.messageReaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
    });
    if (!reaction) throw new NotFoundException("Reaction not found");

    await this.prisma.messageReaction.delete({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
    });

    return { success: true };
  }

  /** Mark message as delivered */
  async markAsDelivered(messageId: string, userId: string) {
    const msg = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundException("Message not found");

    return this.prisma.messageDelivery.upsert({
      where: { messageId_userId: { messageId, userId } },
      create: { messageId, userId },
      update: {},
    });
  }

  /** Mark message as read */
  async markAsRead(messageId: string, userId: string) {
    const msg = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundException("Message not found");

    return this.prisma.messageRead.upsert({
      where: { messageId_userId: { messageId, userId } },
      create: { messageId, userId },
      update: { readAt: new Date() },
    });
  }

  // ─── Search ───

  /** Unified case-insensitive search for users, groups, and message contents */
  async search(userId: string, query: string) {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return { users: [], groups: [], messages: [] };

    // Search Users (friends or suggestions)
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: cleanQuery, mode: "insensitive" } },
          { email: { contains: cleanQuery, mode: "insensitive" } },
        ],
        id: { not: userId },
      },
      select: { id: true, username: true, email: true, avatar: true },
      take: 10,
    });

    // Search groups user belongs to
    const groups = await this.prisma.groupConversation.findMany({
      where: {
        name: { contains: cleanQuery, mode: "insensitive" },
        isDeleted: false,
        members: { some: { userId } },
      },
      take: 10,
    });

    // Search messages in conversations/groups user belongs to
    const messages = await this.prisma.message.findMany({
      where: {
        content: { contains: cleanQuery, mode: "insensitive" },
        deletedAt: null,
        OR: [
          { conversation: { OR: [{ userAId: userId }, { userBId: userId }] } },
          { group: { members: { some: { userId } } } },
        ],
      },
      include: {
        sender: { select: { id: true, username: true, avatar: true } },
      },
      take: 20,
    });

    return { users, groups, messages };
  }

  // ─── Helpers ───

  private async verifyGroupRole(groupId: string, userId: string, allowedRoles: GroupRole[]) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!member) {
      throw new ForbiddenException({
        success: false,
        code: "NOT_A_MEMBER",
        message: "You are not a member of this group",
      });
    }

    if (!allowedRoles.includes(member.role)) {
      throw new ForbiddenException({
        success: false,
        code: "INSUFFICIENT_PERMISSIONS",
        message: "You do not have required group permissions",
      });
    }
  }
}
