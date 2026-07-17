import { Controller, Get, Post, Put, Delete, UseGuards, Req, Body, Query, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { FriendshipStatus } from '@prisma/client';
import { MESSAGES } from '../../common/constants/messages.constant';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ─── Profile ───────────────────────────────────────────────────────────────

  @Get('profile')
  @UseGuards(AuthGuard)
  async getProfile(@Req() req: any) {
    const userId  = (req.user as AuthenticatedUser).userId;
    const profile = await this.usersService.getProfile(userId);
    return { message: MESSAGES.user.profileFetched, data: profile };
  }

  @Get('profile/:idOrUsername')
  @UseGuards(AuthGuard)
  async getPublicProfile(@Param('idOrUsername') idOrUsername: string) {
    const profile = await this.usersService.getPublicProfile(idOrUsername);
    return { message: MESSAGES.user.publicProfileFetched, data: profile };
  }

  @Put('profile')
  @UseGuards(AuthGuard)
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    const userId  = (req.user as AuthenticatedUser).userId;
    const profile = await this.usersService.updateProfile(userId, dto);
    return { message: MESSAGES.user.profileUpdated, data: profile };
  }

  // ─── Friend System ────────────────────────────────────────────────────────

  @Post('friends/request')
  @UseGuards(AuthGuard)
  async sendFriendRequest(@Req() req: any, @Body() dto: SendFriendRequestDto) {
    const userId = (req.user as AuthenticatedUser).userId;
    const result = await this.usersService.sendFriendRequest(userId, dto.identifier);
    return {
      message: result.accepted
        ? MESSAGES.friendship.autoAccepted
        : MESSAGES.friendship.requestSent,
      data: result,
    };
  }

  @Get('friends/requests')
  @UseGuards(AuthGuard)
  async getFriendRequests(
    @Req() req: any,
    @Query('type') type?: 'received' | 'sent' | 'all',
  ) {
    const userId   = (req.user as AuthenticatedUser).userId;
    const requests = await this.usersService.getFriendRequests(userId, type);
    return { message: MESSAGES.friendship.requestsFetched, data: requests };
  }

  @Put('friends/requests/:id')
  @UseGuards(AuthGuard)
  async respondToFriendRequest(
    @Req() req: any,
    @Param('id') id: string,
    @Body('status') status: FriendshipStatus,
  ) {
    const userId = (req.user as AuthenticatedUser).userId;
    const result = await this.usersService.respondToFriendRequest(userId, id, status);
    return { message: MESSAGES.friendship.responded(status), data: result };
  }

  @Get('friends/list')
  @UseGuards(AuthGuard)
  async getFriendsList(@Req() req: any) {
    const userId  = (req.user as AuthenticatedUser).userId;
    const friends = await this.usersService.getFriendsList(userId);
    return { message: MESSAGES.friendship.listFetched, data: friends };
  }

  @Delete('friends/:friendId')
  @UseGuards(AuthGuard)
  async removeFriend(@Req() req: any, @Param('friendId') friendId: string) {
    const userId = (req.user as AuthenticatedUser).userId;
    const result = await this.usersService.removeFriend(userId, friendId);
    return { message: MESSAGES.friendship.removed, data: result };
  }

  @Get('friends/suggestions')
  @UseGuards(AuthGuard)
  async getFriendSuggestions(@Req() req: any) {
    const userId      = (req.user as AuthenticatedUser).userId;
    const suggestions = await this.usersService.getFriendSuggestions(userId);
    return { message: MESSAGES.friendship.suggestionsFetched, data: suggestions };
  }

  // ─── Role-Gated Demo Routes ───────────────────────────────────────────────

  @Get('admin-dashboard')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getAdminDashboard(@Req() req: any) {
    const user = req.user as AuthenticatedUser;
    return {
      message: 'Admin dashboard access granted',
      data: { adminId: user.userId, email: user.email, role: user.role },
    };
  }

  @Get('user-dashboard')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('USER', 'ADMIN')
  async getUserDashboard(@Req() req: any) {
    const user = req.user as AuthenticatedUser;
    return {
      message: 'User dashboard access granted',
      data: { userId: user.userId, email: user.email, role: user.role },
    };
  }
}
