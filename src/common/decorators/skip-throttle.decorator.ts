import { SetMetadata } from "@nestjs/common";

/**
 * Marks a route or controller to skip global throttling.
 * Use on public health-check endpoints, webhooks, etc.
 *
 * @example
 * @SkipThrottle()
 * @Get('health')
 * healthCheck() { return 'ok'; }
 */
export const SkipThrottle = () => SetMetadata("skipThrottle", true);
