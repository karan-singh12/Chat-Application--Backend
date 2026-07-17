import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard/dashboard.controller';
import { AdminUsersController } from './users/admin-users.controller';
import { ReportsController } from './reports/reports.controller';
import { AdminService } from './admin.service';
import { ReportsService } from './reports/reports.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { AppLogger } from '../../shared/logger/logger.service';

/**
 * Admin Module — manages dashboard statistics, user profiles, system audits,
 * and exportable activity report generators.
 */
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DashboardController, AdminUsersController, ReportsController],
  providers: [AdminService, ReportsService, AppLogger],
  exports: [AdminService, ReportsService],
})
export class AdminModule {}

