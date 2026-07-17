import { Module } from "@nestjs/common";
import { LogCleanupProcessor } from "./processors/log-cleanup.processor";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [LogCleanupProcessor],
})
export class JobsModule {}

