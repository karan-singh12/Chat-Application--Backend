import { Controller, Get, Post, Put, Delete, UseGuards, Req, Body, Query, Param } from "@nestjs/common";
import { UsersService } from "./users.service";
import { AuthGuard } from "../../common/guards/auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { FriendshipStatus } from "@prisma/client";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("profile")
  @UseGuards(AuthGuard)
  async getProfile(@Req() req: any) {
    const userId = req.user.userId;
    const profile = await this.usersService.getProfile(userId);
    return {
      message: "User profile fetched successfully",
      data: profile,
    };
  }

  @Get("profile/:idOrUsername")
  @UseGuards(AuthGuard)
  async getPublicProfile(@Param("idOrUsername") idOrUsername: string) {
    const profile = await this.usersService.getPublicProfile(idOrUsername);
    return {
      message: "Public profile fetched successfully",
      data: profile,
    };
  }

  @Put("profile")
  @UseGuards(AuthGuard)
  async updateProfile(@Req() req: any, @Body() updateProfileDto: any) {
    const userId = req.user.userId;
    const profile = await this.usersService.updateProfile(userId, {
      username: updateProfileDto.username,
      bio: updateProfileDto.bio,
      phone: updateProfileDto.phone,
      location: updateProfileDto.location,
      avatar: updateProfileDto.avatar,
    });
    return {
      message: "User profile updated successfully",
      data: profile,
    };
  }

  @Post("friends/request")
  @UseGuards(AuthGuard)
  async sendFriendRequest(@Req() req: any, @Body("identifier") identifier: string) {
    const userId = req.user.userId;
    const result = await this.usersService.sendFriendRequest(userId, identifier);
    return {
      message: result.accepted ? "Friend request automatically accepted!" : "Friend request sent successfully",
      data: result,
    };
  }

  @Get("friends/requests")
  @UseGuards(AuthGuard)
  async getFriendRequests(@Req() req: any, @Query("type") type?: 'received' | 'sent' | 'all') {
    const userId = req.user.userId;
    const requests = await this.usersService.getFriendRequests(userId, type);
    return {
      message: "Friend requests fetched successfully",
      data: requests,
    };
  }

  @Put("friends/requests/:id")
  @UseGuards(AuthGuard)
  async respondToFriendRequest(
    @Req() req: any,
    @Param("id") id: string,
    @Body("status") status: FriendshipStatus
  ) {
    const userId = req.user.userId;
    const friendshipId = id;
    const result = await this.usersService.respondToFriendRequest(userId, friendshipId, status);
    return {
      message: `Friend request ${status.toLowerCase()} successfully`,
      data: result,
    };
  }

  @Get("friends/list")
  @UseGuards(AuthGuard)
  async getFriendsList(@Req() req: any) {
    const userId = req.user.userId;
    const friends = await this.usersService.getFriendsList(userId);
    return {
      message: "Friends list fetched successfully",
      data: friends,
    };
  }

  @Delete("friends/:friendId")
  @UseGuards(AuthGuard)
  async removeFriend(@Req() req: any, @Param("friendId") friendId: string) {
    const userId = req.user.userId;
    const targetFriendId = friendId;
    const result = await this.usersService.removeFriend(userId, targetFriendId);
    return {
      message: "Friend removed successfully",
      data: result,
    };
  }

  @Get("friends/suggestions")
  @UseGuards(AuthGuard)
  async getFriendSuggestions(@Req() req: any) {
    const userId = req.user.userId;
    const suggestions = await this.usersService.getFriendSuggestions(userId);
    return {
      message: "Friend suggestions fetched successfully",
      data: suggestions,
    };
  }

  @Get("admin-dashboard")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  async getAdminDashboard(@Req() req: any) {
    return {
      message: "Welcome to the Admin Dashboard!",
      data: {
        adminId: req.user.userId,
        email: req.user.email,
        role: req.user.role,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get("user-dashboard")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("USER", "ADMIN")
  async getUserDashboard(@Req() req: any) {
    return {
      message: "Welcome to the User Dashboard!",
      data: {
        userId: req.user.userId,
        email: req.user.email,
        role: req.user.role,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
