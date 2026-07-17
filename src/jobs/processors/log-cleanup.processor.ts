import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { AppLogger } from "../../shared/logger/logger.service";

@Injectable()
export class LogCleanupProcessor {
  private readonly logger = new AppLogger();

  constructor(private readonly prisma: PrismaService) {}

  // Runs once a day at midnight to delete logs older than 2 days
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleLogCleanup() {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    try {
      const result = await this.prisma.trafficLog.deleteMany({
        where: {
          timestamp: {
            lt: twoDaysAgo,
          },
        },
      });

      this.logger.info(
        "LogCleanupProcessor",
        `Successfully deleted traffic logs older than ${twoDaysAgo.toISOString()}. Count: ${result.count}`
      );
    } catch (error) {
      this.logger.error(
        "LogCleanupProcessor",
        "Failed to complete daily logs cleanup task:",
        error
      );
    }
  }
}
