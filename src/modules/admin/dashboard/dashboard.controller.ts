import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminService } from '../admin.service';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { MESSAGES } from '../../../common/constants/messages.constant';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Admin Dashboard')
@ApiBearerAuth()
@Controller('admin/dashboard')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class DashboardController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Dashboard statistics summary (real-time user activity, messages, security alerts)' })
  async getDashboardStats() {
    const stats = await this.adminService.getDashboardStats();
    return { message: MESSAGES.admin.statsFetched, data: stats };
  }
}
