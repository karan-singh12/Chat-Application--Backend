import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  getHealthStatus() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "NexusChat NestJS API",
    };
  }
}
