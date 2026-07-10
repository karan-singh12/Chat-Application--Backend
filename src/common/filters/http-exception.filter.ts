import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { randomUUID } from "crypto";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";
    let error = "InternalServerError";

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      
      if (typeof res === "object" && res !== null && "success" in res && "statusCode" in res) {
        response.status(status).send(res);
        return;
      }
      
      if (typeof res === "string") {
        message = res;
      } else if (typeof res === "object" && res !== null) {
        message = (res as any).message || (res as any).error || message;
        error = (res as any).error || exception.name;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }

    // If message is an array (e.g. from class-validator), convert to single string
    const formattedMessage = Array.isArray(message)
      ? message.join(", ")
      : message;

    // Build the errors array matching Express ValidationError if we have array messages (like validation errors)
    let errors: any[] | undefined = undefined;
    if (Array.isArray(message)) {
      errors = message.map((msg) => {
        const field = typeof msg === "string" ? msg.split(" ")[0] : "";
        return {
          field,
          message: msg,
        };
      });
    }

    const requestId = request?.id || request?.headers?.["x-request-id"] || randomUUID();
    const apiVersion = process.env.API_VERSION || "1.0.0";

    // Fastify and Express both support response.status().send()
    response.status(status).send({
      success: false,
      statusCode: status,
      message: formattedMessage,
      error: error,
      errors: errors,
      meta: {
        requestId,
        version: apiVersion,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
