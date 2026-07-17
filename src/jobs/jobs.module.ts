import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { LogCleanupProcessor } from "./processors/log-cleanup.processor";
import { BackgroundJobsProcessor } from "./processors/background-jobs.processor";
import { BackgroundJobsService } from "./queues/background-jobs.service";
import { PrismaModule } from "../prisma/prisma.module";

/**
 * Parses the Redis URL or environment variables to construct compatible
 * ConnectionOptions for BullMQ. Handles SSL/TLS for Upstash or Render.
 */
function getRedisConnectionOptions() {
  const redisUrlStr = process.env.REDIS_URL;
  if (redisUrlStr) {
    try {
      const parsed = new URL(redisUrlStr);
      const options: any = {
        host: parsed.hostname,
        port: parseInt(parsed.port || "6379", 10),
        maxRetriesPerRequest: null,
      };

      if (parsed.username) {
        options.username = decodeURIComponent(parsed.username);
      }
      if (parsed.password) {
        options.password = decodeURIComponent(parsed.password);
      }

      // Render/Upstash secure Redis links start with rediss://
      if (parsed.protocol === "rediss:") {
        options.tls = {
          rejectUnauthorized: false,
        };
      }
      return options;
    } catch (error) {
      // If parsing fails, fall back
    }
  }

  // Fallback to separate environment variables
  const host = process.env.REDIS_HOST || "127.0.0.1";
  const port = parseInt(process.env.REDIS_PORT ?? "6379", 10);
  const password = process.env.REDIS_PASSWORD || undefined;
  const useTls = process.env.REDIS_TLS === "true";

  const options: any = {
    host,
    port,
    password,
    maxRetriesPerRequest: null,
  };

  if (useTls) {
    options.tls = {
      rejectUnauthorized: false,
    };
  }

  return options;
}

@Module({
  imports: [
    PrismaModule,
    // Initialize BullModule root connection
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: getRedisConnectionOptions(),
      }),
    }),
    // Register background tasks queue
    BullModule.registerQueue({
      name: "background-jobs",
    }),
  ],
  providers: [
    LogCleanupProcessor,
    BackgroundJobsProcessor,
    BackgroundJobsService,
  ],
  exports: [
    BackgroundJobsService,
  ],
})
export class JobsModule {}
