import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { AppLogger } from "../../shared/logger/logger.service";

@Injectable()
export class BackgroundJobsService {
  private readonly logger = new AppLogger();

  constructor(
    @InjectQueue("background-jobs") private readonly backgroundQueue: Queue
  ) { }


  async addJob(name: string, data: any, opts?: any) {
    try {
      const job = await this.backgroundQueue.add(name, data, {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        ...opts,
      });
      this.logger.info(
        "BackgroundJobsService",
        `Job '${name}' successfully added to queue with ID: ${job.id}`
      );
      return job;
    } catch (error) {
      this.logger.error(
        "BackgroundJobsService",
        `Failed to add job '${name}' to queue:`,
        error
      );
      throw error;
    }
  }

  getQueue(): Queue {
    return this.backgroundQueue;
  }
}
