import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from '../admin.service';
import { AdminUserFilterDto, AdminTrafficFilterDto, AdminUpdateUserDto } from '../dto/admin.dto';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { SkipThrottle } from '../../../common/decorators/skip-throttle.decorator';
import { MESSAGES } from '../../../common/constants/messages.constant';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Admin User Management')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminUsersController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'List all users with pagination and filtering' })
  async getUsers(@Query() filter: AdminUserFilterDto) {
    const result = await this.adminService.getUsers(filter);
    return { message: MESSAGES.admin.usersFetched, data: result.users, meta: result.meta };
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get detailed profile of a specific user' })
  async getUserById(@Param('id') id: string) {
    const user = await this.adminService.getUserById(id);
    return { message: MESSAGES.admin.userFetched, data: user };
  }

  @Put('users/:id')
  @ApiOperation({ summary: 'Update user role (promote to ADMIN or demote to USER)' })
  async updateUser(@Param('id') id: string, @Body() dto: AdminUpdateUserDto) {
    const user = await this.adminService.updateUser(id, dto);
    return { message: MESSAGES.admin.userRoleUpdated, data: user };
  }

  @Get('traffic')
  @SkipThrottle()
  @ApiOperation({ summary: 'Get paginated traffic logs with optional date/IP filtering' })
  async getTrafficLogs(@Query() filter: AdminTrafficFilterDto) {
    const result = await this.adminService.getTrafficLogs(filter);
    return { message: MESSAGES.admin.trafficFetched, data: result.logs, meta: result.meta };
  }

  @Get('traffic/suspicious')
  @SkipThrottle()
  @ApiOperation({ summary: 'Get only suspicious traffic logs' })
  async getSuspiciousTraffic(@Query() filter: AdminTrafficFilterDto) {
    const result = await this.adminService.getSuspiciousTraffic(filter);
    return { message: MESSAGES.admin.suspiciousFetched, data: result.logs, meta: result.meta };
  }
}
