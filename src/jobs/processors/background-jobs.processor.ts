import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Injectable } from "@nestjs/common";
import { AppLogger } from "../../shared/logger/logger.service";

@Processor("background-jobs")
@Injectable()
export class BackgroundJobsProcessor extends WorkerHost {
  private readonly logger = new AppLogger();

  /**
   * Main entrypoint for processing jobs from the 'background-jobs' queue.
   * Handles job orchestration based on job names.
   */
  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.info(
      "BackgroundJobsProcessor",
      `Start processing job '${job.name}' [ID: ${job.id}]`
    );

    try {
      switch (job.name) {
        case "test-job":
          return await this.handleTestJob(job.data);
        
        default:
          this.logger.warn(
            "BackgroundJobsProcessor",
            `Unknown job name: '${job.name}'`
          );
          throw new Error(`Job type '${job.name}' is not supported.`);
      }
    } catch (error) {
      this.logger.error(
        "BackgroundJobsProcessor",
        `Error processing job '${job.name}' [ID: ${job.id}]:`,
        error
      );
      throw error;
    }
  }

  /**
   * Handler for verification/test jobs
   */
  private async handleTestJob(data: any): Promise<{ success: boolean; data: any }> {
    this.logger.info(
      "BackgroundJobsProcessor",
      `Executing test job with data: ${JSON.stringify(data)}`
    );
    // Simulate some work
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { success: true, data };
  }
}
