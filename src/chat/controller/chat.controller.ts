import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from "@nestjs/common";
import { ChatService } from "../service/chat.service";
import { AuthGuard } from "../../common/guards/auth.guard";
import {
  CreateConversationDto,
  CreateGroupDto,
  UpdateGroupDto,
  AddMembersDto,
  SendMessageDto,
  EditMessageDto,
} from "../dto";
import { GroupRole } from "@prisma/client";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";

@ApiTags("Chat")
@ApiBearerAuth()
@Controller()
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ─── 1:1 Conversations ──────────────────────────────────────────────────────

  @Post("conversations")
  @ApiOperation({ summary: "Get or create a 1:1 conversation" })
  async createConversation(@Req() req: any, @Body() body: CreateConversationDto) {
    const userId = req.user.userId;
    const conversation = await this.chatService.getOrCreateConversation(userId, body.otherUserId);
    return { success: true, data: { conversation } };
  }

  @Get("conversations")
  @ApiOperation({ summary: "List all conversations (sidebar)" })
  async getConversations(@Req() req: any) {
    const userId = req.user.userId;
    const conversations = await this.chatService.getUserConversations(userId);
    return { success: true, data: { conversations } };
  }

  @Get("conversations/:id")
  @ApiOperation({ summary: "Get conversation details by ID" })
  async getConversation(@Req() req: any, @Param("id") id: string) {
    const userId = req.user.userId;
    const conversation = await this.chatService.getConversationById(id, userId);
    return { success: true, data: { conversation } };
  }

  @Delete("conversations/:id")
  @ApiOperation({ summary: "Soft delete conversation" })
  async deleteConversation(@Req() req: any, @Param("id") id: string) {
    const userId = req.user.userId;
    const result = await this.chatService.deleteConversation(id, userId);
    return { success: true, ...result };
  }

  @Patch("conversations/:id/archive")
  @ApiOperation({ summary: "Archive/Unarchive conversation" })
  async archiveConversation(
    @Req() req: any,
    @Param("id") id: string,
    @Body("isArchived") isArchived: boolean
  ) {
    const userId = req.user.userId;
    const result = await this.chatService.archiveConversation(id, userId, isArchived);
    return { success: true, ...result };
  }

  @Patch("conversations/:id/mute")
  @ApiOperation({ summary: "Mute/Unmute conversation" })
  async muteConversation(
    @Req() req: any,
    @Param("id") id: string,
    @Body("isMuted") isMuted: boolean
  ) {
    const userId = req.user.userId;
    const result = await this.chatService.muteConversation(id, userId, isMuted);
    return { success: true, ...result };
  }

  @Patch("conversations/:id/pin")
  @ApiOperation({ summary: "Pin/Unpin conversation" })
  async pinConversation(
    @Req() req: any,
    @Param("id") id: string,
    @Body("isPinned") isPinned: boolean
  ) {
    const userId = req.user.userId;
    const result = await this.chatService.pinConversation(id, userId, isPinned);
    return { success: true, ...result };
  }

  // ─── Group Conversations ───────────────────────────────────────────────────

  @Post("groups")
  @ApiOperation({ summary: "Create a group conversation" })
  async createGroup(@Req() req: any, @Body() body: CreateGroupDto) {
    const userId = req.user.userId;
    const group = await this.chatService.createGroup(userId, body);
    return { success: true, data: { group } };
  }

  @Get("groups")
  @ApiOperation({ summary: "List all groups user belongs to" })
  async getGroups(@Req() req: any) {
    const userId = req.user.userId;
    const groups = await this.chatService.getUserGroups(userId);
    return { success: true, data: { groups } };
  }

  @Get("groups/:id")
  @ApiOperation({ summary: "Get group details" })
  async getGroup(@Req() req: any, @Param("id") id: string) {
    const userId = req.user.userId;
    const group = await this.chatService.getGroupById(id, userId);
    return { success: true, data: { group } };
  }

  @Patch("groups/:id")
  @ApiOperation({ summary: "Update group name, description, or avatar" })
  async updateGroup(@Req() req: any, @Param("id") id: string, @Body() body: UpdateGroupDto) {
    const userId = req.user.userId;
    const group = await this.chatService.updateGroup(id, userId, body);
    return { success: true, data: { group } };
  }

  @Delete("groups/:id")
  @ApiOperation({ summary: "Soft delete group" })
  async deleteGroup(@Req() req: any, @Param("id") id: string) {
    const userId = req.user.userId;
    const result = await this.chatService.deleteGroup(id, userId);
    return { success: true, ...result };
  }

  @Post("groups/:id/members")
  @ApiOperation({ summary: "Add members to group" })
  async addMembers(@Req() req: any, @Param("id") id: string, @Body() body: AddMembersDto) {
    const userId = req.user.userId;
    const result = await this.chatService.addGroupMembers(id, userId, body.memberIds);
    return { success: true, ...result };
  }

  @Delete("groups/:id/members/:userId")
  @ApiOperation({ summary: "Remove member from group" })
  async removeMember(
    @Req() req: any,
    @Param("id") id: string,
    @Param("userId") targetUserId: string
  ) {
    const userId = req.user.userId;
    const result = await this.chatService.removeGroupMember(id, userId, targetUserId);
    return { success: true, ...result };
  }

  @Post("groups/:id/leave")
  @ApiOperation({ summary: "Leave group" })
  async leaveGroup(@Req() req: any, @Param("id") id: string) {
    const userId = req.user.userId;
    const result = await this.chatService.leaveGroup(id, userId);
    return { success: true, ...result };
  }

  @Patch("groups/:id/members/:userId/role")
  @ApiOperation({ summary: "Promote or demote group member" })
  async updateMemberRole(
    @Req() req: any,
    @Param("id") id: string,
    @Param("userId") targetUserId: string,
    @Body("role") role: GroupRole
  ) {
    const userId = req.user.userId;
    const result = await this.chatService.updateMemberRole(id, userId, targetUserId, role);
    return { success: true, ...result };
  }

  // ─── Messages ──────────────────────────────────────────────────────────────

  @Post("messages")
  @ApiOperation({ summary: "Send a message" })
  async sendMessage(@Req() req: any, @Body() body: SendMessageDto) {
    const userId = req.user.userId;
    const message = await this.chatService.sendMessage(userId, body);
    return { success: true, data: { message } };
  }

  @Patch("messages/:id")
  @ApiOperation({ summary: "Edit a message" })
  async editMessage(@Req() req: any, @Param("id") id: string, @Body() body: EditMessageDto) {
    const userId = req.user.userId;
    const message = await this.chatService.editMessage(id, userId, body.content);
    return { success: true, data: { message } };
  }

  @Delete("messages/:id")
  @ApiOperation({ summary: "Soft delete a message" })
  async deleteMessage(@Req() req: any, @Param("id") id: string) {
    const userId = req.user.userId;
    const result = await this.chatService.deleteMessage(id, userId);
    return { success: true, data: { message: result } };
  }

  @Get(["messages/conversation/:id", "conversations/:id/messages"])
  @ApiOperation({ summary: "Get paginated messages for 1:1 conversation" })
  async getConversationMessages(
    @Req() req: any,
    @Param("id") id: string,
    @Query("take") take?: number,
    @Query("cursor") cursor?: string,
    @Query("before") before?: string,
    @Query("after") after?: string
  ) {
    const userId = req.user.userId;
    const parsedTake = take ? Number(take) : 50;
    const messages = await this.chatService.getConversationMessages(
      id,
      userId,
      parsedTake,
      cursor,
      before,
      after
    );
    return { success: true, data: { messages } };
  }

  @Get(["messages/group/:id", "groups/:id/messages"])
  @ApiOperation({ summary: "Get paginated messages for a group" })
  async getGroupMessages(
    @Req() req: any,
    @Param("id") id: string,
    @Query("take") take?: number,
    @Query("cursor") cursor?: string,
    @Query("before") before?: string,
    @Query("after") after?: string
  ) {
    const userId = req.user.userId;
    const parsedTake = take ? Number(take) : 50;
    const messages = await this.chatService.getGroupMessages(
      id,
      userId,
      parsedTake,
      cursor,
      before,
      after
    );
    return { success: true, data: { messages } };
  }

  // ─── Search ────────────────────────────────────────────────────────────────

  @Get("chat/search")
  @ApiOperation({ summary: "Search for users, groups, and message contents" })
  async search(@Req() req: any, @Query("query") query: string) {
    const userId = req.user.userId;
    const results = await this.chatService.search(userId, query);
    return { success: true, data: results };
  }
}
