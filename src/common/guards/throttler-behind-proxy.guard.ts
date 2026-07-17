import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

/**
 * Extends the default ThrottlerGuard to correctly read the real client IP
 * when the app is behind a reverse proxy (NGINX, Cloudflare, etc.).
 * Reads: x-forwarded-for → x-real-ip → socket remoteAddress
 */
@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const forwarded = req.headers?.["x-forwarded-for"];
    if (forwarded) {
      // x-forwarded-for can be a comma-separated list; take the first (real client IP)
      return (forwarded as string).split(",")[0].trim();
    }
    return (
      req.headers?.["x-real-ip"] ||
      req.ip ||
      req.socket?.remoteAddress ||
      "unknown"
    );
  }

  protected async throwThrottlingException(): Promise<void> {
    throw Object.assign(new Error("Too Many Requests"), {
      status: 429,
      message: "Too many requests. Please slow down and try again later.",
      error: "Too Many Requests",
    });
  }
}
