import { Controller, Get, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Admin Reports')
@ApiBearerAuth()
@Controller('admin/reports')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('users')
  @ApiOperation({ summary: 'Generate report on user activity and stats' })
  async getUserActivityReport() {
    const report = await this.reportsService.getUserActivityReport();
    return {
      message: 'User activity report generated successfully',
      data: report,
    };
  }

  @Get('chats')
  @ApiOperation({ summary: 'Generate report on conversations and messaging activity' })
  async getChatActivityReport() {
    const report = await this.reportsService.getChatActivityReport();
    return {
      message: 'Chat activity report generated successfully',
      data: report,
    };
  }

  @Get('traffic')
  @ApiOperation({ summary: 'Generate report on system traffic metrics' })
  async getSystemTrafficReport() {
    const report = await this.reportsService.getSystemTrafficReport();
    return {
      message: 'Traffic analytics report generated successfully',
      data: report,
    };
  }
}
